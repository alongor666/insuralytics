import { useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/use-app-store'
import { normalizeChineseText } from '@/lib/utils'

export function usePremiumTargets() {
  const rawData = useAppStore(state => state.rawData)
  const premiumTargets = useAppStore(state => state.premiumTargets)
  const loadPremiumTargets = useAppStore(state => state.loadPremiumTargets)

  useEffect(() => {
    loadPremiumTargets()
  }, [loadPremiumTargets])

  const businessTypes = useMemo(() => {
    const set = new Set<string>()
    rawData.forEach(record => {
      const normalized = normalizeChineseText(record.business_type_category)
      if (normalized) {
        set.add(normalized)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [rawData])

  return {
    premiumTargets,
    businessTypes,
  }
}
