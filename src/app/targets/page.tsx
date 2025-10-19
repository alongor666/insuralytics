'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { useDropzone } from 'react-dropzone'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Save,
  Upload as UploadIcon,
} from 'lucide-react'
import { AnalysisTabs, type AnalysisTabValue } from '@/components/layout/analysis-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { usePremiumTargets } from '@/hooks/use-premium-targets'
import { useAppStore } from '@/store/use-app-store'
import { normalizeChineseText } from '@/lib/utils'
import { formatNumber, formatPercent } from '@/utils/format'

interface CsvRow {
  business_type: string
  target_wan: number | string
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

export default function TargetsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { premiumTargets, businessTypes } = usePremiumTargets()
  const setPremiumTargets = useAppStore(state => state.setPremiumTargets)

  const [targets, setTargets] = useState(() => ({
    year: premiumTargets.year || new Date().getFullYear(),
    overall: premiumTargets.overall || 0,
    byBusinessType: { ...premiumTargets.byBusinessType },
    updatedAt: premiumTargets.updatedAt,
  }))
  const [overallInput, setOverallInput] = useState(() =>
    formatWanInput(premiumTargets.overall)
  )
  const [businessInputs, setBusinessInputs] = useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {}
      const allTypes = new Set<string>([
        ...businessTypes,
        ...Object.keys(premiumTargets.byBusinessType ?? {}),
      ])
      allTypes.forEach(type => {
        const normalized = normalizeChineseText(type)
        map[normalized] = formatWanInput(
          premiumTargets.byBusinessType[normalized] ?? 0
        )
      })
      return map
    }
  )

  useEffect(() => {
    setTargets({
      year: premiumTargets.year || new Date().getFullYear(),
      overall: premiumTargets.overall || 0,
      byBusinessType: { ...premiumTargets.byBusinessType },
      updatedAt: premiumTargets.updatedAt,
    })
    setOverallInput(formatWanInput(premiumTargets.overall))
    setBusinessInputs(prev => {
      const map: Record<string, string> = {}
      const allTypes = new Set<string>([
        ...businessTypes,
        ...Object.keys(premiumTargets.byBusinessType ?? {}),
      ])
      allTypes.forEach(type => {
        const normalized = normalizeChineseText(type)
        map[normalized] = formatWanInput(
          premiumTargets.byBusinessType[normalized] ?? 0
        )
      })
      return map
    })
  }, [premiumTargets, businessTypes])

  const allBusinessTypes = useMemo(() => {
    const set = new Set<string>()
    businessTypes.forEach(type => set.add(normalizeChineseText(type)))
    Object.keys(targets.byBusinessType ?? {}).forEach(type => {
      if (type) set.add(type)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [businessTypes, targets.byBusinessType])

  const totalBusinessTarget = useMemo(() => {
    return allBusinessTypes.reduce((sum, type) => {
      return sum + (targets.byBusinessType[type] ?? 0)
    }, 0)
  }, [allBusinessTypes, targets.byBusinessType])

  const difference = totalBusinessTarget - (targets.overall || 0)
  const differenceWan = difference / 10000

  const handleOverallChange = (value: string) => {
    setOverallInput(value)
    const yuan = parseWanInput(value)
    setTargets(prev => ({
      ...prev,
      overall: yuan,
    }))
  }

  const handleBusinessChange = (type: string, value: string) => {
    const normalized = normalizeChineseText(type)
    setBusinessInputs(prev => ({
      ...prev,
      [normalized]: value,
    }))

    const yuan = parseWanInput(value)
    setTargets(prev => ({
      ...prev,
      byBusinessType: {
        ...prev.byBusinessType,
        [normalized]: yuan,
      },
    }))
  }

  const resetToSaved = () => {
    setTargets({
      year: premiumTargets.year || new Date().getFullYear(),
      overall: premiumTargets.overall || 0,
      byBusinessType: { ...premiumTargets.byBusinessType },
      updatedAt: premiumTargets.updatedAt,
    })
    setOverallInput(formatWanInput(premiumTargets.overall))
    setBusinessInputs(() => {
      const map: Record<string, string> = {}
      const allTypes = new Set<string>([
        ...businessTypes,
        ...Object.keys(premiumTargets.byBusinessType ?? {}),
      ])
      allTypes.forEach(type => {
        const normalized = normalizeChineseText(type)
        map[normalized] = formatWanInput(
          premiumTargets.byBusinessType[normalized] ?? 0
        )
      })
      return map
    })
  }

  const downloadTemplate = () => {
    const rows: CsvRow[] = [
      {
        business_type: '车险整体',
        target_wan: Number(formatWanInput(targets.overall || 0)) || 0,
      },
    ]
    allBusinessTypes.forEach(type => {
      rows.push({
        business_type: type,
        target_wan:
          Number(
            formatWanInput(targets.byBusinessType[type] ?? 0)
          ) || 0,
      })
    })

    const csv = Papa.unparse(rows, {
      columns: ['business_type', 'target_wan'],
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `保费目标模板_${targets.year}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return
      const file = acceptedFiles[0]
      const reader = new FileReader()
      reader.onload = event => {
        try {
          const text = String(event.target?.result ?? '')
          const parsed = Papa.parse<CsvRow>(text, {
            header: true,
            skipEmptyLines: true,
          })

          const rows = Array.isArray(parsed.data)
            ? parsed.data.filter(row => row && row.business_type)
            : []

          if (rows.length === 0) {
            toast({
              title: '导入失败',
              description: 'CSV 文件没有有效数据',
              variant: 'destructive',
            })
            return
          }

          const nextTargets = { ...targets.byBusinessType }
          let nextOverall = targets.overall
          const missingTypes: string[] = []

          rows.forEach(row => {
            const normalizedType = normalizeChineseText(row.business_type)
            const parsedValue = parseWanInput(String(row.target_wan ?? ''))

            if (!normalizedType) {
              missingTypes.push(String(row.business_type))
              return
            }

            if (normalizedType === '车险整体') {
              nextOverall = parsedValue
              return
            }

            nextTargets[normalizedType] = parsedValue
          })

          if (missingTypes.length > 0) {
            toast({
              title: '部分数据被忽略',
              description: `以下业务类型无法识别：${missingTypes.join('、')}`,
              variant: 'destructive',
            })
          } else {
            toast({
              title: '导入成功',
              description: `已从 ${file.name} 更新目标数据`,
            })
          }

          setTargets(prev => ({
            ...prev,
            overall: nextOverall,
            byBusinessType: nextTargets,
          }))
          setOverallInput(formatWanInput(nextOverall))
          setBusinessInputs(prev => {
            const updated = { ...prev }
            Object.entries(nextTargets).forEach(([key, value]) => {
              updated[key] = formatWanInput(value)
            })
            return updated
          })
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
    [targets, toast]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
  })

  const isDirty = useMemo(() => {
    const saved = premiumTargets
    if ((saved.year || new Date().getFullYear()) !== targets.year) return true
    if ((saved.overall || 0) !== (targets.overall || 0)) return true

    const savedEntries = Object.entries(saved.byBusinessType ?? {})
    const targetEntries = Object.entries(targets.byBusinessType ?? {})

    if (savedEntries.length !== targetEntries.length) return true

    for (const [key, value] of targetEntries) {
      if ((saved.byBusinessType[key] ?? 0) !== (value ?? 0)) return true
    }

    return false
  }, [premiumTargets, targets])

  const handleSave = () => {
    setPremiumTargets({
      year: targets.year || new Date().getFullYear(),
      overall: targets.overall || 0,
      byBusinessType: targets.byBusinessType,
      updatedAt: new Date().toISOString(),
    })
    toast({
      title: '保存成功',
      description: '目标数据已更新并写入本地存储。',
    })
    router.push('/?tab=thematic')
  }

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
              <h1 className="text-3xl font-bold text-slate-900">目标管理中心</h1>
              <p className="text-sm text-slate-600">
                配置年度保费目标，驱动“时间进度达成率”等核心指标。
              </p>
            </div>
            <AnalysisTabs active="targets" onChange={navigateByTab} />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>年度目标分解</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  下载 CSV 模板
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
                      year: Number(event.target.value) || new Date().getFullYear(),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  车险整体年度目标 (万元)
                </label>
                <Input
                  value={overallInput}
                  onChange={event => handleOverallChange(event.target.value)}
                  inputMode="decimal"
                  placeholder="请输入目标"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  子业务合计 (万元)
                </label>
                <Input
                  value={formatWanInput(totalBusinessTarget)}
                  readOnly
                  className="bg-slate-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  差额 = 子业务合计 - 整体 (万元)
                </label>
                <div
                  className={`flex h-9 items-center rounded-md border px-3 text-sm ${
                    Math.abs(difference) > 0.09 * 10000
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <span>
                    {Math.round(difference / 100) / 10000}
                  </span>
                  {Math.abs(difference) > 0.09 * 10000 && (
                    <AlertCircle className="ml-2 h-4 w-4" />
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
              <div
                {...getRootProps()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 p-6 transition ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-400 hover:bg-slate-100'
                }`}
              >
                <input {...getInputProps()} />
                <UploadIcon className="h-6 w-6 text-slate-500" />
                <div className="text-center text-sm text-slate-600">
                  <p className="font-medium">
                    拖拽 CSV 文件到此处，或点击浏览
                  </p>
                  <p>支持列：business_type, target_wan (单位：万元)</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      业务类型
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
                      占总体保费
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      车险整体
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={overallInput}
                        onChange={event => handleOverallChange(event.target.value)}
                        inputMode="decimal"
                        placeholder="请输入目标"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatNumber(
                        Math.round((targets.overall || 0) / 52 / 100) / 100,
                        2
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatNumber(
                        Math.round((targets.overall || 0) / 365 / 100) / 100,
                        2
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      100%
                    </td>
                  </tr>
                  {allBusinessTypes.map(type => {
                    const targetYuan = targets.byBusinessType[type] ?? 0
                    const weeklyWan = targetYuan / 52 / 10000
                    const dailyWan = targetYuan / 365 / 10000
                    const share =
                      targets.overall > 0
                        ? targetYuan / targets.overall
                        : null

                    return (
                      <tr key={type}>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {type}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={businessInputs[type] ?? formatWanInput(targetYuan)}
                            onChange={event =>
                              handleBusinessChange(type, event.target.value)
                            }
                            inputMode="decimal"
                            placeholder="请输入目标"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(weeklyWan, 2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(dailyWan, 2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {share !== null ? formatPercent(share * 100, 2) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
