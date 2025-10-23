'use client'

import { Calendar, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/use-app-store'
import { useMemo, useState } from 'react'
import { getWeekEndDate, getDaysFromYearStart } from '@/lib/utils/date-utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface TimeProgressIndicatorProps {
  /**
   * 自定义类名
   */
  className?: string
}

/**
 * 格式化日期为 M月D日
 */
function formatDateShort(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

/**
 * 时间进度指示器组件
 * 单行显示：截至YYYY年第W周、M月D日，已过N天（N%），当年剩余N天（N%）
 * 整合周序号选择功能
 */
export function TimeProgressIndicator({
  className,
}: TimeProgressIndicatorProps) {
  const rawData = useAppStore(state => state.rawData)
  const viewMode = useAppStore(state => state.filters.viewMode)
  const singleModeWeek = useAppStore(state => state.filters.singleModeWeek)
  const filterYears = useAppStore(state => state.filters.years)
  const updateFilters = useAppStore(state => state.updateFilters)
  const [isWeekSelectorOpen, setIsWeekSelectorOpen] = useState(false)

  // 获取可用的周次选项
  const availableWeeks = useMemo(() => {
    if (rawData.length === 0) return []
    
    const weeks = Array.from(new Set(rawData.map(r => r.week_number)))
      .sort((a, b) => a - b)
      .map(week => ({
        label: `第${week}周`,
        value: week.toString(),
        week,
      }))
    
    return weeks
  }, [rawData])

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
        endDate: formatDateShort(now),
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
      endDate: formatDateShort(weekEndDate),
      year: selectedYear,
      weekNumber: selectedWeek,
      daysPassed,
      daysRemaining,
      progressPercent,
    }
  }, [rawData, viewMode, singleModeWeek, filterYears])

  // 处理周次选择
  const handleWeekSelect = (week: number) => {
    if (viewMode === 'single') {
      updateFilters({
        singleModeWeek: week,
        weeks: [week],
      })
    }
    setIsWeekSelectorOpen(false)
  }

  // 获取当前选择的周次显示文本
  const getSelectedWeekText = () => {
    if (timeProgress.weekNumber) {
      return `第${timeProgress.weekNumber}周`
    }
    return '选择周次'
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-gradient-to-r from-blue-50/80 to-cyan-50/80 px-4 py-3 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex items-center justify-between text-sm">
        {/* 左侧：截至时间信息 */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-slate-700">
            截至{timeProgress.year}年
            {viewMode === 'single' && availableWeeks.length > 0 ? (
              <Popover open={isWeekSelectorOpen} onOpenChange={setIsWeekSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 font-medium text-blue-600 hover:bg-blue-100"
                  >
                    {getSelectedWeekText()}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-1">
                    {availableWeeks.map((week) => (
                      <Button
                        key={week.week}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left",
                          timeProgress.weekNumber === week.week && "bg-blue-100 text-blue-700"
                        )}
                        onClick={() => handleWeekSelect(week.week)}
                      >
                        {week.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <span className="font-medium text-blue-600">
                {getSelectedWeekText()}
              </span>
            )}
            、{timeProgress.endDate}
          </span>
        </div>

        {/* 右侧：进度信息 */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-600">
            已过{timeProgress.daysPassed}天
            <span className="ml-1 text-slate-500">
              ({timeProgress.progressPercent.toFixed(1)}%)
            </span>
          </span>
          <span className="text-orange-600">
            当年剩余{timeProgress.daysRemaining}天
            <span className="ml-1 text-slate-500">
              ({(100 - timeProgress.progressPercent).toFixed(1)}%)
            </span>
          </span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${timeProgress.progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
