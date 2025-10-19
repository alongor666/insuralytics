'use client'

import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Brush,
  Scatter,
  ReferenceLine,
} from 'recharts'
import { useTrendData } from '@/hooks/use-trend'
import { formatNumber, formatPercent } from '@/utils/format'
import { useAppStore } from '@/store/use-app-store'
import {
  detectAnomalies,
  type AnomalyDetectionOptions,
} from '@/lib/analytics/anomaly-detection'
import {
  fitTrend,
  describeTrend,
  type TrendFittingOptions,
} from '@/lib/analytics/trend-fitting'
import { TrendingUp, AlertTriangle, Settings } from 'lucide-react'

// 使用React.memo优化组件性能
export const TrendChart = React.memo(function TrendChart() {
  const data = useTrendData()
  const filters = useAppStore(state => state.filters)
  const updateFilters = useAppStore(state => state.updateFilters)

  // 图例联动：控制系列显隐
  const [visible, setVisible] = useState({
    signed: true,
    matured: true,
    loss: true,
  })

  // 系列高亮（悬浮图例时突出显示）
  const [activeSeries, setActiveSeries] = useState<
    null | 'signed' | 'matured' | 'loss'
  >(null)

  // 分析功能开关
  const [showAnomalies, setShowAnomalies] = useState(true)
  const [showTrend, setShowTrend] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  // 异常检测配置
  const [anomalyOptions, setAnomalyOptions] = useState<AnomalyDetectionOptions>(
    {
      method: 'zscore',
      threshold: 3,
    }
  )

  // 趋势拟合配置
  const [trendOptions, setTrendOptions] = useState<TrendFittingOptions>({
    method: 'linear',
  })

  // 异常检测分析
  const anomalyAnalysis = useMemo(() => {
    if (!data || data.length === 0 || !showAnomalies) return null

    // 过滤掉null值，确保类型安全
    const lossRatioData = data
      .map(d => d.loss_ratio)
      .filter((value): value is number => value !== null)
    if (lossRatioData.length === 0) return null

    const anomalies = detectAnomalies(lossRatioData, anomalyOptions)

    // 将异常点映射到图表数据
    const anomalyPoints = anomalies.map(anomaly => ({
      ...data[anomaly.index],
      anomalyScore: anomaly.score,
      anomalyType: anomaly.type,
    }))

    return { anomalies, anomalyPoints }
  }, [data, showAnomalies, anomalyOptions])

  // 趋势拟合分析
  const trendAnalysis = useMemo(() => {
    if (!data || data.length === 0 || !showTrend) return null

    // 过滤掉null值，确保类型安全
    const lossRatioData = data
      .map(d => d.loss_ratio)
      .filter((value): value is number => value !== null)
    if (lossRatioData.length === 0) return null

    const trendResult = fitTrend(lossRatioData, trendOptions)

    // 将趋势点映射到图表数据
    const trendData = trendResult.trendPoints.map((point, index) => ({
      label: data[index]?.label,
      year: data[index]?.year,
      week: data[index]?.week,
      trend_loss_ratio: point.value,
    }))

    const description = describeTrend(trendResult)

    return { trendResult, trendData, description }
  }, [data, showTrend, trendOptions])

  const legendHandlers = useMemo(
    () => ({
      onClick: (e: any) => {
        const name: string = e?.value || ''
        const key = name.includes('签单')
          ? 'signed'
          : name.includes('满期')
            ? 'matured'
            : 'loss'
        setVisible(v => ({ ...v, [key]: !v[key as keyof typeof v] }))
      },
      onMouseEnter: (e: any) => {
        const name: string = e?.value || ''
        setActiveSeries(
          name.includes('签单')
            ? 'signed'
            : name.includes('满期')
              ? 'matured'
              : 'loss'
        )
      },
      onMouseLeave: () => setActiveSeries(null),
    }),
    []
  )

  if (!data || data.length === 0) return null

  return (
    <div
      id="trend-chart"
      className="rounded-2xl border border-white/50 bg-white/40 p-6 shadow-lg backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">周度趋势</h3>
          <p className="text-xs text-slate-500">
            签单/满期保费（万元）与赔付率（%）
          </p>
        </div>

        {/* 分析功能控制 */}
        <div className="flex items-center gap-2">
          {/* 趋势分析提示 */}
          {trendAnalysis && (
            <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-700">
                {trendAnalysis.description}
              </span>
            </div>
          )}

          {/* 异常点数量提示 */}
          {anomalyAnalysis && anomalyAnalysis.anomalies.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-700">
                检测到 {anomalyAnalysis.anomalies.length} 个异常点
              </span>
            </div>
          )}

          {/* 设置按钮 */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            title="分析设置"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showAnomalies}
                onChange={e => setShowAnomalies(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-700">显示异常点</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showTrend}
                onChange={e => setShowTrend(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-700">显示趋势线</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 异常检测方法 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                异常检测方法
              </label>
              <select
                value={anomalyOptions.method}
                onChange={e =>
                  setAnomalyOptions({
                    ...anomalyOptions,
                    method: e.target.value as 'zscore' | 'iqr' | 'mad',
                  })
                }
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="zscore">Z-Score（正态分布）</option>
                <option value="iqr">IQR（四分位距）</option>
                <option value="mad">MAD（中位数绝对偏差）</option>
              </select>
            </div>

            {/* 趋势拟合方法 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                趋势拟合方法
              </label>
              <select
                value={trendOptions.method}
                onChange={e =>
                  setTrendOptions({
                    ...trendOptions,
                    method: e.target.value as
                      | 'linear'
                      | 'movingAverage'
                      | 'exponential',
                  })
                }
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="linear">线性回归</option>
                <option value="movingAverage">移动平均</option>
                <option value="exponential">指数平滑</option>
              </select>
            </div>
          </div>
        </div>
      )}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={60}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={v => formatNumber(v, 0)}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={v => formatPercent(v, 0)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(val: any, name: string) => {
                if (name.includes('赔付率'))
                  return [formatPercent(val as number, 2), name]
                return [formatNumber(val as number, 2), name]
              }}
            />
            <Legend
              onClick={legendHandlers.onClick}
              onMouseEnter={legendHandlers.onMouseEnter}
              onMouseLeave={legendHandlers.onMouseLeave}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="signed_premium_10k"
              name="签单保费(万)"
              stroke="#1d4ed8"
              strokeWidth={activeSeries === 'signed' ? 3 : 2}
              strokeOpacity={
                activeSeries && activeSeries !== 'signed' ? 0.35 : 1
              }
              dot={false}
              hide={!visible.signed}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="matured_premium_10k"
              name="满期保费(万)"
              stroke="#0ea5e9"
              strokeWidth={activeSeries === 'matured' ? 3 : 2}
              strokeOpacity={
                activeSeries && activeSeries !== 'matured' ? 0.35 : 1
              }
              dot={false}
              hide={!visible.matured}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="loss_ratio"
              name="赔付率(%)"
              stroke="#ef4444"
              strokeWidth={activeSeries === 'loss' ? 3 : 2}
              strokeOpacity={activeSeries && activeSeries !== 'loss' ? 0.35 : 1}
              dot={false}
              hide={!visible.loss}
            />

            {/* 趋势线 */}
            {trendAnalysis && showTrend && (
              <Line
                yAxisId="right"
                type="monotone"
                data={trendAnalysis.trendData}
                dataKey="trend_loss_ratio"
                name="趋势线"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
              />
            )}

            {/* 异常点 */}
            {anomalyAnalysis && showAnomalies && (
              <Scatter
                yAxisId="right"
                data={anomalyAnalysis.anomalyPoints}
                dataKey="loss_ratio"
                fill="#f97316"
                shape="circle"
                name="异常点"
              >
                {anomalyAnalysis.anomalyPoints.map((entry, index) => (
                  <circle
                    key={`anomaly-${index}`}
                    r={6}
                    fill={entry.anomalyType === 'high' ? '#ef4444' : '#f59e0b'}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Scatter>
            )}
            <Brush
              dataKey="label"
              height={20}
              stroke="#94a3b8"
              travellerWidth={8}
              onChange={(range: any) => {
                const start = Math.max(0, Number(range?.startIndex ?? 0))
                const end = Math.min(
                  data.length - 1,
                  Number(range?.endIndex ?? data.length - 1)
                )
                if (end < start) return
                // 仅当选中单一年份时，把 Brush 区间联动到周序号过滤
                if (filters.years && filters.years.length === 1) {
                  const weeks = data.slice(start, end + 1).map(d => d.week)
                  const minW = weeks.reduce(
                    (min, w) => Math.min(min, w),
                    Infinity
                  )
                  const maxW = weeks.reduce(
                    (max, w) => Math.max(max, w),
                    -Infinity
                  )
                  // 若覆盖全范围，则清空周过滤
                  if (start === 0 && end === data.length - 1) {
                    updateFilters({ trendModeWeeks: [], weeks: [] })
                  } else {
                    const rangeWeeks: number[] = []
                    for (let w = minW; w <= maxW; w++) rangeWeeks.push(w)
                    updateFilters({
                      trendModeWeeks: rangeWeeks,
                      weeks: rangeWeeks,
                    })
                  }
                }
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
