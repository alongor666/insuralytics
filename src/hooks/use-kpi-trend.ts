/**
 * KPI 趋势数据 Hook
 * 用于获取KPI指标的历史趋势，供Sparkline使用
 */

import { useMemo, useRef } from 'react'
import { useAppStore } from '@/store/use-app-store'
import { calculateKPIs } from '@/lib/calculations/kpi-engine'
import type { InsuranceRecord } from '@/types/insurance'

/**
 * KPI趋势数据点
 */
export interface KPITrendPoint {
  week: number
  year: number
  value: number | null
}

// 缓存机制
const trendCache = new Map<string, number[]>()
const CACHE_SIZE_LIMIT = 100

/**
 * 生成缓存键
 */
function generateCacheKey(
  dataLength: number,
  kpiKey: string,
  limit: number,
  filtersHash: string
): string {
  return `${dataLength}-${kpiKey}-${limit}-${filtersHash}`
}

/**
 * 生成筛选器哈希
 */
function generateFiltersHash(filters: any): string {
  return JSON.stringify({
    years: filters.years.sort(),
    weeks: filters.weeks.sort(),
    organizations: filters.organizations.sort(),
    insuranceTypes: filters.insuranceTypes.sort(),
    businessTypes: filters.businessTypes.sort(),
    coverageTypes: filters.coverageTypes.sort(),
    customerCategories: filters.customerCategories.sort(),
    vehicleGrades: filters.vehicleGrades.sort(),
    terminalSources: filters.terminalSources.sort(),
    isNewEnergy: filters.isNewEnergy,
    renewalStatuses: filters.renewalStatuses.sort(),
  })
}

/**
 * 按周计算KPI趋势
 * @param data 保险数据
 * @param kpiKey KPI键名
 * @param limit 返回最近几周的数据（默认12周）
 */
function calculateKPITrend(
  data: InsuranceRecord[],
  kpiKey: keyof ReturnType<typeof calculateKPIs>,
  limit = 12
): number[] {
  if (!data || data.length === 0) {
    return []
  }

  // 按年度和周次分组
  const weeklyData = new Map<string, InsuranceRecord[]>()

  data.forEach(record => {
    const key = `${record.policy_start_year}-${record.week_number}`
    if (!weeklyData.has(key)) {
      weeklyData.set(key, [])
    }
    weeklyData.get(key)!.push(record)
  })

  // 获取所有周次并排序
  const weeks = Array.from(weeklyData.keys()).sort()

  // 取最近N周
  const recentWeeks = weeks.slice(-limit)

  // 计算每周的KPI值
  const trendData = recentWeeks.map(weekKey => {
    const weekRecords = weeklyData.get(weekKey) || []
    const kpi = calculateKPIs(weekRecords)
    const value = kpi[kpiKey]

    // 处理null值：使用0或者跳过
    return typeof value === 'number' ? value : 0
  })

  return trendData
}

/**
 * 应用筛选条件
 */
function applyFilters(
  data: InsuranceRecord[],
  filters: any
): InsuranceRecord[] {
  return data.filter(record => {
    // 年度筛选
    if (
      filters.years.length > 0 &&
      !filters.years.includes(record.policy_start_year)
    ) {
      return false
    }

    // 周次筛选
    if (
      filters.weeks.length > 0 &&
      !filters.weeks.includes(record.week_number)
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
 * 使用KPI趋势数据的Hook
 * @param kpiKey KPI键名
 * @param options 选项
 */
export function useKPITrend(
  kpiKey: keyof ReturnType<typeof calculateKPIs>,
  options: {
    /**
     * 显示最近几周的数据
     */
    weeks?: number
    /**
     * 是否只使用筛选后的数据
     */
    useFilteredData?: boolean
  } = {}
) {
  const { weeks = 12, useFilteredData = true } = options

  const rawData = useAppStore(state => state.rawData)
  const filters = useAppStore(state => state.filters)

  // 使用 ref 来存储上一次的计算结果，避免不必要的重新计算
  const lastResultRef = useRef<{ key: string; data: number[] } | null>(null)

  const trendData = useMemo(() => {
    // 生成筛选器哈希
    const filtersHash = generateFiltersHash(filters)
    const cacheKey = generateCacheKey(
      rawData.length,
      kpiKey as string,
      weeks,
      filtersHash
    )

    // 检查是否与上次计算相同
    if (lastResultRef.current && lastResultRef.current.key === cacheKey) {
      return lastResultRef.current.data
    }

    // 检查缓存
    if (trendCache.has(cacheKey)) {
      const cachedResult = trendCache.get(cacheKey)!
      lastResultRef.current = { key: cacheKey, data: cachedResult }
      return cachedResult
    }

    let dataToUse = rawData

    // 如果启用了筛选，应用筛选条件
    if (useFilteredData) {
      dataToUse = applyFilters(rawData, filters)
    }

    const result = calculateKPITrend(dataToUse, kpiKey, weeks)

    // 缓存结果（限制缓存大小）
    if (trendCache.size >= CACHE_SIZE_LIMIT) {
      const firstKey = trendCache.keys().next().value
      if (firstKey) {
        trendCache.delete(firstKey)
      }
    }
    trendCache.set(cacheKey, result)

    // 更新 ref
    lastResultRef.current = { key: cacheKey, data: result }

    return result
  }, [rawData, filters, kpiKey, weeks, useFilteredData])

  return trendData
}

/**
 * 批量获取多个KPI的趋势数据
 * 优化版本：避免重复计算筛选后的数据
 */
export function useMultipleKPITrends(
  kpiKeys: Array<keyof ReturnType<typeof calculateKPIs>>,
  options: {
    weeks?: number
    useFilteredData?: boolean
  } = {}
) {
  const { weeks = 12, useFilteredData = true } = options
  const rawData = useAppStore(state => state.rawData)
  const filters = useAppStore(state => state.filters)

  const trends = useMemo(() => {
    const result: Record<string, number[]> = {}

    // 只计算一次筛选后的数据
    let dataToUse = rawData
    if (useFilteredData) {
      dataToUse = applyFilters(rawData, filters)
    }

    // 为每个KPI计算趋势
    kpiKeys.forEach((kpiKey: keyof ReturnType<typeof calculateKPIs>) => {
      result[kpiKey as string] = calculateKPITrend(dataToUse, kpiKey, weeks)
    })

    return result
  }, [rawData, filters, kpiKeys, weeks, useFilteredData])

  return trends
}
