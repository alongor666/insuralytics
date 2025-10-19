/**
 * 应用全局状态管理
 * 使用 Zustand 实现
 */

import { create } from 'zustand'
import { useMemo } from 'react'
import { devtools } from 'zustand/middleware'
import type {
  InsuranceRecord,
  FilterState,
  KPIResult,
  PremiumTargets,
} from '@/types/insurance'
import { normalizeChineseText } from '@/lib/utils'

const PREMIUM_TARGET_STORAGE_KEY = 'insurDashPremiumTargets'

const defaultPremiumTargets: PremiumTargets = {
  year: new Date().getFullYear(),
  overall: 0,
  byBusinessType: {},
  updatedAt: null,
}

function loadPremiumTargetsFromStorage(): PremiumTargets {
  if (typeof window === 'undefined') {
    return defaultPremiumTargets
  }

  try {
    const stored = window.localStorage.getItem(PREMIUM_TARGET_STORAGE_KEY)
    if (!stored) {
      return defaultPremiumTargets
    }
    const parsed = JSON.parse(stored) as PremiumTargets
    return {
      year: parsed.year || new Date().getFullYear(),
      overall: Number.isFinite(parsed.overall) ? parsed.overall : 0,
      byBusinessType: parsed.byBusinessType || {},
      updatedAt: parsed.updatedAt ?? null,
    }
  } catch (error) {
    console.warn('[useAppStore] 读取保费目标数据失败，已回退默认值', error)
    return defaultPremiumTargets
  }
}

/**
 * 应用状态接口
 */
interface AppState {
  // ============= 数据状态 =============
  rawData: InsuranceRecord[]
  isLoading: boolean
  error: Error | null
  uploadProgress: number

  // ============= 筛选状态 =============
  filters: FilterState

  // ============= 计算缓存 =============
  computedKPIs: Map<string, KPIResult>

  // ============= UI 状态 =============
  viewMode: 'single' | 'trend'
  expandedPanels: Set<string>
  selectedOrganizations: string[]

  // ============= 目标管理 =============
  premiumTargets: PremiumTargets

  // ============= 操作方法 =============

  // 数据操作
  setRawData: (data: InsuranceRecord[]) => void
  clearData: () => void
  setLoading: (loading: boolean) => void
  setError: (error: Error | null) => void
  setUploadProgress: (progress: number) => void

  // 筛选操作
  updateFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
  setViewMode: (mode: 'single' | 'trend') => void

  // 目标管理
  setPremiumTargets: (targets: PremiumTargets) => void
  loadPremiumTargets: () => void

  // 缓存操作
  setKPICache: (key: string, result: KPIResult) => void
  clearKPICache: () => void
  getKPICache: (key: string) => KPIResult | undefined

  // UI 状态操作
  togglePanel: (panelId: string) => void
  setSelectedOrganizations: (orgs: string[]) => void
}

/**
 * 默认筛选器状态
 */
const defaultFilters: FilterState = {
  viewMode: 'single',
  dataViewType: 'current',
  years: [],
  weeks: [],
  singleModeWeek: null,
  trendModeWeeks: [],
  organizations: [],
  insuranceTypes: [],
  businessTypes: [],
  coverageTypes: [],
  customerCategories: [],
  vehicleGrades: [],
  terminalSources: [],
  isNewEnergy: null,
  renewalStatuses: [],
}

/**
 * 创建应用状态 Store
 */
export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // ============= 数据状态 =============
      rawData: [],
      isLoading: false,
      error: null,
      uploadProgress: 0,
      filters: defaultFilters,
      computedKPIs: new Map(),
      viewMode: 'single',
      expandedPanels: new Set(),
      selectedOrganizations: [],
      premiumTargets: loadPremiumTargetsFromStorage(),

      // ============= 数据操作 =============
      setRawData: data =>
        set(
          state => ({
            // 进入 Store 前做一遍中文文本规范化，避免后续对比出现乱码
            rawData: data.map(r => ({
              ...r,
              customer_category_3: normalizeChineseText(r.customer_category_3),
              business_type_category: normalizeChineseText(r.business_type_category),
              third_level_organization: normalizeChineseText(r.third_level_organization),
              terminal_source: normalizeChineseText(r.terminal_source),
            })),
            error: null,
          }),
          false,
          'setRawData'
        ),

      clearData: () =>
        set(
          {
            rawData: [],
            computedKPIs: new Map(),
            error: null,
          },
          false,
          'clearData'
        ),

      setLoading: loading =>
        set(
          {
            isLoading: loading,
          },
          false,
          'setLoading'
        ),

      setError: error =>
        set(
          {
            error,
            isLoading: false,
          },
          false,
          'setError'
        ),

      setUploadProgress: progress =>
        set(
          {
            uploadProgress: progress,
          },
          false,
          'setUploadProgress'
        ),

      // ============= 筛选操作 =============
      updateFilters: newFilters =>
        set(
          state => ({
            filters: {
              ...state.filters,
              // 将输入的筛选值也做一次规范化，保证比较一致性
              ...newFilters,
              organizations: (newFilters.organizations ?? state.filters.organizations).map(normalizeChineseText),
              insuranceTypes: newFilters.insuranceTypes ?? state.filters.insuranceTypes,
              businessTypes: (newFilters.businessTypes ?? state.filters.businessTypes).map(normalizeChineseText),
              coverageTypes: newFilters.coverageTypes ?? state.filters.coverageTypes,
              customerCategories: (newFilters.customerCategories ?? state.filters.customerCategories).map(normalizeChineseText),
              terminalSources: (newFilters.terminalSources ?? state.filters.terminalSources).map(normalizeChineseText),
            },
            // 筛选条件变化时清除缓存
            computedKPIs: new Map(),
          }),
          false,
          'updateFilters'
        ),

      resetFilters: () =>
        set(
          {
            filters: defaultFilters,
            computedKPIs: new Map(),
          },
          false,
          'resetFilters'
        ),

      setViewMode: mode =>
        set(
          state => ({
            viewMode: mode,
            filters: (() => {
              const currentFilters = state.filters
              if (mode === 'single') {
                const selectedWeek =
                  currentFilters.singleModeWeek ??
                  (currentFilters.weeks.length > 0
                    ? currentFilters.weeks[currentFilters.weeks.length - 1]
                    : null)
                return {
                  ...currentFilters,
                  viewMode: mode,
                  singleModeWeek: selectedWeek,
                  weeks: selectedWeek != null ? [selectedWeek] : [],
                }
              }

              const trendWeeks =
                currentFilters.trendModeWeeks.length > 0
                  ? [...currentFilters.trendModeWeeks]
                  : [...currentFilters.weeks]
              return {
                ...currentFilters,
                viewMode: mode,
                trendModeWeeks: trendWeeks,
                weeks: trendWeeks,
              }
            })(),
          }),
          false,
          'setViewMode'
        ),

      // ============= 目标管理 =============
      setPremiumTargets: targets =>
        set(
          () => {
            const normalizedMap: Record<string, number> = {}
            Object.entries(targets.byBusinessType).forEach(([key, value]) => {
              const normalizedKey = normalizeChineseText(key)
              normalizedMap[normalizedKey] = Math.max(
                0,
                Number.isFinite(value) ? value : 0
              )
            })

            const nextTargets: PremiumTargets = {
              year: targets.year || new Date().getFullYear(),
              overall: Math.max(
                0,
                Number.isFinite(targets.overall) ? targets.overall : 0
              ),
              byBusinessType: normalizedMap,
              updatedAt: targets.updatedAt ?? new Date().toISOString(),
            }

            if (typeof window !== 'undefined') {
              window.localStorage.setItem(
                PREMIUM_TARGET_STORAGE_KEY,
                JSON.stringify(nextTargets)
              )
            }

            return {
              premiumTargets: nextTargets,
            }
          },
          false,
          'setPremiumTargets'
        ),

      loadPremiumTargets: () =>
        set(
          () => ({
            premiumTargets: loadPremiumTargetsFromStorage(),
          }),
          false,
          'loadPremiumTargets'
        ),

      // ============= 缓存操作 =============
      setKPICache: (key, result) =>
        set(
          state => {
            const newCache = new Map(state.computedKPIs)
            newCache.set(key, result)
            return {
              computedKPIs: newCache,
            }
          },
          false,
          'setKPICache'
        ),

      clearKPICache: () =>
        set(
          {
            computedKPIs: new Map(),
          },
          false,
          'clearKPICache'
        ),

      getKPICache: key => {
        const state = useAppStore.getState()
        return state.computedKPIs.get(key)
      },

      // ============= UI 操作 =============
      togglePanel: (panelId: string) =>
        set(
          state => {
            const newPanels = new Set(state.expandedPanels)
            if (newPanels.has(panelId)) {
              newPanels.delete(panelId)
            } else {
              newPanels.add(panelId)
            }
            return {
              expandedPanels: newPanels,
            }
          },
          false,
          'togglePanel'
        ),

      setSelectedOrganizations: (orgs: string[]) =>
        set(
          {
            selectedOrganizations: orgs,
          },
          false,
          'setSelectedOrganizations'
        ),
    }),
    {
      name: 'insurance-analytics-store',
    }
  )
)

/**
 * 选择器：获取过滤后的数据
 */
export const useFilteredData = () => {
  const rawData = useAppStore(state => state.rawData)
  const filters = useAppStore(state => state.filters)

  // 应用筛选逻辑（memo 化，避免不必要重算）
  return useMemo(
    () =>
      rawData.filter(record => {
        // 时间筛选
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

        // 空间筛选
        if (
          filters.organizations.length > 0 &&
          !filters.organizations.includes(normalizeChineseText(record.third_level_organization))
        ) {
          return false
        }

        // 产品筛选
        if (
          filters.insuranceTypes.length > 0 &&
          !filters.insuranceTypes.includes(record.insurance_type)
        ) {
          return false
        }

        if (
          filters.businessTypes.length > 0 &&
          !filters.businessTypes.includes(normalizeChineseText(record.business_type_category))
        ) {
          return false
        }

        if (
          filters.coverageTypes.length > 0 &&
          !filters.coverageTypes.includes(record.coverage_type)
        ) {
          return false
        }

        // 客户筛选
        if (
          filters.customerCategories.length > 0 &&
          !filters.customerCategories.includes(normalizeChineseText(record.customer_category_3))
        ) {
          return false
        }

        if (filters.vehicleGrades.length > 0) {
          // 如果记录有车险评级，则检查是否在过滤器范围内
          // 如果记录没有车险评级（空值），则不过滤（允许显示）
          if (
            record.vehicle_insurance_grade &&
            !filters.vehicleGrades.includes(record.vehicle_insurance_grade)
          ) {
            return false
          }
        }

        // 渠道筛选
        if (
          filters.terminalSources.length > 0 &&
          !filters.terminalSources.includes(normalizeChineseText(record.terminal_source))
        ) {
          return false
        }

        if (filters.isNewEnergy !== null) {
          if (record.is_new_energy_vehicle !== filters.isNewEnergy) {
            return false
          }
        }

        if (
          filters.renewalStatuses.length > 0 &&
          !filters.renewalStatuses.includes(record.renewal_status)
        ) {
          return false
        }

        return true
      }),
    [rawData, filters]
  )
}

/**
 * 通用筛选函数：根据当前筛选条件过滤数据，支持排除某些筛选键（用于筛选器联动选项计算）
 */
export function filterRecordsWithExclusions(
  rawData: InsuranceRecord[],
  filters: FilterState,
  excludeKeys: Array<keyof FilterState> = []
) {
  const excluded = new Set<keyof FilterState>(excludeKeys)

  return rawData.filter(record => {
    // 时间筛选
    if (!excluded.has('years')) {
      if (
        filters.years.length > 0 &&
        !filters.years.includes(record.policy_start_year)
      ) {
        return false
      }
    }

    if (!excluded.has('weeks')) {
      if (
        filters.weeks.length > 0 &&
        !filters.weeks.includes(record.week_number)
      ) {
        return false
      }
    }

    // 空间筛选
    if (!excluded.has('organizations')) {
      if (
        filters.organizations.length > 0 &&
        !filters.organizations.includes(normalizeChineseText(record.third_level_organization))
      ) {
        return false
      }
    }

    // 产品筛选
    if (!excluded.has('insuranceTypes')) {
      if (
        filters.insuranceTypes.length > 0 &&
        !filters.insuranceTypes.includes(record.insurance_type)
      ) {
        return false
      }
    }

    if (!excluded.has('businessTypes')) {
      if (
        filters.businessTypes.length > 0 &&
        !filters.businessTypes.includes(normalizeChineseText(record.business_type_category))
      ) {
        return false
      }
    }

    if (!excluded.has('coverageTypes')) {
      if (
        filters.coverageTypes.length > 0 &&
        !filters.coverageTypes.includes(record.coverage_type)
      ) {
        return false
      }
    }

    // 客户筛选
    if (!excluded.has('customerCategories')) {
      if (
        filters.customerCategories.length > 0 &&
        !filters.customerCategories.includes(normalizeChineseText(record.customer_category_3))
      ) {
        return false
      }
    }

    if (!excluded.has('vehicleGrades')) {
      if (filters.vehicleGrades.length > 0) {
        // 如果记录有车险评级，则检查是否在过滤器范围内
        // 如果记录没有车险评级（空值），则不过滤（允许显示）
        if (
          record.vehicle_insurance_grade &&
          !filters.vehicleGrades.includes(record.vehicle_insurance_grade)
        ) {
          return false
        }
      }
    }

    // 渠道筛选
    if (!excluded.has('terminalSources')) {
      if (
        filters.terminalSources.length > 0 &&
        !filters.terminalSources.includes(normalizeChineseText(record.terminal_source))
      ) {
        return false
      }
    }

    if (!excluded.has('isNewEnergy')) {
      if (filters.isNewEnergy !== null) {
        if (record.is_new_energy_vehicle !== filters.isNewEnergy) {
          return false
        }
      }
    }

    if (!excluded.has('renewalStatuses')) {
      if (
        filters.renewalStatuses.length > 0 &&
        !filters.renewalStatuses.includes(record.renewal_status)
      ) {
        return false
      }
    }

    return true
  })
}

/**
 * 选择器：获取数据统计信息
 */
export const useDataStats = () => {
  const rawData = useAppStore(state => state.rawData)
  const filteredData = useFilteredData()

  return {
    totalRecords: rawData.length,
    filteredRecords: filteredData.length,
    filterPercentage:
      rawData.length > 0
        ? ((filteredData.length / rawData.length) * 100).toFixed(1)
        : '0',
  }
}
