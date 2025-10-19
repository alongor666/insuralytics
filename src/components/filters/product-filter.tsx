'use client'

import { FilterContainer } from './filter-container'
import { MultiSelectFilter } from './multi-select-filter'
import { useAppStore } from '@/store/use-app-store'
import { filterRecordsWithExclusions } from '@/store/use-app-store'
import { normalizeChineseText } from '@/lib/utils'

export function ProductFilter() {
  const filters = useAppStore(state => state.filters)
  const updateFilters = useAppStore(state => state.updateFilters)
  const rawData = useAppStore(state => state.rawData)

  // 联动：根据其他筛选条件提取唯一的保险类型
  const recordsForInsuranceType = filterRecordsWithExclusions(
    rawData,
    filters,
    ['insuranceTypes']
  )
  const availableInsuranceTypes = Array.from(
    new Set(recordsForInsuranceType.map(record => record.insurance_type))
  )
    .filter(type => type)
    .sort()
    .map(type => ({ label: type, value: type }))

  // 联动：根据其他筛选条件提取唯一的业务类型（规范化去重）
  const recordsForBusinessType = filterRecordsWithExclusions(rawData, filters, [
    'businessTypes',
  ])
  const availableBusinessTypes = Array.from(
    new Set(recordsForBusinessType.map(record => normalizeChineseText(record.business_type_category)))
  )
    .filter(type => type)
    .sort()
    .map(type => ({ label: type, value: type }))

  // 联动：根据其他筛选条件提取唯一的险别组合
  const recordsForCoverageType = filterRecordsWithExclusions(rawData, filters, [
    'coverageTypes',
  ])
  const availableCoverageTypes = Array.from(
    new Set(recordsForCoverageType.map(record => record.coverage_type))
  )
    .filter(type => type)
    .sort()
    .map(type => ({ label: type, value: type }))

  const handleInsuranceTypeChange = (types: string[]) => {
    updateFilters({ insuranceTypes: types })
  }

  const handleBusinessTypeChange = (types: string[]) => {
    updateFilters({ businessTypes: types.map(normalizeChineseText) })
  }

  const handleCoverageTypeChange = (types: string[]) => {
    updateFilters({ coverageTypes: types })
  }

  const handleReset = () => {
    updateFilters({ insuranceTypes: [], businessTypes: [], coverageTypes: [] })
  }

  const hasFilters =
    filters.insuranceTypes.length > 0 ||
    filters.businessTypes.length > 0 ||
    filters.coverageTypes.length > 0

  return (
    <FilterContainer title="产品维度" onReset={hasFilters ? handleReset : undefined}>
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs text-slate-600">保险类型</label>
          <MultiSelectFilter
            options={availableInsuranceTypes}
            selectedValues={filters.insuranceTypes}
            onChange={handleInsuranceTypeChange}
            placeholder="选择险种"
            searchPlaceholder="搜索险种..."
            emptyText="未找到险种"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-slate-600">业务类型</label>
          <MultiSelectFilter
            options={availableBusinessTypes}
            selectedValues={filters.businessTypes}
            onChange={handleBusinessTypeChange}
            placeholder="选择业务类型"
            searchPlaceholder="搜索业务类型..."
            emptyText="未找到业务类型"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-slate-600">险别组合</label>
          <MultiSelectFilter
            options={availableCoverageTypes}
            selectedValues={filters.coverageTypes}
            onChange={handleCoverageTypeChange}
            placeholder="选择险别组合"
            searchPlaceholder="搜索险别组合..."
            emptyText="未找到险别组合"
          />
        </div>
      </div>
    </FilterContainer>
  )
}
