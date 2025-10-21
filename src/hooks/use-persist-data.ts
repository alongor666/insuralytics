import { useEffect } from 'react'
import { useAppStore } from '@/store/use-app-store'
import {
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  StorageKeys,
} from '@/lib/storage/local-storage'
import {
  loadRawData,
  saveRawData,
  clearRawData,
  isIndexedDBAvailable,
} from '@/lib/storage/indexed-db'
import type { InsuranceRecord, FilterState } from '@/types/insurance'

/**
 * 数据持久化 Hook
 * 自动保存和恢复数据到 localStorage / IndexedDB
 */
export function usePersistData() {
  const rawData = useAppStore(state => state.rawData)
  const filters = useAppStore(state => state.filters)
  const setRawData = useAppStore(state => state.setRawData)
  const updateFilters = useAppStore(state => state.updateFilters)

  // 从 localStorage / IndexedDB 恢复数据 (仅在组件挂载时执行一次)
  useEffect(() => {
    let cancelled = false

    async function restore() {
      const savedData = getStorageItem<InsuranceRecord[]>(StorageKeys.RAW_DATA)
      const savedFilters = getStorageItem<FilterState>(StorageKeys.FILTERS)

      if (savedData && savedData.length > 0) {
        console.log(
          `[Persist] 恢复了 ${savedData.length} 条数据 (localStorage)`
        )
        setRawData(savedData)
      } else if (isIndexedDBAvailable()) {
        const idbData = await loadRawData()
        if (!cancelled && idbData && idbData.length > 0) {
          console.log(`[Persist] 从 IndexedDB 恢复了 ${idbData.length} 条数据`)
          setRawData(idbData)
        }
      }

      if (savedFilters) {
        console.log(`[Persist] 恢复筛选条件`)
        updateFilters(savedFilters)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [setRawData, updateFilters]) // 空依赖数组,仅在挂载时执行

  // 保存数据到 IndexedDB / localStorage (当数据变化时)
  useEffect(() => {
    if (rawData.length > 0) {
      // 优先保存到 IndexedDB（支持大数据）
      if (isIndexedDBAvailable()) {
        saveRawData(rawData).then(res => {
          if (res.success) {
            console.log(`[Persist] IndexedDB 已保存 ${rawData.length} 条数据`)
          } else {
            console.warn(`[Persist] IndexedDB 保存失败: ${res.error}`)
          }
        })
      }

      // 小数据仍尝试写入 localStorage（兼容原逻辑）
      const result = setStorageItem(
        StorageKeys.RAW_DATA,
        rawData,
        7 * 24 * 60 * 60 * 1000 // 7天过期
      )

      if (!result.success) {
        console.warn(`[Persist] localStorage 保存失败: ${result.error}`)
        if (result.error?.includes('空间不足')) {
          console.warn('[Persist] 建议清理旧数据以释放空间')
        }
      } else {
        console.log(`[Persist] localStorage 已保存 ${rawData.length} 条数据`)
      }
    } else {
      // 如果数据被清空,也清空缓存
      removeStorageItem(StorageKeys.RAW_DATA)
      clearRawData()
      console.log('[Persist] 已清空缓存数据')
    }
  }, [rawData])

  // 保存筛选条件到 localStorage (当筛选条件变化时)
  useEffect(() => {
    if (filters) {
      setStorageItem(
        StorageKeys.FILTERS,
        filters,
        7 * 24 * 60 * 60 * 1000 // 7天过期
      )
      console.log('[Persist] 已保存筛选条件')
    }
  }, [filters])

  // 保存最后上传时间
  const saveUploadTime = () => {
    setStorageItem(StorageKeys.LAST_UPLOAD_TIME, Date.now())
  }

  return {
    saveUploadTime,
    clearPersistedData: () => {
      removeStorageItem(StorageKeys.RAW_DATA)
      removeStorageItem(StorageKeys.FILTERS)
      clearRawData()
      console.log('[Persist] 已清除所有持久化数据')
    },
  }
}
