/**
 * 应用全局状态管理
 * 使用 Zustand 实现
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  InsuranceRecord,
  FilterState,
  KPIResult,
} from '@/types/insurance'

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

  // 缓存操作
  setKPICache: (key: string, result: KPIResult) => void
  clearKPICache: () => void
  getKPICache: (key: string) => KPIResult | undefined

  // UI 操作
  togglePanel: (panelId: string) => void
  setSelectedOrganizations: (orgs: string[]) => void
}

/**
 * 默认筛选器状态
 */
const defaultFilters: FilterState = {
  viewMode: 'single',
  policyYear: new Date().getFullYear(),
  weekNumbers: [],
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
    set => ({
      // ============= 初始状态 =============
      rawData: [],
      isLoading: false,
      error: null,
      uploadProgress: 0,
      filters: defaultFilters,
      computedKPIs: new Map(),
      viewMode: 'single',
      expandedPanels: new Set(),
      selectedOrganizations: [],

      // ============= 数据操作 =============
      setRawData: data =>
        set(
          state => ({
            rawData: data,
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
              ...newFilters,
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
            filters: {
              ...state.filters,
              viewMode: mode,
            },
          }),
          false,
          'setViewMode'
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
      togglePanel: panelId =>
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

      setSelectedOrganizations: orgs =>
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

  // 应用筛选逻辑
  return rawData.filter(record => {
    // 时间筛选
    if (
      filters.policyYear &&
      record.policy_start_year !== filters.policyYear
    ) {
      return false
    }

    if (
      filters.weekNumbers &&
      filters.weekNumbers.length > 0 &&
      !filters.weekNumbers.includes(record.week_number)
    ) {
      return false
    }

    // 空间筛选
    if (
      filters.organizations &&
      filters.organizations.length > 0 &&
      !filters.organizations.includes(record.third_level_organization)
    ) {
      return false
    }

    // 产品筛选
    if (
      filters.insuranceTypes &&
      filters.insuranceTypes.length > 0 &&
      !filters.insuranceTypes.includes(record.insurance_type)
    ) {
      return false
    }

    if (
      filters.coverageTypes &&
      filters.coverageTypes.length > 0 &&
      !filters.coverageTypes.includes(record.coverage_type)
    ) {
      return false
    }

    // 客户筛选
    if (
      filters.customerCategories &&
      filters.customerCategories.length > 0 &&
      !filters.customerCategories.includes(record.customer_category_3)
    ) {
      return false
    }

    // 渠道筛选
    if (filters.isNewEnergy !== null) {
      if (record.is_new_energy_vehicle !== filters.isNewEnergy) {
        return false
      }
    }

    if (
      filters.renewalStatuses &&
      filters.renewalStatuses.length > 0 &&
      !filters.renewalStatuses.includes(record.renewal_status)
    ) {
      return false
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
