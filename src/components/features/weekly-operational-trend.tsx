'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
import * as echarts from 'echarts'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { useTrendData } from '@/hooks/use-trend'
import { formatNumber, formatPercent } from '@/utils/format'
import { useAppStore } from '@/store/use-app-store'

/**
 * 周度经营趋势分析组件
 *
 * 核心指标：
 * - 签单保费（主趋势线，蓝色）
 * - 赔付率（橙色风险点，阈值线70%）
 *
 * 【重要】数据说明：
 * - CSV原始数据：每周的数据是**年度累计值**（从1月1日到该周结束的累计）
 * - 签单保费展示：根据 filters.dataViewType 决定
 *   - 'current'（当周值模式）：显示累计签单保费曲线
 *   - 'increment'（周增量模式）：显示每周新增签单保费
 * - 赔付率计算：始终基于累计数据（累计赔款 / 累计保费）
 *   - 每周的赔付率 = 该周累计赔款 / 该周累计保费
 *   - 反映从年初到该周的整体赔付水平
 *
 * 功能特性：
 * 1. 双Y轴设计：左轴签单保费，右轴赔付率
 * 2. 赔付率≥70%自动高亮为橙色风险点
 * 3. 背景淡红色标识高风险区域
 * 4. 紫色虚线趋势线
 * 5. 智能Tooltip显示详细信息
 * 6. 点击事件支持下钻分析
 * 7. 自动生成经营摘要
 */

// 赔付率风险阈值
const LOSS_RISK_THRESHOLD = 70

/**
 * 图表数据点类型
 */
interface ChartDataPoint {
  week: string // 周次标签
  weekNumber: number // 周次数字
  year: number // 年份
  signedPremium: number // 签单保费（万元）
  lossRatio: number | null // 赔付率（%）
  isRisk: boolean // 是否为风险点
}

/**
 * 异常原因（模拟数据）
 */
interface AnomalyReason {
  reason: string
  impact: string
}

/**
 * 计算线性趋势线数据
 */
function calculateTrendLine(data: ChartDataPoint[]): number[] {
  const lossRatios = data
    .map((d) => d.lossRatio)
    .filter((v): v is number => v !== null)

  if (lossRatios.length < 2) return []

  // 最小二乘法计算线性回归
  const n = lossRatios.length
  const sumX = lossRatios.reduce((sum, _, i) => sum + i, 0)
  const sumY = lossRatios.reduce((sum, v) => sum + v, 0)
  const sumXY = lossRatios.reduce((sum, v, i) => sum + v * i, 0)
  const sumX2 = lossRatios.reduce((sum, _, i) => sum + i * i, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return data.map((_, i) => slope * i + intercept)
}

/**
 * 生成模拟异常原因
 */
function generateAnomalyReasons(
  lossRatio: number,
  weekNumber: number
): AnomalyReason[] {
  const reasons: AnomalyReason[] = []

  if (lossRatio >= 75) {
    reasons.push({
      reason: '高风险车型占比增加',
      impact: '赔付率上升 +3.2pp',
    })
    reasons.push({
      reason: '大额赔案集中出险',
      impact: '单均赔款上升 +15.6%',
    })
    reasons.push({
      reason: '续保客户风险等级提升',
      impact: '风险暴露增加 +2.1pp',
    })
  } else if (lossRatio >= 70) {
    reasons.push({
      reason: '季节性事故率上升',
      impact: '赔付率上升 +1.8pp',
    })
    reasons.push({
      reason: '新能源车理赔成本增加',
      impact: '单均赔款上升 +8.3%',
    })
    reasons.push({
      reason: '渠道风险管控放松',
      impact: '风险暴露增加 +1.2pp',
    })
  }

  return reasons.slice(0, 3)
}

/**
 * 生成经营摘要
 */
function generateOperationalSummary(data: ChartDataPoint[]): string {
  if (data.length === 0) return ''

  const latestPoint = data[data.length - 1]
  // 修正：当前周值下，年度累计签单保费就是第42周的当前周值，而不是多周的合计值
  const latestPremium = latestPoint.signedPremium

  // 计算连续高风险周数
  let consecutiveRiskWeeks = 0
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].isRisk) {
      consecutiveRiskWeeks++
    } else {
      break
    }
  }

  const totalRiskWeeks = data.filter((d) => d.isRisk).length

  let summary = `截至${latestPoint.year}年第${latestPoint.weekNumber}周，`
  summary += `年度累计签单保费 ${formatNumber(latestPremium / 10000, 2)} 亿元`

  // 修正：赔付率不用均值，直接说多少周处于预警区
  if (consecutiveRiskWeeks > 0) {
    summary += `，连续 ${consecutiveRiskWeeks} 周处于预警区`
  } else if (totalRiskWeeks > 0) {
    summary += `，${totalRiskWeeks} 周处于预警区`
  } else {
    summary += `，经营状况良好`
  }

  return summary
}

/**
 * 周度经营趋势图表组件
 */
export const WeeklyOperationalTrend = React.memo(function WeeklyOperationalTrend() {
  const rawData = useTrendData()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(null)

  // 处理数据
  const chartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return []

    return rawData
      .map((d) => ({
        week: d.label,
        weekNumber: d.week,
        year: d.year,
        signedPremium: d.signed_premium_10k,
        lossRatio: d.loss_ratio,
        isRisk: d.loss_ratio !== null && d.loss_ratio >= LOSS_RISK_THRESHOLD,
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.weekNumber - b.weekNumber
      })
  }, [rawData])

  // 获取当前数据视图类型
  const dataViewType = useAppStore((state) => state.filters.dataViewType)

  // 处理周增量模式：跳过第一周（无法计算增量）
  const displayData = useMemo(() => {
    if (dataViewType === 'increment' && chartData.length > 1) {
      // 周增量模式下，跳过第一周
      return chartData.slice(1)
    }
    return chartData
  }, [chartData, dataViewType])

  // 生成经营摘要
  const operationalSummary = useMemo(() => {
    return generateOperationalSummary(displayData)
  }, [displayData])

  // 计算趋势线
  const trendLineData = useMemo(() => {
    return calculateTrendLine(displayData)
  }, [displayData])

  // 统计数据
  const stats = useMemo(() => {
    if (displayData.length === 0) {
      return {
        totalRiskWeeks: 0,
        avgLossRatio: 0,
        maxLossRatio: 0,
      }
    }

    const lossRatios = displayData
      .map((d) => d.lossRatio)
      .filter((v): v is number => v !== null)

    return {
      totalRiskWeeks: displayData.filter((d) => d.isRisk).length,
      avgLossRatio:
        lossRatios.length > 0
          ? lossRatios.reduce((sum, v) => sum + v, 0) / lossRatios.length
          : 0,
      maxLossRatio: lossRatios.length > 0 ? Math.max(...lossRatios) : 0,
    }
  }, [displayData])

  // 初始化和更新图表
  useEffect(() => {
    if (!chartRef.current || displayData.length === 0) return

    // 初始化 ECharts 实例
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, undefined, {
        renderer: 'canvas',
      })
    }

    const chart = chartInstanceRef.current

    // 准备数据
    // 优化X轴标签：只显示周序号，不显示年份；只显示每月第1周和最近1周
    const weeks = displayData.map((d, index) => {
      const isFirstWeekOfMonth = d.weekNumber % 4 === 1 || d.weekNumber === 1
      const isLastWeek = index === displayData.length - 1

      // 只在每月第1周和最近1周显示标签
      if (isFirstWeekOfMonth || isLastWeek) {
        return `第${d.weekNumber}周`
      }
      return '' // 其他周不显示标签
    })

    const signedPremiums = displayData.map((d) => d.signedPremium)
    const lossRatios = displayData.map((d) => d.lossRatio)

    // 分离风险点和正常点
    const normalPoints = displayData
      .map((d, i) => (!d.isRisk && d.lossRatio !== null ? [i, d.lossRatio] : null))
      .filter((v): v is [number, number] => v !== null)

    const riskPoints = displayData
      .map((d, i) => (d.isRisk && d.lossRatio !== null ? [i, d.lossRatio] : null))
      .filter((v): v is [number, number] => v !== null)

    // ECharts 配置
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999',
          },
        },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: {
          color: '#334155',
          fontSize: 12,
        },
        padding: 12,
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return ''

          const dataIndex = params[0].dataIndex
          const point = displayData[dataIndex]

          if (!point) return ''

          const anomalyReasons =
            point.lossRatio !== null && point.lossRatio >= LOSS_RISK_THRESHOLD
              ? generateAnomalyReasons(point.lossRatio, point.weekNumber)
              : []

          const thresholdDiff =
            point.lossRatio !== null
              ? point.lossRatio - LOSS_RISK_THRESHOLD
              : null

          let html = `<div style="min-width: 260px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">${point.week}</div>
            <div style="margin-bottom: 4px;">
              <span style="color: #64748b;">签单保费：</span>
              <span style="font-weight: 600;">${formatNumber(point.signedPremium, 1)} 万元</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #64748b;">赔付率（累计）：</span>
              <span style="font-weight: 600; color: ${point.isRisk ? '#ef4444' : '#334155'};">
                ${point.lossRatio !== null ? formatPercent(point.lossRatio, 2) : '—'}
              </span>
            </div>
            <div style="margin-bottom: 8px; font-size: 10px; color: #94a3b8;">
              💡 赔付率 = 年初至今累计赔款 / 累计保费
            </div>`

          if (thresholdDiff !== null) {
            html += `<div style="margin-bottom: 8px;">
              <span style="color: #64748b;">与阈值差值：</span>
              <span style="font-weight: 600; color: ${thresholdDiff >= 0 ? '#ef4444' : '#10b981'};">
                ${thresholdDiff >= 0 ? '+' : ''}${thresholdDiff.toFixed(1)}pp
              </span>
            </div>`
          }

          if (anomalyReasons.length > 0) {
            html += `<div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">
              <div style="font-weight: 600; margin-bottom: 6px; color: #f97316; font-size: 12px;">
                🚨 异常原因 Top3
              </div>`

            anomalyReasons.forEach((reason, i) => {
              html += `<div style="margin-bottom: 4px; font-size: 11px;">
                <div style="color: #64748b;">• ${reason.reason}</div>
                <div style="color: #94a3b8; margin-left: 12px;">${reason.impact}</div>
              </div>`
            })

            html += `</div>`
          }

          html += `</div>`

          return html
        },
      },
      legend: {
        data: ['签单保费', '赔付率', '阈值线 70%', '趋势线'],
        top: '2%',
        textStyle: {
          fontSize: 12,
        },
      },
      xAxis: [
        {
          type: 'category',
          data: weeks,
          axisPointer: {
            type: 'shadow',
          },
          axisLabel: {
            fontSize: 11,
            rotate: 45,
            color: '#64748b',
          },
          axisLine: {
            lineStyle: {
              color: '#cbd5e1',
            },
          },
        },
      ],
      yAxis: [
        {
          type: 'value',
          name: '签单保费（万元）',
          position: 'left',
          nameTextStyle: {
            color: '#64748b',
            fontSize: 12,
          },
          axisLabel: {
            formatter: (value: number) => formatNumber(value, 0),
            fontSize: 11,
            color: '#64748b',
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#cbd5e1',
            },
          },
          splitLine: {
            lineStyle: {
              color: '#f1f5f9',
            },
          },
        },
        {
          type: 'value',
          name: '赔付率（%）',
          position: 'right',
          nameTextStyle: {
            color: '#64748b',
            fontSize: 12,
          },
          axisLabel: {
            formatter: (value: number) => `${value.toFixed(0)}%`,
            fontSize: 11,
            color: '#64748b',
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#cbd5e1',
            },
          },
          splitLine: {
            show: false,
          },
          // 右轴只显示关键刻度：70%、均值、最大值
          min: (value: any) => Math.floor(value.min / 10) * 10,
          max: (value: any) => Math.ceil(value.max / 10) * 10,
        },
      ],
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: 0,
          start: displayData.length > 26 ? ((displayData.length - 26) / displayData.length) * 100 : 0,
          end: 100,
          height: 20,
          bottom: '5%',
          handleSize: '80%',
          textStyle: {
            fontSize: 10,
          },
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          start: displayData.length > 26 ? ((displayData.length - 26) / displayData.length) * 100 : 0,
          end: 100,
        },
      ],
      series: [
        // 签单保费趋势线（蓝色）
        {
          name: '签单保费',
          type: 'line',
          yAxisIndex: 0,
          data: signedPremiums,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#3b82f6',
            width: 3,
          },
          itemStyle: {
            color: '#3b82f6',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ]),
          },
          emphasis: {
            focus: 'series',
          },
          // LTTB 降采样（大数据优化）
          sampling: 'lttb',
        },
        // 赔付率正常点（灰色）
        {
          name: '赔付率',
          type: 'scatter',
          yAxisIndex: 1,
          data: normalPoints,
          symbolSize: 8,
          itemStyle: {
            color: '#94a3b8',
          },
          emphasis: {
            scale: 1.5,
          },
        },
        // 赔付率风险点（橙色高亮）
        {
          name: '赔付率（风险）',
          type: 'scatter',
          yAxisIndex: 1,
          data: riskPoints,
          symbolSize: 12,
          itemStyle: {
            color: '#f97316',
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 6,
            shadowColor: 'rgba(249, 115, 22, 0.5)',
          },
          emphasis: {
            scale: 1.8,
            itemStyle: {
              shadowBlur: 10,
            },
          },
          zlevel: 10,
        },
        // 赔付率连线（橙色）
        {
          name: '赔付率',
          type: 'line',
          yAxisIndex: 1,
          data: lossRatios,
          showSymbol: false,
          lineStyle: {
            color: '#f97316',
            width: 2,
            type: 'solid',
          },
          emphasis: {
            focus: 'series',
          },
          // 标记区域：赔付率≥70%的背景淡红色
          markArea: {
            silent: true,
            itemStyle: {
              color: 'rgba(254, 226, 226, 0.3)',
            },
            data: [
              [
                {
                  yAxis: LOSS_RISK_THRESHOLD,
                },
                {
                  yAxis: 'max',
                },
              ],
            ],
          },
        },
        // 阈值线 70%（红色虚线）
        {
          name: '阈值线 70%',
          type: 'line',
          yAxisIndex: 1,
          data: new Array(weeks.length).fill(LOSS_RISK_THRESHOLD),
          lineStyle: {
            color: '#ef4444',
            width: 2,
            type: 'dashed',
          },
          symbol: 'none',
          emphasis: {
            disabled: true,
          },
        },
        // 趋势线（紫色虚线）
        {
          name: '趋势线',
          type: 'line',
          yAxisIndex: 1,
          data: trendLineData,
          lineStyle: {
            color: '#8b5cf6',
            width: 2,
            type: 'dashed',
          },
          symbol: 'none',
          emphasis: {
            disabled: true,
          },
        },
      ],
    }

    chart.setOption(option, true)

    // 注册点击事件（下钻入口）
    chart.off('click')
    chart.on('click', (params: any) => {
      if (params.componentType === 'series' && params.seriesType === 'scatter') {
        const dataIndex = params.dataIndex
        const point = displayData[dataIndex]
        if (point) {
          handlePointClick(point)
        }
      }
    })

    // 响应式调整
    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })

    if (chartRef.current) {
      resizeObserver.observe(chartRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [displayData, trendLineData])

  // 清理
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
      }
    }
  }, [])

  /**
   * 处理风险点点击事件
   */
  const handlePointClick = (point: ChartDataPoint) => {
    console.log('🔍 下钻分析：', point)
    setSelectedPoint(point)

    // TODO: 集成下钻逻辑
    // 可以触发筛选器更新、打开详情面板等
    // 例如：
    // updateFilters({
    //   years: [point.year],
    //   weeks: [point.weekNumber],
    // })
    // router.push('/detail-analysis')

    alert(`点击了 ${point.week}\n将进入车型/机构剖面下钻分析`)
  }

  if (!displayData || displayData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur">
        <div className="text-center text-slate-500">暂无周度趋势数据</div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white/60 p-6 shadow-lg backdrop-blur">
      {/* 标题和经营摘要 */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">
                📊 周度经营趋势分析
              </h3>
              {displayData.length > 0 && (
                <span className="text-sm text-slate-500">
                  {displayData[displayData.length - 1].year}年第
                  {displayData[displayData.length - 1].weekNumber}周
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {operationalSummary}
            </p>
          </div>

          {/* 统计标签 */}
          <div className="flex flex-wrap items-center gap-2">
            {stats.totalRiskWeeks > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span className="font-medium text-rose-700">
                  {stats.totalRiskWeeks} 个高风险周
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 图表容器 */}
      <div ref={chartRef} style={{ width: '100%', height: '480px' }} />

      {/* 操作提示 */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>💡 提示：点击橙色风险点可进入下钻分析</span>
          <span>• 拖动时间轴可缩放查看</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
          <span>签单保费</span>
          <span className="ml-3 inline-block h-2 w-2 rounded-full bg-orange-500"></span>
          <span>赔付率</span>
          <span className="ml-3 inline-block h-2 w-2 rounded-full bg-red-500"></span>
          <span>阈值 70%</span>
          <span className="ml-3 inline-block h-2 w-2 rounded-full bg-purple-500"></span>
          <span>趋势线</span>
        </div>
      </div>
    </div>
  )
})

WeeklyOperationalTrend.displayName = 'WeeklyOperationalTrend'
