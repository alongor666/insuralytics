'use client'

import { SlidersHorizontal } from 'lucide-react'
import { DataViewSelector } from '@/components/filters/data-view-selector'
import { CompactTimeFilter } from '@/components/filters/compact-time-filter'
import { CompactOrganizationFilter } from '@/components/filters/compact-organization-filter'
import { DataExport } from '@/components/features/data-export'
import { PDFReportExport } from '@/components/features/pdf-report-export'
import { useAppStore } from '@/store/use-app-store'
import { usePersistData } from '@/hooks/use-persist-data'

interface TopToolbarProps {
  showFilters: boolean
  onToggleFilters: () => void
  rawCount: number
}

export function TopToolbar({
  showFilters,
  onToggleFilters,
  rawCount,
}: TopToolbarProps) {
  const { clearPersistedData } = usePersistData()

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      {/* 左侧：筛选器切换 + 数据统计 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleFilters}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:border-slate-400 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? '隐藏筛选' : '显示筛选'}
        </button>
        <p className="text-sm text-slate-600">
          已加载{' '}
          <span className="font-semibold text-blue-600">
            {rawCount.toLocaleString()}
          </span>{' '}
          条数据记录
        </p>
      </div>

      {/* 中间：全局筛选器区域 */}
      <div className="flex items-center gap-3">
        <DataViewSelector />
        <CompactTimeFilter />
        <CompactOrganizationFilter />
      </div>

      {/* 右侧：导出和操作按钮 */}
      <div className="flex items-center gap-3">
        <DataExport />
        <PDFReportExport />
        <button
          onClick={() => {
            if (
              confirm('确定要清除当前数据并重新上传吗？这将清除所有缓存数据。')
            ) {
              useAppStore.getState().clearData()
              clearPersistedData()
            }
          }}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:border-slate-400 transition-colors"
        >
          重新上传
        </button>
      </div>
    </div>
  )
}
