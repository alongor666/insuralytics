/**
 * KPI 计算 Hook
 * 基于筛选后的数据计算 KPI 指标
 * 支持当周值和周增量两种模式
 */

import { useMemo } from 'react'
import { useAppStore, useFilteredData } from '@/store/use-app-store'
import { kpiEngine } from '@/lib/calculations/kpi-engine'
import type { KPIResult, InsuranceRecord } from '@/types/insurance'
import { normalizeChineseText } from '@/lib/utils'

/**
 * 使用 KPI 计算
 * @returns KPI 计算结果
 */
export function useKPI(): KPIResult | null {
  const filteredData = useFilteredData()
  const rawData = useAppStore(state => state.rawData)
  const filters = useAppStore(state => state.filters)
  const dataViewType = filters.dataViewType
  const premiumTargets = useAppStore(state => state.premiumTargets)

  const currentTargetYuan = useMemo(() => {
    if (!premiumTargets) return null

    if (filters.businessTypes.length > 0) {
      const sum = filters.businessTypes.reduce((acc, type) => {
        const normalized = normalizeChineseText(type)
        return acc + (premiumTargets.byBusinessType[normalized] ?? 0)
      }, 0)
      if (sum > 0) {
        return sum
      }
    }

    return premiumTargets.overall > 0 ? premiumTargets.overall : null
  }, [filters.businessTypes, premiumTargets])

  const kpiResult = useMemo(() => {
    if (filteredData.length === 0) {
      return null
    }

    // 当周值模式：直接计算
    if (dataViewType === 'current') {
      return kpiEngine.calculate(filteredData, {
        annualTargetYuan: currentTargetYuan ?? undefined,
      })
    }

    // 周增量模式：需要计算当前周和前一周的差值
    // 获取当前选择的周次
    const currentWeek =
      filters.viewMode === 'single' ? filters.singleModeWeek : null

    if (!currentWeek) {
      // 如果没有选择具体周次，返回当周值
      return kpiEngine.calculate(filteredData, {
        annualTargetYuan: currentTargetYuan ?? undefined,
      })
    }

    // 获取当前周的数据（已经是筛选后的数据）
    const currentWeekData = filteredData

    // 获取前一周的数据
    const previousWeek = currentWeek - 1
    const previousWeekData = rawData.filter((record: InsuranceRecord) => {
      // 应用除了周次之外的所有筛选条件
      if (
        filters.years.length > 0 &&
        !filters.years.includes(record.policy_start_year)
      ) {
        return false
      }

      // 前一周的数据
      if (record.week_number !== previousWeek) {
        return false
      }

      // 应用其他筛选条件
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

    // 计算周增量
    return kpiEngine.calculateIncrement(currentWeekData, previousWeekData)
  }, [filteredData, rawData, filters, dataViewType])

  return kpiResult
}
