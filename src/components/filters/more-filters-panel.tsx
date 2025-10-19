'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MultiSelectFilter } from './multi-select-filter'
import { useAppStore } from '@/store/use-app-store'
import { filterRecordsWithExclusions } from '@/store/use-app-store'
import { cn, normalizeChineseText } from '@/lib/utils'

/**
 * 更多筛选面板
 * 包含业务维度的详细筛选
 */
export function MoreFiltersPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  )

  const rawData = useAppStore(state => state.rawData)
  const filters = useAppStore(state => state.filters)
  const updateFilters = useAppStore(state => state.updateFilters)

  // 切换展开状态
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // 切换筛选组展开状态
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  // 获取终端来源选项（规范化去重）
  const getTerminalSourceOptions = () => {
    const filtered = filterRecordsWithExclusions(rawData, filters, [
      'terminalSources',
    ])
    const sources = Array.from(
      new Set(filtered.map(record => normalizeChineseText(record.terminal_source)))
    ).sort()
    return sources.map(source => ({ label: source, value: source }))
  }

  // 获取成都分支选项（保持原样，仅展示）
  const getChengduBranchOptions = () => {
    const filtered = filterRecordsWithExclusions(rawData, filters, [])
    const branches = Array.from(
      new Set(filtered.map(record => record.chengdu_branch))
    ).sort()
    return branches.map(branch => ({ label: branch, value: branch }))
  }

  // 获取业务类型选项（规范化去重）
  const getBusinessTypeOptions = () => {
    const filtered = filterRecordsWithExclusions(rawData, filters, [
      'businessTypes',
    ])
    const types = Array.from(
      new Set(filtered.map(record => normalizeChineseText(record.business_type_category)))
    ).sort()
    return types.map(type => ({ label: type, value: type }))
  }

  // 检查是否有活动的筛选器
  const hasActiveMoreFilters = filters.terminalSources.length > 0

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      {/* 头部 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-600" />
          <div>
            <h3 className="font-medium text-slate-900">更多筛选</h3>
            <p className="text-xs text-slate-500">
              {hasActiveMoreFilters
                ? '已应用高级筛选条件'
                : '业务维度的详细筛选'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveMoreFilters && (
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-600" />
          )}
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          <div className="p-4 space-y-4">
            {/* 新能源车筛选 */}
            <div className="space-y-2">
              <label className="text-xs text-slate-600">新能源车状态</label>
              <div className="flex gap-2">
                {[
                  { label: '全部', value: null },
                  { label: '新能源车', value: true },
                  { label: '非新能源车', value: false },
                ].map(option => (
                  <button
                    key={String(option.value)}
                    onClick={() => updateFilters({ isNewEnergy: option.value })}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-md border transition-colors',
                      filters.isNewEnergy === option.value
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 终端来源筛选 */}
            <div className="border border-slate-100 rounded-lg">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSection('terminal-sources')}
              >
                <div>
                  <h4 className="text-sm font-medium text-slate-900">
                    终端来源
                  </h4>
                  <p className="text-xs text-slate-500">
                    业务获取的终端渠道来源
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {filters.terminalSources.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {filters.terminalSources.length}
                    </span>
                  )}
                  {expandedSections.has('terminal-sources') ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </div>

              {expandedSections.has('terminal-sources') && (
                <div className="border-t border-slate-100 p-3">
                  <MultiSelectFilter
                    options={getTerminalSourceOptions()}
                    selectedValues={filters.terminalSources}
                    onChange={values =>
                      updateFilters({ terminalSources: values.map(normalizeChineseText) })
                    }
                    placeholder="选择终端来源"
                    searchPlaceholder="搜索终端来源..."
                    emptyText="未找到终端来源"
                  />
                </div>
              )}
            </div>

            {/* 成都分支筛选 */}
            <div className="border border-slate-100 rounded-lg">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSection('chengdu-branches')}
              >
                <div>
                  <h4 className="text-sm font-medium text-slate-900">
                    成都分支
                  </h4>
                  <p className="text-xs text-slate-500">
                    成都地区的分支机构分类
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {expandedSections.has('chengdu-branches') ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </div>

              {expandedSections.has('chengdu-branches') && (
                <div className="border-t border-slate-100 p-3">
                  <div className="text-xs text-slate-500 mb-2">
                    当前数据：
                    {getChengduBranchOptions()
                      .map(opt => opt.label)
                      .join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* 业务类型分类筛选 */}
            <div className="border border-slate-100 rounded-lg">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSection('business-types')}
              >
                <div>
                  <h4 className="text-sm font-medium text-slate-900">
                    业务类型分类
                  </h4>
                  <p className="text-xs text-slate-500">
                    详细的业务类型分类维度
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {filters.businessTypes.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {filters.businessTypes.length}
                    </span>
                  )}
                  {expandedSections.has('business-types') ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </div>

              {expandedSections.has('business-types') && (
                <div className="border-t border-slate-100 p-3">
                  <MultiSelectFilter
                    options={getBusinessTypeOptions()}
                    selectedValues={filters.businessTypes}
                    onChange={values =>
                      updateFilters({ businessTypes: values.map(normalizeChineseText) })
                    }
                    placeholder="选择业务类型"
                    searchPlaceholder="搜索业务类型..."
                    emptyText="未找到业务类型"
                  />
                </div>
              )}
            </div>

            {/* 说明文字 */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-600">
                💡 更多筛选功能正在开发中，将逐步支持更多业务维度的筛选条件
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
