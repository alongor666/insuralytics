import { useMemo } from 'react'
import { useAppStore } from '@/store/use-app-store'
import type { InsuranceRecord, FilterState } from '@/types/insurance'

/**
 * 根据筛选条件过滤记录
 */
export function applyFilters(
  records: InsuranceRecord[],
  filters: FilterState
): InsuranceRecord[] {
  return records.filter(record => {
    // 年度筛选
    if (
      filters.years?.length &&
      !filters.years.includes(record.policy_start_year)
    ) {
      return false
    }

    // 周序号筛选
    if (
      filters.weeks?.length &&
      !filters.weeks.includes(record.week_number)
    ) {
      return false
    }

    // 机构筛选
    if (
      filters.organizations?.length &&
      !filters.organizations.includes(record.third_level_organization)
    ) {
      return false
    }

    // 保险类型筛选
    if (
      filters.insuranceTypes?.length &&
      !filters.insuranceTypes.includes(record.insurance_type)
    ) {
      return false
    }

    // 险别组合筛选
    if (
      filters.coverageTypes?.length &&
      !filters.coverageTypes.includes(record.coverage_type)
    ) {
      return false
    }

    // 客户类别筛选
    if (
      filters.customerCategories?.length &&
      !filters.customerCategories.includes(record.customer_category_3)
    ) {
      return false
    }

    // 业务类型筛选
    if (
      filters.businessTypes?.length &&
      !filters.businessTypes.includes(record.business_type_category)
    ) {
      return false
    }

    // 新续转状态筛选
    if (
      filters.renewalStatuses?.length &&
      !filters.renewalStatuses.includes(record.renewal_status)
    ) {
      return false
    }

    // 新能源车筛选
    if (filters.isNewEnergy !== null && filters.isNewEnergy !== undefined) {
      if (filters.isNewEnergy !== record.is_new_energy_vehicle) {
        return false
      }
    }

    // 车险评级筛选
    if (filters.vehicleGrades?.length) {
      if (
        !record.vehicle_insurance_grade ||
        !filters.vehicleGrades.includes(record.vehicle_insurance_grade)
      ) {
        return false
      }
    }

    // 终端来源筛选
    if (
      filters.terminalSources?.length &&
      !filters.terminalSources.includes(record.terminal_source)
    ) {
      return false
    }

    return true
  })
}

/**
 * 获取过滤后的数据
 * 根据当前的筛选条件过滤原始数据
 */
export function useFilteredData(): InsuranceRecord[] {
  const rawData = useAppStore(state => state.rawData)
  const filters = useAppStore(state => state.filters)

  return useMemo(() => applyFilters(rawData, filters), [rawData, filters])
}
