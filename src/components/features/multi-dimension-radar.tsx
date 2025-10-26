/**
 * 多维健康度雷达图组件
 * 综合展示5个核心维度的健康评分，支持当前周与上周对比
 */

'use client'

import React, { useMemo, useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Info } from 'lucide-react'
import {
  RADAR_DIMENSIONS,
  convertKPIToRadarScores,
  type RadarScoreResult,
} from '@/utils/radar-score'
import { formatPercent, formatNumber } from '@/utils/format'
import { cn } from '@/lib/utils'
import type { KPIResult } from '@/types/insurance'

interface MultiDimensionRadarProps {
  /** 当前周期的 KPI 数据 */
  currentKpi: KPIResult | null
  /** 对比周期的 KPI 数据（上周） */
  compareKpi?: KPIResult | null
  /** 对比周次号 */
  compareWeekNumber?: number | null
  /** 自定义类名 */
  className?: string
}

/**
 * 多维健康度雷达图
 */
export function MultiDimensionRadar({
  currentKpi,
  compareKpi,
  compareWeekNumber,
  className,
}: MultiDimensionRadarProps) {
  // 悬停状态：跟踪当前高亮的维度
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null)

  // 转换为雷达图数据
  const radarData = useMemo(() => {
    const currentScores = convertKPIToRadarScores(currentKpi)
    const compareScores = compareKpi
      ? convertKPIToRadarScores(compareKpi)
      : new Map()

    return RADAR_DIMENSIONS.map((dim) => {
      const currentResult = currentScores.get(dim.key)
      const compareResult = compareScores.get(dim.key)

      return {
        dimension: dim.shortLabel,
        fullLabel: dim.label,
        dimensionKey: dim.key,
        current: currentResult?.score ?? 0,
        compare: compareResult?.score ?? 0,
        currentRaw: currentResult?.rawValue ?? null,
        compareRaw: compareResult?.rawValue ?? null,
        currentLevel: currentResult?.level ?? 'medium',
        currentLabel: currentResult?.label ?? '-',
        currentColor: currentResult?.color ?? '#94a3b8',
        unit: dim.unit,
        description: dim.description,
      }
    })
  }, [currentKpi, compareKpi])

  // 计算综合健康评分（5个维度的平均分）
  const overallScore = useMemo(() => {
    const validScores = radarData
      .map((d) => d.current)
      .filter((s) => s > 0)
    if (validScores.length === 0) return null
    return Math.round(
      validScores.reduce((sum, s) => sum + s, 0) / validScores.length
    )
  }, [radarData])

  // 综合健康等级
  const overallLevel = useMemo(() => {
    if (!overallScore) return { label: '-', color: '#94a3b8' }
    if (overallScore >= 95) return { label: '卓越', color: '#2E7D32' }
    if (overallScore >= 86) return { label: '良好', color: '#4CAF50' }
    if (overallScore >= 70) return { label: '中等', color: '#1976D2' }
    if (overallScore >= 20) return { label: '预警', color: '#F57C00' }
    return { label: '高危', color: '#D32F2F' }
  }, [overallScore])

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="mb-2 text-sm font-semibold text-slate-800">
          {data.fullLabel}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600">当前值：</span>
            <span className="font-medium text-slate-800">
              {data.currentRaw !== null
                ? `${formatPercent(data.currentRaw, 2)}`
                : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600">当前评分：</span>
            <span
              className="font-semibold"
              style={{ color: data.currentColor }}
            >
              {data.current > 0 ? formatNumber(data.current, 1) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600">等级：</span>
            <span
              className="font-medium"
              style={{ color: data.currentColor }}
            >
              {data.currentLabel}
            </span>
          </div>
          {compareKpi && data.compareRaw !== null && (
            <>
              <div className="my-1 border-t border-slate-200"></div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">
                  上周值（W{compareWeekNumber}）：
                </span>
                <span className="font-medium text-slate-600">
                  {formatPercent(data.compareRaw, 2)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">上周评分：</span>
                <span className="font-medium text-slate-600">
                  {data.compare > 0 ? formatNumber(data.compare, 1) : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">评分变化：</span>
                <span
                  className={cn(
                    'font-semibold',
                    data.current - data.compare > 0
                      ? 'text-green-600'
                      : data.current - data.compare < 0
                        ? 'text-red-600'
                        : 'text-slate-600'
                  )}
                >
                  {data.current - data.compare > 0 ? '+' : ''}
                  {formatNumber(data.current - data.compare, 1)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!currentKpi) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/60 p-8 text-center backdrop-blur-sm">
        <p className="text-sm text-slate-500">暂无数据</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/50 bg-white/40 shadow-lg backdrop-blur-xl',
        className
      )}
    >
      {/* 标题栏 */}
      <div className="border-b border-slate-200/50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              多维健康度雷达图
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              综合评估5个核心维度的业务健康状况
            </p>
          </div>
          {overallScore !== null && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center">
              <p className="text-xs text-slate-600">综合评分</p>
              <p
                className="text-2xl font-bold"
                style={{ color: overallLevel.color }}
              >
                {overallScore}
              </p>
              <p
                className="text-xs font-medium"
                style={{ color: overallLevel.color }}
              >
                {overallLevel.label}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 雷达图 */}
      <div className="p-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#cbd5e1" strokeWidth={1} />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{
                  fill: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                }}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickCount={6}
              />
              <Radar
                name="当前周"
                dataKey="current"
                stroke="#1976D2"
                fill="#1976D2"
                fillOpacity={0.25}
                strokeWidth={2.5}
                dot={{
                  r: 5,
                  fill: '#1976D2',
                  strokeWidth: 0,
                }}
                activeDot={{
                  r: 7,
                  fill: '#1976D2',
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
                onMouseEnter={(data: any) =>
                  setHoveredDimension(data.dimensionKey)
                }
                onMouseLeave={() => setHoveredDimension(null)}
              />
              {compareKpi && (
                <Radar
                  name={`上周 (W${compareWeekNumber || '-'})`}
                  dataKey="compare"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{
                    r: 4,
                    fill: '#94a3b8',
                    strokeWidth: 0,
                  }}
                  onMouseEnter={(data: any) =>
                    setHoveredDimension(data.dimensionKey)
                  }
                  onMouseLeave={() => setHoveredDimension(null)}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                }}
                iconType="circle"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 维度详细卡片 */}
      <div className="border-t border-slate-200/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-500" />
          <p className="text-xs font-medium text-slate-600">维度详情</p>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {radarData.map((dim) => {
            const isHovered = hoveredDimension === dim.dimensionKey
            const scoreChange = dim.compare > 0 ? dim.current - dim.compare : null

            return (
              <div
                key={dim.dimensionKey}
                className={cn(
                  'rounded-lg border bg-white p-3 transition-all duration-200',
                  isHovered
                    ? 'border-blue-400 shadow-md ring-2 ring-blue-200'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                )}
                onMouseEnter={() => setHoveredDimension(dim.dimensionKey)}
                onMouseLeave={() => setHoveredDimension(null)}
              >
                <p className="mb-2 text-xs font-medium text-slate-700">
                  {dim.fullLabel}
                </p>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-slate-800">
                    {dim.currentRaw !== null
                      ? formatPercent(dim.currentRaw, 1)
                      : '-'}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: dim.currentColor }}
                  >
                    {dim.currentLabel}
                  </span>
                </div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">评分</span>
                  <span
                    className="font-semibold"
                    style={{ color: dim.currentColor }}
                  >
                    {dim.current > 0 ? formatNumber(dim.current, 1) : '-'}
                  </span>
                </div>
                {scoreChange !== null && (
                  <div
                    className={cn(
                      'mt-2 rounded px-2 py-1 text-center text-xs font-medium',
                      scoreChange > 0
                        ? 'bg-green-50 text-green-700'
                        : scoreChange < 0
                          ? 'bg-red-50 text-red-700'
                          : 'bg-slate-50 text-slate-600'
                    )}
                  >
                    {scoreChange > 0 ? '↑' : scoreChange < 0 ? '↓' : ''}
                    {scoreChange > 0 ? '+' : ''}
                    {formatNumber(scoreChange, 1)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 说明文本 */}
      <div className="border-t border-slate-200/50 bg-slate-50/50 px-6 py-3">
        <p className="text-xs text-slate-500">
          💡 提示：评分基于业务规则自动计算，范围为 0-100
          分。卓越（95-100）、良好（86-94）、中等（70-85）、预警（20-69）、高危（0-19）
        </p>
      </div>
    </div>
  )
}
