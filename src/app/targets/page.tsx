'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { useDropzone } from 'react-dropzone'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  History,
  Save,
  Upload as UploadIcon,
} from 'lucide-react'
import {
  AnalysisTabs,
  type AnalysisTabValue,
} from '@/components/layout/analysis-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { usePremiumTargets } from '@/hooks/use-premium-targets'
import { useAppStore } from '@/store/use-app-store'
import { normalizeChineseText } from '@/lib/utils'
import { formatNumber, formatPercent } from '@/utils/format'
import type {
  PremiumTargets,
  TargetDimensionKey,
  TargetVersionSnapshot,
} from '@/types/insurance'
import { TARGET_DIMENSIONS } from '@/types/insurance'
import {
  CANONICAL_BUSINESS_TYPES,
  CANONICAL_CUSTOMER_CATEGORIES,
} from '@/constants/dimensions'

type CsvRow = Record<string, string | number | undefined>

type DimensionInputs = Record<TargetDimensionKey, Record<string, string>>

interface DimensionMeta {
  label: string
  description: string
  csvColumn: string
  overallLabel: string
}

const DIMENSION_META: Record<TargetDimensionKey, DimensionMeta> = {
  businessType: {
    label: '业务类型',
    description: '按业务类型拆解年度目标，可覆盖新车、续保、直销等业务条线。',
    csvColumn: 'business_type_category',
    overallLabel: '车险整体',
  },
  thirdLevelOrganization: {
    label: '三级机构',
    description: '按三级机构设置目标，为竞赛和追踪提供依据。',
    csvColumn: 'third_level_organization',
    overallLabel: '年度总目标',
  },
  customerCategory: {
    label: '客户分类',
    description: '按客户分类（个人/企业/渠道等）分配年度任务，便于结构优化。',
    csvColumn: 'customer_category_3',
    overallLabel: '年度总目标',
  },
  insuranceType: {
    label: '保险类型',
    description:
      '按险种类型（交强险、商业险等）拆解收入目标，确保产品结构均衡。',
    csvColumn: 'insurance_type',
    overallLabel: '年度总目标',
  },
}

// 规范值集合：仅对客户分类与业务类型做限制
const CANONICAL_SETS: Record<TargetDimensionKey, Set<string> | null> = {
  businessType: new Set(CANONICAL_BUSINESS_TYPES.map(normalizeChineseText)),
  thirdLevelOrganization: null,
  customerCategory: new Set(
    CANONICAL_CUSTOMER_CATEGORIES.map(normalizeChineseText)
  ),
  insuranceType: null,
}

function formatWanInput(value?: number | null): string {
  if (!value || Number.isNaN(value)) return ''
  return (value / 10000).toString()
}

function parseWanInput(value: string): number {
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return 0
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.round(parsed * 10000)
}

function generateVersionId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `ver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '未记录'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '未记录'
  return date.toLocaleString('zh-CN', { hour12: false })
}

function cloneTargets(source: PremiumTargets): PremiumTargets {
  const clonedDimensions = TARGET_DIMENSIONS.reduce(
    (acc, key) => {
      const dimension = source.dimensions?.[key]
      acc[key] = {
        entries: { ...(dimension?.entries ?? {}) },
        updatedAt: dimension?.updatedAt ?? null,
        versions: (dimension?.versions ?? []).map(version => ({
          ...version,
          entries: { ...version.entries },
        })),
      }
      return acc
    },
    {} as PremiumTargets['dimensions']
  )

  return {
    year: source.year || new Date().getFullYear(),
    overall: source.overall || 0,
    byBusinessType: { ...source.byBusinessType },
    dimensions: clonedDimensions,
    updatedAt: source.updatedAt ?? null,
  }
}

function initializeDimensionInputs(
  dimensions: PremiumTargets['dimensions']
): DimensionInputs {
  return TARGET_DIMENSIONS.reduce((acc, key) => {
    const entries = dimensions[key]?.entries ?? {}
    const inputs: Record<string, string> = {}
    Object.entries(entries).forEach(([entity, value]) => {
      inputs[entity] = formatWanInput(value)
    })
    acc[key] = inputs
    return acc
  }, {} as DimensionInputs)
}

export default function TargetsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { premiumTargets, dimensionOptions } = usePremiumTargets()
  const setPremiumTargets = useAppStore(state => state.setPremiumTargets)

  const buildEditableState = useCallback(
    () => cloneTargets(premiumTargets),
    [premiumTargets]
  )

  const [targets, setTargets] = useState<PremiumTargets>(() =>
    buildEditableState()
  )
  const [overallInput, setOverallInput] = useState(() =>
    formatWanInput(premiumTargets.overall)
  )
  const [dimensionInputs, setDimensionInputs] = useState<DimensionInputs>(() =>
    initializeDimensionInputs(buildEditableState().dimensions)
  )
  const [activeDimension, setActiveDimension] =
    useState<TargetDimensionKey>('businessType')

  useEffect(() => {
    const nextTargets = buildEditableState()
    setTargets(nextTargets)
    setOverallInput(formatWanInput(nextTargets.overall))
    setDimensionInputs(initializeDimensionInputs(nextTargets.dimensions))
  }, [buildEditableState])

  const dimensionEntities = useMemo(() => {
    return TARGET_DIMENSIONS.reduce(
      (acc, key) => {
        const set = new Set<string>(dimensionOptions[key] ?? [])
        Object.keys(targets.dimensions[key]?.entries ?? {}).forEach(entity => {
          if (entity) set.add(entity)
        })
        const allowed = CANONICAL_SETS[key]
        const arr = Array.from(set)
          .filter(
            entity => !allowed || allowed.has(normalizeChineseText(entity))
          )
          .sort((a, b) => a.localeCompare(b, 'zh-CN'))
        acc[key] = arr
        return acc
      },
      {} as Record<TargetDimensionKey, string[]>
    )
  }, [dimensionOptions, targets.dimensions])

  const activeEntities = useMemo(
    () => dimensionEntities[activeDimension] ?? [],
    [activeDimension, dimensionEntities]
  )
  const activeMeta = DIMENSION_META[activeDimension]
  const activeVersions = targets.dimensions[activeDimension]?.versions ?? []
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const rowOrder = useMemo(() => {
    return ['__overall__', ...activeEntities.map(entity => `entity:${entity}`)]
  }, [activeEntities])

  const focusRow = useCallback((rowId: string | null) => {
    if (!rowId) return
    const target = cellRefs.current[rowId]
    if (!target) return

    if (document.activeElement !== target) {
      target.focus()
    }
    requestAnimationFrame(() => {
      target.select()
    })
  }, [])

  const registerCellRef = useCallback(
    (rowId: string) => (element: HTMLInputElement | null) => {
      if (element) {
        cellRefs.current[rowId] = element
      } else {
        delete cellRefs.current[rowId]
      }
    },
    []
  )

  const handleCellKeyDown = useCallback(
    (rowId: string) => (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        const currentIndex = rowOrder.indexOf(rowId)
        if (currentIndex === -1) return
        const nextIndex = Math.min(rowOrder.length - 1, currentIndex + 1)
        focusRow(rowOrder[nextIndex])
        return
      }

      if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight'
      ) {
        event.preventDefault()
        const currentIndex = rowOrder.indexOf(rowId)
        if (currentIndex === -1) return
        const delta =
          event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1
        const nextIndex = Math.min(
          rowOrder.length - 1,
          Math.max(0, currentIndex + delta)
        )
        focusRow(rowOrder[nextIndex])
      }
    },
    [focusRow, rowOrder]
  )

  const selectOnFocus = useCallback(
    (event: ReactFocusEvent<HTMLInputElement>) => {
      event.currentTarget.select()
    },
    []
  )

  const totalDimensionTarget = useMemo(() => {
    return activeEntities.reduce((sum, entity) => {
      return sum + (targets.dimensions[activeDimension]?.entries?.[entity] ?? 0)
    }, 0)
  }, [activeDimension, activeEntities, targets.dimensions])

  const difference = totalDimensionTarget - (targets.overall || 0)
  const differenceWan = difference / 10000

  const isDirty = useMemo(() => {
    if ((premiumTargets.year || new Date().getFullYear()) !== targets.year) {
      return true
    }
    if ((premiumTargets.overall || 0) !== (targets.overall || 0)) {
      return true
    }

    return TARGET_DIMENSIONS.some(dimension => {
      const original = premiumTargets.dimensions?.[dimension]?.entries ?? {}
      const current = targets.dimensions[dimension]?.entries ?? {}
      const keys = new Set([...Object.keys(original), ...Object.keys(current)])
      let changed = false
      keys.forEach(key => {
        if ((original[key] ?? 0) !== (current[key] ?? 0)) {
          changed = true
        }
      })
      return changed
    })
  }, [premiumTargets, targets])

  const handleOverallChange = (value: string) => {
    setOverallInput(value)
    const yuan = parseWanInput(value)
    setTargets(prev => ({
      ...prev,
      overall: yuan,
    }))
  }

  const handleEntryChange = (
    dimension: TargetDimensionKey,
    entity: string,
    value: string
  ) => {
    const normalized = normalizeChineseText(entity)
    setDimensionInputs(prev => ({
      ...prev,
      [dimension]: {
        ...prev[dimension],
        [normalized]: value,
      },
    }))

    const yuan = parseWanInput(value)
    setTargets(prev => {
      const nextDimension = {
        ...prev.dimensions[dimension],
        entries: {
          ...prev.dimensions[dimension]?.entries,
          [normalized]: yuan,
        },
      }
      const nextDimensions = {
        ...prev.dimensions,
        [dimension]: nextDimension,
      }

      return {
        ...prev,
        byBusinessType:
          dimension === 'businessType'
            ? { ...nextDimension.entries }
            : prev.byBusinessType,
        dimensions: nextDimensions,
      }
    })
  }

  const resetToSaved = () => {
    const nextTargets = buildEditableState()
    setTargets(nextTargets)
    setOverallInput(formatWanInput(nextTargets.overall))
    setDimensionInputs(initializeDimensionInputs(nextTargets.dimensions))
  }

  const downloadTemplate = (dimension: TargetDimensionKey) => {
    const meta = DIMENSION_META[dimension]
    const rows: CsvRow[] = [
      {
        [meta.csvColumn]: meta.overallLabel,
        target_wan: Number(formatWanInput(targets.overall || 0)) || 0,
      },
    ]

    const entities = dimensionEntities[dimension] ?? []
    const entryMap = targets.dimensions[dimension]?.entries ?? {}

    entities.forEach(entity => {
      rows.push({
        [meta.csvColumn]: entity,
        target_wan: Number(formatWanInput(entryMap[entity] ?? 0)) || 0,
      })
    })

    const csv = Papa.unparse(rows, {
      columns: [meta.csvColumn, 'target_wan'],
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${meta.label}目标模板_${targets.year}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const applyVersion = (
    dimension: TargetDimensionKey,
    version: TargetVersionSnapshot
  ) => {
    setTargets(prev => {
      const nextDimensions = {
        ...prev.dimensions,
        [dimension]: {
          ...prev.dimensions[dimension],
          entries: { ...version.entries },
        },
      }

      return {
        ...prev,
        overall: dimension === 'businessType' ? version.overall : prev.overall,
        byBusinessType:
          dimension === 'businessType'
            ? { ...version.entries }
            : prev.byBusinessType,
        dimensions: nextDimensions,
      }
    })

    if (dimension === 'businessType') {
      setOverallInput(formatWanInput(version.overall))
    }

    setDimensionInputs(prev => ({
      ...prev,
      [dimension]: Object.entries(version.entries).reduce(
        (acc, [key, value]) => {
          acc[key] = formatWanInput(value)
          return acc
        },
        {} as Record<string, string>
      ),
    }))

    toast({
      title: '版本已应用',
      description: `${DIMENSION_META[dimension].label}目标已恢复到「${version.label}」。`,
    })
  }

  const hasDimensionChanged = (dimension: TargetDimensionKey) => {
    const original = premiumTargets.dimensions?.[dimension]?.entries ?? {}
    const current = targets.dimensions[dimension]?.entries ?? {}
    const keys = new Set([...Object.keys(original), ...Object.keys(current)])
    let changed = false
    keys.forEach(key => {
      if ((original[key] ?? 0) !== (current[key] ?? 0)) {
        changed = true
      }
    })
    return changed
  }

  const handleSave = () => {
    const timestamp = new Date().toISOString()
    const changedFlags = TARGET_DIMENSIONS.reduce(
      (acc, dimension) => {
        acc[dimension] = hasDimensionChanged(dimension)
        return acc
      },
      {} as Record<TargetDimensionKey, boolean>
    )

    const overallChanged =
      (premiumTargets.overall || 0) !== (targets.overall || 0)
    if (overallChanged) {
      changedFlags.businessType = true
    }

    const nextDimensions = TARGET_DIMENSIONS.reduce(
      (acc, dimension) => {
        const current = targets.dimensions[dimension]
        const baseEntries = current.entries ?? {}
        const allowed = CANONICAL_SETS[dimension]
        const entriesCopy = Object.fromEntries(
          Object.entries(baseEntries).filter(
            ([k]) => !allowed || allowed.has(normalizeChineseText(k))
          )
        )

        const versions = changedFlags[dimension]
          ? [
              {
                id: generateVersionId(),
                label: `${DIMENSION_META[dimension].label} ${formatTimestamp(
                  timestamp
                )}`,
                createdAt: timestamp,
                overall: targets.overall,
                entries: entriesCopy,
              },
              ...current.versions,
            ]
          : current.versions

        acc[dimension] = {
          entries: entriesCopy,
          updatedAt: changedFlags[dimension] ? timestamp : current.updatedAt,
          versions,
        }
        return acc
      },
      {} as PremiumTargets['dimensions']
    )

    const nextTargets: PremiumTargets = {
      year: targets.year,
      overall: targets.overall,
      byBusinessType: nextDimensions.businessType.entries,
      dimensions: nextDimensions,
      updatedAt: timestamp,
    }

    setTargets(nextTargets)
    setDimensionInputs(initializeDimensionInputs(nextTargets.dimensions))
    setPremiumTargets(nextTargets)

    toast({
      title: '保存成功',
      description: '目标数据已更新并写入本地存储。',
    })
    router.push('/?tab=thematic')
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return
      const file = acceptedFiles[0]
      const meta = DIMENSION_META[activeDimension]
      const overallKey = normalizeChineseText(meta.overallLabel)

      const reader = new FileReader()
      reader.onload = event => {
        try {
          const text = String(event.target?.result ?? '')
          const parsed = Papa.parse<CsvRow>(text, {
            header: true,
            skipEmptyLines: true,
          })

          const rows = Array.isArray(parsed.data)
            ? parsed.data.filter(row => row && row[meta.csvColumn])
            : []

          if (rows.length === 0) {
            toast({
              title: '导入失败',
              description: 'CSV 文件没有有效数据',
              variant: 'destructive',
            })
            return
          }

          const nextEntries = {
            ...targets.dimensions[activeDimension]?.entries,
          }
          let nextOverall = targets.overall
          const missingLabels: string[] = []

          rows.forEach(row => {
            const rawLabel = row[meta.csvColumn]
            const normalizedLabel = normalizeChineseText(
              typeof rawLabel === 'number'
                ? String(rawLabel)
                : String(rawLabel ?? '')
            )

            if (!normalizedLabel) {
              missingLabels.push(String(rawLabel ?? '未知维度'))
              return
            }

            const parsedValue = parseWanInput(String(row.target_wan ?? ''))

            if (normalizedLabel === overallKey) {
              nextOverall = parsedValue
              return
            }

            const allowed = CANONICAL_SETS[activeDimension]
            if (allowed && !allowed.has(normalizedLabel)) {
              missingLabels.push(normalizedLabel)
              return
            }

            nextEntries[normalizedLabel] = parsedValue
          })

          setTargets(prev => {
            const nextDimension = {
              ...prev.dimensions[activeDimension],
              entries: nextEntries,
            }
            const nextDimensions = {
              ...prev.dimensions,
              [activeDimension]: nextDimension,
            }
            return {
              ...prev,
              overall: nextOverall,
              byBusinessType:
                activeDimension === 'businessType'
                  ? { ...nextEntries }
                  : prev.byBusinessType,
              dimensions: nextDimensions,
            }
          })

          setOverallInput(formatWanInput(nextOverall))
          setDimensionInputs(prev => {
            const updated = { ...prev }
            updated[activeDimension] = Object.entries(nextEntries).reduce(
              (acc, [key, value]) => {
                acc[key] = formatWanInput(value)
                return acc
              },
              {} as Record<string, string>
            )
            return updated
          })

          if (missingLabels.length > 0) {
            toast({
              title: '部分数据被忽略',
              description: `以下维度值无法识别：${missingLabels.join('、')}`,
              variant: 'destructive',
            })
          } else {
            toast({
              title: '导入成功',
              description: `已从 ${file.name} 更新 ${meta.label} 目标。`,
            })
          }
        } catch (error) {
          toast({
            title: '导入失败',
            description:
              error instanceof Error ? error.message : '无法解析 CSV 文件',
            variant: 'destructive',
          })
        }
      }
      reader.readAsText(file, 'utf-8')
    },
    [activeDimension, targets, toast]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
  })

  const navigateByTab = (tab: AnalysisTabValue) => {
    if (tab === 'targets') return
    router.push(tab === 'kpi' ? '/' : `/?tab=${tab}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/')}
                className="mb-2 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </button>
              <h1 className="text-3xl font-bold text-slate-900">
                目标管理中心
              </h1>
              <p className="text-sm text-slate-600">
                配置年度保费目标，驱动“时间进度达成率”等核心指标。
              </p>
            </div>
            <AnalysisTabs active="targets" onChange={navigateByTab} />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <span>年度目标分解</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate(activeDimension)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  下载 {activeMeta.label} CSV 模板
                </Button>
                <Button
                  variant="outline"
                  onClick={resetToSaved}
                  className="flex items-center gap-2"
                  disabled={!isDirty}
                >
                  重置未保存修改
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex items-center gap-2"
                  disabled={!isDirty}
                >
                  <Save className="h-4 w-4" />
                  保存目标并返回
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  目标年度
                </label>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={targets.year}
                  onChange={event =>
                    setTargets(prev => ({
                      ...prev,
                      year:
                        Number(event.target.value) || new Date().getFullYear(),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  年度总目标 (万元)
                </label>
                <Input
                  type="number"
                  step={50}
                  value={overallInput}
                  onChange={event => handleOverallChange(event.target.value)}
                  inputMode="decimal"
                  placeholder="请输入目标"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  {activeMeta.label}合计 (万元)
                </label>
                <Input
                  value={formatWanInput(totalDimensionTarget)}
                  readOnly
                  className="bg-slate-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  差额 = {activeMeta.label}合计 - 总体 (万元)
                </label>
                <div
                  className={`flex h-9 items-center rounded-md border px-3 text-sm ${
                    Math.abs(differenceWan) > 0.01
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <span>{formatNumber(differenceWan, 2)}</span>
                  {Math.abs(differenceWan) > 0.01 && (
                    <AlertCircle className="ml-2 h-4 w-4" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Tabs
                value={activeDimension}
                onValueChange={value =>
                  setActiveDimension(value as TargetDimensionKey)
                }
              >
                <TabsList className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {TARGET_DIMENSIONS.map(dimension => (
                    <TabsTrigger key={dimension} value={dimension}>
                      {DIMENSION_META[dimension].label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <p className="text-sm text-slate-500">{activeMeta.description}</p>
              <p className="text-xs text-slate-400">
                最近更新时间：
                {formatTimestamp(
                  targets.dimensions[activeDimension]?.updatedAt ?? null
                )}
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
              <div
                {...getRootProps()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 p-6 transition ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:border-blue-400 hover:bg-slate-100'
                }`}
              >
                <input {...getInputProps()} />
                <UploadIcon className="h-6 w-6 text-slate-500" />
                <div className="text-center text-sm text-slate-600">
                  <p className="font-medium">拖拽 CSV 文件到此处，或点击浏览</p>
                  <p>
                    需包含列：{DIMENSION_META[activeDimension].csvColumn},{' '}
                    target_wan (单位：万元)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">
                        {activeMeta.label}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">
                        年度目标 (万元)
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">
                        周均目标 (万元)
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">
                        日均目标 (万元)
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">
                        占总体目标
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {activeMeta.overallLabel}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          ref={registerCellRef('__overall__')}
                          type="number"
                          step={50}
                          value={overallInput}
                          onChange={event =>
                            handleOverallChange(event.target.value)
                          }
                          inputMode="decimal"
                          placeholder="请输入目标"
                          onFocus={selectOnFocus}
                          onKeyDown={handleCellKeyDown('__overall__')}
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatNumber((targets.overall || 0) / 52 / 10000, 2)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatNumber((targets.overall || 0) / 365 / 10000, 2)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        100%
                      </td>
                    </tr>
                    {activeEntities.map(entity => {
                      const targetYuan =
                        targets.dimensions[activeDimension]?.entries?.[
                          entity
                        ] ?? 0
                      const weeklyWan = targetYuan / 52 / 10000
                      const dailyWan = targetYuan / 365 / 10000
                      const share =
                        targets.overall > 0
                          ? targetYuan / targets.overall
                          : null

                      return (
                        <tr key={entity}>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {entity}
                          </td>
                          <td className="px-4 py-3">
                            {/*
                             * Excel-style editing: arrow keys & Enter move between rows while keeping direct input support.
                             */}
                            <Input
                              ref={registerCellRef(`entity:${entity}`)}
                              type="number"
                              step={50}
                              value={
                                dimensionInputs[activeDimension]?.[entity] ??
                                formatWanInput(targetYuan)
                              }
                              onChange={event =>
                                handleEntryChange(
                                  activeDimension,
                                  entity,
                                  event.target.value
                                )
                              }
                              inputMode="decimal"
                              placeholder="请输入目标"
                              onFocus={selectOnFocus}
                              onKeyDown={handleCellKeyDown(`entity:${entity}`)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatNumber(weeklyWan, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatNumber(dailyWan, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {share !== null
                              ? formatPercent(share * 100, 2)
                              : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <History className="h-4 w-4" /> 历史版本
                </div>
                {activeVersions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    暂无版本记录，保存后将自动生成快照。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeVersions.map(version => (
                      <div
                        key={version.id}
                        className="rounded-md border border-slate-200 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-800">
                              {version.label}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatTimestamp(version.createdAt)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              applyVersion(activeDimension, version)
                            }
                          >
                            应用
                          </Button>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          合计 {formatNumber(version.overall / 10000, 2)} 万元
                        </p>
                        {version.note && (
                          <p className="mt-1 text-xs text-slate-400">
                            备注：{version.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
