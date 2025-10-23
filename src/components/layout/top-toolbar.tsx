'use client'

import { DataViewSelector } from '@/components/filters/data-view-selector'
import { CompactTimeFilter } from '@/components/filters/compact-time-filter'
import { CompactOrganizationFilter } from '@/components/filters/compact-organization-filter'
import { TimeProgressIndicator } from '@/components/features/time-progress-indicator'

interface TopToolbarProps {
  rawCount: number
}

export function TopToolbar({ rawCount }: TopToolbarProps) {
  return (
    <div className="space-y-3">
      {/* 数据统计 */}
      <div className="flex items-center gap-4">
        <p className="text-sm text-slate-600">
          已加载{' '}
          <span className="font-semibold text-blue-600">
            {rawCount.toLocaleString()}
          </span>{' '}
          条数据记录
        </p>
      </div>

      {/* 快速视图切换与时间进度一体化区域 */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-3">
          {/* 第一行：周序号和时间进度 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">周序号:</span>
              <CompactTimeFilter />
            </div>

            <div className="w-px h-6 bg-slate-200" />

            <div className="flex-1">
              <TimeProgressIndicator className="border-0 bg-transparent px-0 py-0" />
            </div>
          </div>

          {/* 第二行：数据类型和机构筛选 */}
          <div className="flex items-center gap-6 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">数据类型:</span>
              <DataViewSelector />
            </div>

            <div className="w-px h-6 bg-slate-200" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">机构:</span>
              <CompactOrganizationFilter />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
