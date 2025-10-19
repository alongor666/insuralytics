'use client'

import { FilterContainer } from './filter-container'
import { MultiSelectFilter } from './multi-select-filter'
import { useAppStore } from '@/store/use-app-store'
import { filterRecordsWithExclusions } from '@/store/use-app-store'
import type { VehicleInsuranceGrade } from '@/types/insurance'
import { normalizeChineseText } from '@/lib/utils'

export function CustomerFilter() {
  const filters = useAppStore(state => state.filters)
  const updateFilters = useAppStore(state => state.updateFilters)
  const rawData = useAppStore(state => state.rawData)

  // 联动：根据其他筛选条件提取唯一的客户分类（规范化去重）
  const recordsForCustomerCategory = filterRecordsWithExclusions(
    rawData,
    filters,
    ['customerCategories']
  )
  const availableCustomerCategories = Array.from(
    new Set(
      recordsForCustomerCategory.map(record => normalizeChineseText(record.customer_category_3))
    )
  )
    .filter(cat => cat)
    .sort()
    .map(cat => ({ label: cat, value: cat }))

  // 联动：根据其他筛选条件提取唯一的车险评级
  const recordsForVehicleGrades = filterRecordsWithExclusions(
    rawData,
    filters,
    ['vehicleGrades']
  )
  const availableVehicleGrades = recordsForVehicleGrades
    .map(record => record.vehicle_insurance_grade)
    .filter(
      (grade): grade is NonNullable<typeof grade> =>
        grade != null && grade !== 'X' && grade.trim() !== ''
    )
    .reduce((unique, grade) => {
      if (!unique.includes(grade)) {
        unique.push(grade)
      }
      return unique
    }, [] as NonNullable<VehicleInsuranceGrade>[])
    .sort()
    .map(grade => ({ label: grade, value: grade }))

  // 联动：根据其他筛选条件提取唯一的新续转状态
  const recordsForRenewalStatuses = filterRecordsWithExclusions(
    rawData,
    filters,
    ['renewalStatuses']
  )
  const availableRenewalStatuses = Array.from(
    new Set(recordsForRenewalStatuses.map(record => record.renewal_status))
  )
    .filter(status => status)
    .sort()
    .map(status => ({ label: status, value: status }))

  const handleCustomerCategoryChange = (categories: string[]) => {
    updateFilters({ customerCategories: categories.map(normalizeChineseText) })
  }

  const handleVehicleGradeChange = (grades: string[]) => {
    updateFilters({ vehicleGrades: grades })
  }

  const handleRenewalStatusChange = (statuses: string[]) => {
    updateFilters({ renewalStatuses: statuses })
  }

  const handleReset = () => {
    updateFilters({
      customerCategories: [],
      vehicleGrades: [],
      renewalStatuses: [],
    })
  }

  const hasFilters =
    filters.customerCategories.length > 0 ||
    filters.vehicleGrades.length > 0 ||
    filters.renewalStatuses.length > 0

  return (
    <FilterContainer
      title="客户维度"
      onReset={hasFilters ? handleReset : undefined}
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs text-slate-600">
            客户分类
          </label>
          <MultiSelectFilter
            options={availableCustomerCategories}
            selectedValues={filters.customerCategories}
            onChange={handleCustomerCategoryChange}
            placeholder="选择客户分类"
            searchPlaceholder="搜索客户分类..."
            emptyText="未找到客户分类"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-slate-600">
            车险评级
          </label>
          <MultiSelectFilter
            options={availableVehicleGrades}
            selectedValues={filters.vehicleGrades}
            onChange={handleVehicleGradeChange}
            placeholder="选择车险评级"
            searchPlaceholder="搜索车险评级..."
            emptyText="未找到车险评级"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-slate-600">
            新续转状态
          </label>
          <MultiSelectFilter
            options={availableRenewalStatuses}
            selectedValues={filters.renewalStatuses}
            onChange={handleRenewalStatusChange}
            placeholder="选择新续转状态"
            searchPlaceholder="搜索状态..."
            emptyText="未找到状态"
          />
        </div>
      </div>
    </FilterContainer>
  )
}
