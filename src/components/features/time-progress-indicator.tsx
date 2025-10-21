'use client'

import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/use-app-store'
import { useMemo } from 'react'
import { getWeekEndDate, getDaysFromYearStart } from '@/lib/utils/date-utils'

export interface TimeProgressIndicatorProps {
  /**
   * 自定义类名
   */
  className?: string
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 时间进度指示器组件
 * 显示：截至日期、已过天数、剩余天数
 */
export function TimeProgressIndicator({
  className,
}: TimeProgressIndicatorProps) {
  const rawData = useAppStore(state => state.rawData)
  const viewMode = useAppStore(state => state.filters.viewMode)
  const singleModeWeek = useAppStore(state => state.filters.singleModeWeek)
  const filterYears = useAppStore(state => state.filters.years)

  // 计算当前的截止日期和时间进度
  const timeProgress = useMemo(() => {
    const filters = {
      viewMode,
      singleModeWeek,
      years: filterYears,
    }
    if (rawData.length === 0) {
      // 如果没有数据，使用当前日期
      const now = new Date()
      const daysPassed = getDaysFromYearStart(now)
      const daysRemaining = 365 - daysPassed
      const progressPercent = (daysPassed / 365) * 100

      return {
        endDate: formatDate(now),
        year: now.getFullYear(),
        weekNumber: null,
        daysPassed,
        daysRemaining,
        progressPercent,
      }
    }

    // 获取当前选择的周次和年份
    let selectedYear: number
    let selectedWeek: number | null = null

    if (filters.viewMode === 'single' && filters.singleModeWeek) {
      selectedWeek = filters.singleModeWeek
    }

    // 从数据中获取最大周次作为当前周
    if (!selectedWeek) {
      const weeks = rawData.map(r => r.week_number)
      const maxWeek = weeks.length > 0 ? Math.max(...weeks) : 1
      selectedWeek = maxWeek
    }

    // 获取年份（优先从筛选器，否则从数据）
    if (filters.years.length > 0) {
      selectedYear = Math.max(...filters.years)
    } else {
      const years = rawData.map(r => r.policy_start_year)
      selectedYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear()
    }

    // 计算该周的结束日期
    const weekEndDate = getWeekEndDate(selectedYear, selectedWeek)
    const daysPassed = getDaysFromYearStart(weekEndDate)
    const daysRemaining = 365 - daysPassed
    const progressPercent = (daysPassed / 365) * 100

    return {
      endDate: formatDate(weekEndDate),
      year: selectedYear,
      weekNumber: selectedWeek,
      daysPassed,
      daysRemaining,
      progressPercent,
    }
  }, [rawData, viewMode, singleModeWeek, filterYears])

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 p-4 backdrop-blur-sm',
        className
      )}
    >
      {/* 标题 */}
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-700">时间进度</h3>
      </div>

      {/* 核心信息 */}
      <div className="space-y-2">
        {/* 截至日期 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">截至</span>
          <span className="font-mono text-sm font-bold text-blue-700">
            {timeProgress.endDate}
            {timeProgress.weekNumber && (
              <span className="ml-2 text-xs text-slate-500">
                (第{timeProgress.weekNumber}周)
              </span>
            )}
          </span>
        </div>

        {/* 已过天数 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">已过</span>
          <span className="font-mono text-sm font-semibold text-green-600">
            {timeProgress.daysPassed}天
            <span className="ml-1 text-xs text-slate-500">
              ({timeProgress.progressPercent.toFixed(1)}%)
            </span>
          </span>
        </div>

        {/* 剩余天数 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">剩余</span>
          <span className="font-mono text-sm font-semibold text-orange-600">
            {timeProgress.daysRemaining}天
            <span className="ml-1 text-xs text-slate-500">
              ({(100 - timeProgress.progressPercent).toFixed(1)}%)
            </span>
          </span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${timeProgress.progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
