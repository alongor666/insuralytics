/**
 * 完整版KPI看板 - 4x4网格布局
 * 指标名称和顺序与紧凑版保持一致
 * 集成：微型趋势图（9周）、公式详情Tooltip、智能环比
 */
'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatPercent,
  formatCurrency,
  getContributionMarginColor,
} from '@/utils/format'
import type { KPIResult } from '@/types/insurance'
import { useKPITrend } from '@/hooks/use-kpi-trend'
import { Sparkline } from '@/components/ui/sparkline'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getKPIFormula } from '@/lib/calculations/kpi-formulas'

export interface FullKPIDashboardProps {
  /**
   * KPI 计算结果
   */
  kpiData: KPIResult | null

  /**
   * 对比数据（用于显示环比变化）
   */
  compareData?: KPIResult | null

  /**
   * 是否正在加载
   */
  isLoading?: boolean

  /**
   * 对比周期号（用于显示"vs 第N周"）
   */
  compareWeekNumber?: number | null
}

// KPI配置定义
interface KPIConfig {
  key: keyof KPIResult
  title: string
  unit: string
  formatter: (val: number | null | undefined) => string
  getColor: (val: number | null) => string
  decimals?: number // 用于计算增量的小数位数
  hasFormula?: boolean // 是否显示公式详情
  showTrend?: boolean // 是否显示趋势图
}

export function FullKPIDashboard({
  kpiData,
  compareData,
  isLoading = false,
  compareWeekNumber,
}: FullKPIDashboardProps) {
  // 第一行：比率指标
  const row1KPIs: KPIConfig[] = [
    {
      key: 'contribution_margin_ratio',
      title: '满期边际贡献率',
      unit: '',
      formatter: formatPercent,
      getColor: val => getContributionMarginColor(val),
      decimals: 2,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'premium_time_progress_achievement_rate',
      title: '保费时间进度达成率',
      unit: '',
      formatter: formatPercent,
      getColor: val =>
        val !== null && val >= 100
          ? 'text-green-600'
          : val !== null && val >= 80
            ? 'text-blue-600'
            : 'text-orange-600',
      decimals: 2,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'loss_ratio',
      title: '满期赔付率',
      unit: '',
      formatter: formatPercent,
      getColor: val =>
        val !== null && val > 70
          ? 'text-red-600'
          : val !== null && val > 60
            ? 'text-orange-600'
            : 'text-green-600',
      decimals: 2,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'expense_ratio',
      title: '费用率',
      unit: '',
      formatter: formatPercent,
      getColor: val =>
        val !== null && val > 25
          ? 'text-red-600'
          : val !== null && val > 20
            ? 'text-orange-600'
            : 'text-green-600',
      decimals: 2,
      hasFormula: true,
      showTrend: true,
    },
  ]

  // 第二行：金额指标
  const row2KPIs: KPIConfig[] = [
    {
      key: 'contribution_margin_amount',
      title: '满期边际贡献额',
      unit: '',
      formatter: val =>
        val !== null && val !== undefined && !isNaN(val)
          ? formatCurrency(val)
          : '-',
      getColor: val =>
        val !== null && val >= 0 ? 'text-green-600' : 'text-red-600',
      decimals: 0,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'signed_premium',
      title: '签单保费',
      unit: '',
      formatter: val =>
        val !== null && val !== undefined && !isNaN(val)
          ? formatCurrency(val)
          : '-',
      getColor: () => 'text-slate-700',
      decimals: 0,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'reported_claim_payment',
      title: '已报告赔款',
      unit: '',
      formatter: val =>
        val !== null && val !== undefined && !isNaN(val)
          ? formatCurrency(val)
          : '-',
      getColor: () => 'text-slate-700',
      decimals: 0,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'expense_amount',
      title: '费用额',
      unit: '',
      formatter: val =>
        val !== null && val !== undefined && !isNaN(val)
          ? formatCurrency(val)
          : '-',
      getColor: () => 'text-slate-700',
      decimals: 0,
      hasFormula: true,
      showTrend: true,
    },
  ]

  // 第三行：比率/数量指标
  const row3KPIs: KPIConfig[] = [
    {
      key: 'variable_cost_ratio',
      title: '变动成本率',
      unit: '',
      formatter: formatPercent,
      getColor: val =>
        val !== null && val > 90
          ? 'text-red-600'
          : val !== null && val > 85
            ? 'text-orange-600'
            : 'text-green-600',
      decimals: 2,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'maturity_ratio',
      title: '满期率',
      unit: '',
      formatter: formatPercent,
      getColor: val =>
        val !== null && val >= 80
          ? 'text-green-600'
          : val !== null && val >= 60
            ? 'text-blue-600'
            : 'text-orange-600',
      decimals: 2,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'matured_claim_ratio',
      title: '满期出险率',
      unit: '',
      formatter: formatPercent,
      getColor: val =>
        val !== null && val > 60
          ? 'text-red-600'
          : val !== null && val > 50
            ? 'text-orange-600'
            : 'text-green-600',
      decimals: 2,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'policy_count',
      title: '保单件数',
      unit: '件',
      formatter: val =>
        val !== null && val !== undefined && !isNaN(val)
          ? val.toLocaleString('zh-CN')
          : '-',
      getColor: () => 'text-slate-700',
      decimals: 0,
      hasFormula: true,
      showTrend: true,
    },
  ]

  // 第四行：单均指标
  const row4KPIs: KPIConfig[] = [
    {
      key: 'claim_case_count',
      title: '赔案件数',
      unit: '件',
      formatter: val =>
        val !== null && val !== undefined && !isNaN(val)
          ? val.toLocaleString('zh-CN')
          : '-',
      getColor: () => 'text-slate-700',
      decimals: 0,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'average_premium',
      title: '单均保费',
      unit: '元',
      formatter: val =>
        val !== null && val !== undefined && !isNaN(val)
          ? Math.round(val).toLocaleString('zh-CN')
          : '-',
      getColor: () => 'text-slate-700',
      decimals: 0,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'average_claim',
      title: '案均赔款',
      unit: '元',
      formatter: val =>
        val !== null && val !== undefined && !isNaN(val)
          ? Math.round(val).toLocaleString('zh-CN')
          : '-',
      getColor: () => 'text-slate-700',
      decimals: 0,
      hasFormula: true,
      showTrend: true,
    },
    {
      key: 'average_expense',
      title: '单均费用',
      unit: '元',
      formatter: val =>
        val !== null && val !== undefined && !isNaN(val)
          ? Math.round(val).toLocaleString('zh-CN')
          : '-',
      getColor: () => 'text-slate-700',
      decimals: 0,
      hasFormula: true,
      showTrend: true,
    },
  ]

  // 计算环比增量和变化幅度
  const getChangeInfo = (
    current: number | null,
    previous: number | null,
    decimals: number = 2
  ): {
    delta: string
    percent: string
    direction: 'up' | 'down' | 'flat'
    color: string
  } => {
    if (
      current === null ||
      previous === null ||
      current === undefined ||
      previous === undefined ||
      isNaN(current) ||
      isNaN(previous)
    ) {
      return {
        delta: '-',
        percent: '-',
        direction: 'flat',
        color: 'text-slate-400',
      }
    }

    const delta = current - previous
    const percent = previous !== 0 ? (delta / previous) * 100 : 0

    const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
    const color =
      direction === 'up'
        ? 'text-green-600'
        : direction === 'down'
          ? 'text-red-600'
          : 'text-slate-500'

    const deltaStr =
      delta >= 0 ? `+${delta.toFixed(decimals)}` : delta.toFixed(decimals)
    const percentStr =
      percent >= 0 ? `+${percent.toFixed(1)}%` : `${percent.toFixed(1)}%`

    return { delta: deltaStr, percent: percentStr, direction, color }
  }

  // 渲染单个KPI卡片
  const renderKPICard = (config: KPIConfig) => {
    const value = kpiData?.[config.key] as number | null
    const formattedValue = config.formatter(value)
    const compareValue = compareData
      ? (compareData[config.key] as number | null)
      : null
    const changeInfo = getChangeInfo(value, compareValue, config.decimals)
    const formulaDefinition = config.hasFormula
      ? getKPIFormula(config.key as string)
      : undefined

    return (
      <div
        key={config.key as string}
        className={cn(
          'group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all duration-300',
          'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50'
        )}
      >
        {/* 装饰性渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative space-y-3">
          {/* 标题行 */}
          <div className="flex items-start justify-between">
            <h4 className="text-xs font-medium text-slate-600">
              {config.title}
            </h4>
            {formulaDefinition && (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button className="ml-2 text-slate-400 transition-colors hover:text-blue-600">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs border border-slate-200 bg-white p-3 shadow-lg"
                  >
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          公式
                        </p>
                        <p className="mt-1 font-mono text-xs text-blue-600">
                          {formulaDefinition.formula}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          数值
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-600">
                          {formattedValue}
                          {config.unit && ` ${config.unit}`}
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* 当前值 - 更大更突出 */}
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'text-3xl font-bold tabular-nums',
                config.getColor(value)
              )}
            >
              {formattedValue}
            </span>
            {config.unit && (
              <span className="text-sm text-slate-500">{config.unit}</span>
            )}
          </div>

          {/* 环比信息 */}
          {compareData && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                {changeInfo.direction === 'up' && (
                  <TrendingUp className="h-4 w-4" />
                )}
                {changeInfo.direction === 'down' && (
                  <TrendingDown className="h-4 w-4" />
                )}
                {changeInfo.direction === 'flat' && (
                  <Minus className="h-4 w-4" />
                )}
                <span className={cn('font-semibold', changeInfo.color)}>
                  {changeInfo.delta}
                </span>
              </div>
              <span className={cn('font-semibold', changeInfo.color)}>
                {changeInfo.percent}
              </span>
              {compareWeekNumber && (
                <span className="text-xs text-slate-400">
                  vs W{compareWeekNumber}
                </span>
              )}
            </div>
          )}

          {/* 微型趋势图 - 使用wrapper组件获取数据 */}
          {config.showTrend && (
            <div className="pt-2">
              <TrendWrapper configKey={config.key} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // 趋势图包装组件（在组件内部调用Hook）
  function TrendWrapper({ configKey }: { configKey: keyof KPIResult }) {
    const trendData = useKPITrend(configKey, { weeks: 9 })

    if (!trendData || trendData.length === 0) {
      return null
    }

    return (
      <div className="h-12">
        <Sparkline
          data={trendData}
          width={200}
          height={48}
          color="#3b82f6"
          fillColor="rgba(59, 130, 246, 0.1)"
          strokeWidth={2}
          connectNulls={false} // 不连接null值，显示断点
        />
      </div>
    )
  }

  // 如果正在加载，显示骨架屏
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-3 h-3 w-28 rounded bg-slate-200" />
                <div className="mb-2 h-8 w-24 rounded bg-slate-200" />
                <div className="mb-2 h-4 w-20 rounded bg-slate-200" />
                <div className="h-12 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // 如果没有数据，显示空状态
  if (!kpiData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
        <div className="text-center">
          <p className="text-sm text-slate-600">暂无数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 第一行：比率指标 */}
      <div className="grid grid-cols-4 gap-4">
        {row1KPIs.map(config => renderKPICard(config))}
      </div>

      {/* 第二行：金额指标 */}
      <div className="grid grid-cols-4 gap-4">
        {row2KPIs.map(config => renderKPICard(config))}
      </div>

      {/* 第三行：比率/数量指标 */}
      <div className="grid grid-cols-4 gap-4">
        {row3KPIs.map(config => renderKPICard(config))}
      </div>

      {/* 第四行：单均指标 */}
      <div className="grid grid-cols-4 gap-4">
        {row4KPIs.map(config => renderKPICard(config))}
      </div>
    </div>
  )
}
