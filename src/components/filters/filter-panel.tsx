'use client'

import { RotateCcw, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/use-app-store'
import { ProductFilter } from './product-filter'
import { CustomerFilter } from './customer-filter'
import { FilterPresets } from '@/components/features/filter-presets'
import { MoreFiltersPanel } from './more-filters-panel'
import {
  FilterFeedback,
  FilterStats,
} from '@/components/filters/filter-feedback'
import { useState } from 'react'

export function FilterPanel() {
  const filters = useAppStore(state => state.filters)
  const updateFilters = useAppStore(state => state.updateFilters)
  const resetFilters = useAppStore(state => state.resetFilters)
  const [showMoreFilters, setShowMoreFilters] = useState(true)

  // 检查是否有任何活动的业务维度筛选器（不包括全局筛选器）
  const hasActiveFilters =
    filters.insuranceTypes.length > 0 ||
    filters.businessTypes.length > 0 ||
    filters.coverageTypes.length > 0 ||
    filters.customerCategories.length > 0 ||
    filters.vehicleGrades.length > 0 ||
    filters.renewalStatuses.length > 0 ||
    filters.terminalSources.length > 0 ||
    filters.isNewEnergy !== null

  // 检查更多筛选器是否有活动状态
  const hasActiveMoreFilters =
    filters.terminalSources.length > 0 || filters.isNewEnergy !== null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-2xl backdrop-blur-xl">
      {/* 筛选器反馈和统计 */}
      <FilterFeedback />
      <FilterStats />

      {/* 标题栏 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">业务维度筛选</h2>
          {hasActiveFilters && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              已启用
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" /> 重置
          </Button>
        )}
      </div>

      {/* 筛选预设快捷操作 */}
      <div className="mb-6">
        <FilterPresets />
      </div>

      {/* 筛选器组：两列栅格，提升可读性与操作效率 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProductFilter />
        <CustomerFilter />

        {/* 更多筛选器切换按钮 */}
        <div className="md:col-span-2 border-t border-slate-200 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="w-full justify-between text-slate-600 hover:text-slate-800"
          >
            <span className="flex items-center gap-2">
              更多筛选条件
              {hasActiveMoreFilters && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  {filters.terminalSources.length +
                    (filters.isNewEnergy !== null ? 1 : 0)}{' '}
                  项
                </span>
              )}
            </span>
            {showMoreFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* 更多筛选面板：放在整行，默认展开 */}
        {showMoreFilters && (
          <div className="md:col-span-2 border-t border-slate-200 pt-4">
            <MoreFiltersPanel />
          </div>
        )}
      </div>
    </div>
  )
}
