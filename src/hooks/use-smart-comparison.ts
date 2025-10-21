/**
 * 智能环比 Hook
 * 自动找到上一个有数据的周期进行对比
 * 如果上一周期数据缺失，则继续往前跳跃查找
 */

import { useMemo } from 'react'
import { useAppStore } from '@/store/use-app-store'
import { kpiEngine } from '@/lib/calculations/kpi-engine'
import type { InsuranceRecord, FilterState } from '@/types/insurance'

/**
 * 应用筛选条件（除了周次）
 */
function applyFiltersExceptWeek(
  data: InsuranceRecord[],
  filters: FilterState
): InsuranceRecord[] {
  return data.filter(record => {
    // 年度筛选
    if (
      filters.years.length > 0 &&
      !filters.years.includes(record.policy_start_year)
    ) {
      return false
    }

    // 机构筛选
    if (
      filters.organizations.length > 0 &&
      !filters.organizations.includes(record.third_level_organization)
    ) {
      return false
    }

    // 险种筛选
    if (
      filters.insuranceTypes.length > 0 &&
      !filters.insuranceTypes.includes(record.insurance_type)
    ) {
      return false
    }

    // 业务类型筛选
    if (
      filters.businessTypes.length > 0 &&
      !filters.businessTypes.includes(record.business_type_category)
    ) {
      return false
    }

    // 险别筛选
    if (
      filters.coverageTypes.length > 0 &&
      !filters.coverageTypes.includes(record.coverage_type)
    ) {
      return false
    }

    // 客户分类筛选
    if (
      filters.customerCategories.length > 0 &&
      !filters.customerCategories.includes(record.customer_category_3)
    ) {
      return false
    }

    // 车险评级筛选
    if (
      filters.vehicleGrades.length > 0 &&
      record.vehicle_insurance_grade &&
      !filters.vehicleGrades.includes(record.vehicle_insurance_grade)
    ) {
      return false
    }

    // 终端来源筛选
    if (
      filters.terminalSources.length > 0 &&
      !filters.terminalSources.includes(record.terminal_source)
    ) {
      return false
    }

    // 新能源车筛选
    if (
      filters.isNewEnergy !== null &&
      record.is_new_energy_vehicle !== filters.isNewEnergy
    ) {
      return false
    }

    // 续保状态筛选
    if (
      filters.renewalStatuses.length > 0 &&
      !filters.renewalStatuses.includes(record.renewal_status)
    ) {
      return false
    }

    return true
  })
}

/**
 * 查找上一个有数据的周期
 * @param rawData 原始数据
 * @param currentWeek 当前周次
 * @param filters 筛选条件
 * @param maxJumpBack 最多往前跳跃几周（默认5周）
 * @returns 上一周期的数据，如果找不到则返回null
 */
function findPreviousWeekWithData(
  rawData: InsuranceRecord[],
  currentWeek: number,
  filters: FilterState,
  maxJumpBack = 5
): InsuranceRecord[] | null {
  // 应用除周次之外的筛选条件
  const baseFilteredData = applyFiltersExceptWeek(rawData, filters)

  // 从 currentWeek - 1 开始往前查找，最多查找 maxJumpBack 周
  for (let i = 1; i <= maxJumpBack; i++) {
    const targetWeek = currentWeek - i
    if (targetWeek < 1) break // 不能小于第1周

    const weekData = baseFilteredData.filter(
      record => record.week_number === targetWeek
    )

    if (weekData.length > 0) {
      return weekData
    }
  }

  return null
}

/**
 * 使用智能环比数据的Hook
 * @returns { currentKpi, compareKpi, previousWeekFound }
 */
export function useSmartComparison(
  options: {
    /**
     * 年度目标（可选）
     */
    annualTargetYuan?: number | null
    /**
     * 最大往前跳跃周数
     */
    maxJumpBack?: number
  } = {}
) {
  const { annualTargetYuan = null, maxJumpBack = 5 } = options

  const rawData = useAppStore(state => state.rawData)
  const filters = useAppStore(state => state.filters)
  const filteredData = useMemo(() => {
    return rawData.filter(record => {
      if (
        filters.years.length > 0 &&
        !filters.years.includes(record.policy_start_year)
      ) {
        return false
      }
      if (
        filters.weeks.length > 0 &&
        !filters.weeks.includes(record.week_number)
      ) {
        return false
      }
      if (
        filters.organizations.length > 0 &&
        !filters.organizations.includes(record.third_level_organization)
      ) {
        return false
      }
      if (
        filters.insuranceTypes.length > 0 &&
        !filters.insuranceTypes.includes(record.insurance_type)
      ) {
        return false
      }
      if (
        filters.businessTypes.length > 0 &&
        !filters.businessTypes.includes(record.business_type_category)
      ) {
        return false
      }
      if (
        filters.coverageTypes.length > 0 &&
        !filters.coverageTypes.includes(record.coverage_type)
      ) {
        return false
      }
      if (
        filters.customerCategories.length > 0 &&
        !filters.customerCategories.includes(record.customer_category_3)
      ) {
        return false
      }
      if (
        filters.vehicleGrades.length > 0 &&
        record.vehicle_insurance_grade &&
        !filters.vehicleGrades.includes(record.vehicle_insurance_grade)
      ) {
        return false
      }
      if (
        filters.terminalSources.length > 0 &&
        !filters.terminalSources.includes(record.terminal_source)
      ) {
        return false
      }
      if (
        filters.isNewEnergy !== null &&
        record.is_new_energy_vehicle !== filters.isNewEnergy
      ) {
        return false
      }
      if (
        filters.renewalStatuses.length > 0 &&
        !filters.renewalStatuses.includes(record.renewal_status)
      ) {
        return false
      }
      return true
    })
  }, [rawData, filters])

  const comparison = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        currentKpi: null,
        compareKpi: null,
        previousWeekNumber: null,
      }
    }

    // 计算当前KPI
    const currentKpi = kpiEngine.calculate(filteredData, {
      annualTargetYuan,
    })

    // 获取当前选择的周次
    const currentWeek =
      filters.viewMode === 'single' && filters.singleModeWeek
        ? filters.singleModeWeek
        : filteredData.length > 0
          ? Math.max(...filteredData.map(r => r.week_number))
          : 1 // 默认为第1周（防止空数组导致-Infinity）

    // 查找上一个有数据的周期
    const previousWeekData = findPreviousWeekWithData(
      rawData,
      currentWeek,
      filters,
      maxJumpBack
    )

    if (!previousWeekData || previousWeekData.length === 0) {
      return {
        currentKpi,
        compareKpi: null,
        previousWeekNumber: null,
      }
    }

    // 计算上一周期的KPI
    const compareKpi = kpiEngine.calculate(previousWeekData, {
      annualTargetYuan,
    })

    // 获取上一周期的周次
    const previousWeekNumber =
      previousWeekData.length > 0
        ? Math.max(...previousWeekData.map(r => r.week_number))
        : 1 // 默认为第1周（防止空数组导致-Infinity）

    return {
      currentKpi,
      compareKpi,
      previousWeekNumber,
    }
  }, [filteredData, rawData, filters, annualTargetYuan, maxJumpBack])

  return comparison
}
