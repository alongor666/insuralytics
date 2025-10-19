'use client'

import { BarChart, TrendingUp } from 'lucide-react'
import { useAppStore } from '@/store/use-app-store'
import { cn } from '@/lib/utils'

export type DataViewType = 'current' | 'increment'

/**
 * 数据视图类型选择器（紧凑版，用于顶部导航栏）
 * 支持当周值和周增量两种数据类型
 */
export function DataViewSelector() {
  const { filters, updateFilters } = useAppStore()
  const value = filters.dataViewType

  const options = [
    {
      id: 'current' as const,
      label: '当周值',
      icon: BarChart,
    },
    {
      id: 'increment' as const,
      label: '周增量',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="inline-flex items-center gap-1 rounded-md border bg-white p-1 shadow-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
      {options.map(option => {
        const Icon = option.icon
        const isActive = value === option.id

        return (
          <button
            key={option.id}
            onClick={() => updateFilters({ dataViewType: option.id })}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all',
              isActive
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-600 dark:bg-blue-500'
                : 'hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            )}
          >
            <Icon className="w-4 h-4" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
