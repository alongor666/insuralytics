'use client'

import { Database, TrendingUp, FileText, SlidersHorizontal } from 'lucide-react'
import { FileUpload } from '@/components/features/file-upload'
import { CompactKPIDashboard } from '@/components/features/compact-kpi-dashboard'
import { TrendChart } from '@/components/features/trend-chart'
import { StructureBarChart } from '@/components/features/structure-bar-chart'
import { DistributionPieChart } from '@/components/features/distribution-pie-chart'
import { ComparisonAnalysisPanel } from '@/components/features/comparison-analysis'
// 移除页面内直接使用的导出组件，改由 TopToolbar 使用
// import { DataExport } from '@/components/features/data-export'
import { CustomerSegmentationBubble } from '@/components/features/customer-segmentation-bubble'
import { ExpenseHeatmap } from '@/components/features/expense-heatmap'
// import { PDFReportExport } from '@/components/features/pdf-report-export'
import { ThematicAnalysis } from '@/components/features/thematic-analysis'
import { FilterPanel } from '@/components/filters/filter-panel'
// import { ViewModeSelector } from '@/components/filters/view-mode-selector'
// import { DataViewSelector } from '@/components/filters/data-view-selector'
// import { CompactTimeFilter } from '@/components/filters/compact-time-filter'
// import { CompactOrganizationFilter } from '@/components/filters/compact-organization-filter'
import {
  FilterInteractionManager,
  useFilterPersistence,
} from '@/components/filters/filter-interaction-manager'
import { TopToolbar } from '@/components/layout/top-toolbar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/toaster'
import { useAppStore } from '@/store/use-app-store'
import { useKPI } from '@/hooks/use-kpi'
import { usePersistData } from '@/hooks/use-persist-data'
import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const rawData = useAppStore(state => state.rawData)
  const isLoading = useAppStore(state => state.isLoading)
  const viewMode = useAppStore(state => state.viewMode)
  const setViewMode = useAppStore(state => state.setViewMode)
  const kpiData = useKPI()
  const [showFilters, setShowFilters] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'kpi' | 'trend' | 'thematic' | 'multichart'>('kpi')
  const resetFilters = useAppStore(state => state.resetFilters)

  // 使用数据持久化
  const { clearPersistedData } = usePersistData()

  // 使用筛选器状态持久化
  useFilterPersistence()

  // 判断是否有数据
  const hasData = rawData.length > 0

  // 计算时间进度（当前年度已过天数占365天的百分比）
  const timeProgress = useMemo(() => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const daysPassed = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    )
    return (daysPassed / 365) * 100
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen p-8">
      {/* 筛选器交互管理器 - 不渲染UI，只处理逻辑 */}
      <FilterInteractionManager />

      {/* 头部 */}
      <header className="mb-8">
        <div className="max-w-7xl mx-auto">
          {/* 标题行 */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  车险多维数据分析平台
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  数据驱动决策 · 智能洞察业务 · 可视化分析
                </p>
              </div>
            </div>
            {/* 分析模式切换 - 移除，改由顶部标签页控制 */}
            {/* {hasData && <ViewModeSelector />} */}
          </div>

          {/* 统一导航 Tabs，驱动内容与视图模式 */}
          {hasData && (
            <div className="mb-4">
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  const tab = v as 'kpi' | 'trend' | 'thematic' | 'multichart'
                  setActiveTab(tab)
                  setViewMode(tab === 'trend' ? 'trend' : 'single')
                }}
              >
                <TabsList>
                  <TabsTrigger value="kpi">KPI看板</TabsTrigger>
                  <TabsTrigger value="trend">多周趋势</TabsTrigger>
                  <TabsTrigger value="thematic">专题分析</TabsTrigger>
                  <TabsTrigger value="multichart">多维图表</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* 顶部工具栏 - 放置在统一导航之下 */}
          {hasData && (
            <TopToolbar
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              rawCount={rawData.length}
            />
          )}
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto">
        {!hasData && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 bg-white/60 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-slate-600" />
              <h2 className="text-xl font-semibold text-slate-800">
                上传数据文件以开始分析
              </h2>
            </div>
            <div className="mt-6">
              <FileUpload />
            </div>
          </div>
        )}

        {hasData && (
          <div className="space-y-8">
            {/* KPI 看板 */}
            {activeTab === 'kpi' && <CompactKPIDashboard kpiData={kpiData} />}

            {/* 多周趋势分析 */}
            {activeTab === 'trend' && <TrendChart />}

            {/* 专题分析模块 */}
            {activeTab === 'thematic' && (
              <div className="space-y-8">
                <ThematicAnalysis currentKpis={kpiData} timeProgress={timeProgress} compact={false} />
                <CustomerSegmentationBubble />
                <ExpenseHeatmap />
              </div>
            )}

            {/* 多维图表展示 */}
            {activeTab === 'multichart' && (
              <div className="space-y-8">
                <StructureBarChart />
                <DistributionPieChart />
                <ComparisonAnalysisPanel />
              </div>
            )}

            {/* 说明区块 */}
            <div className="rounded-2xl border border-slate-200 p-6 bg-white/60 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                数据可视化
              </h3>
              <p className="text-sm text-slate-600">
                趋势图表、结构分析，让数据洞察更直观易懂
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 浮层筛选面板：使用对话框，带遮罩与居中大尺寸布局 */}
      {hasData && (
        <Dialog open={showFilters} onOpenChange={setShowFilters}>
          <DialogContent className="max-w-6xl w-[92vw] h-[80vh] sm:rounded-2xl bg-white/95">
            <DialogHeader>
              <DialogTitle>业务维度筛选</DialogTitle>
              <DialogDescription>集中筛选，不打扰主页面浏览</DialogDescription>
            </DialogHeader>
            <div className="overflow-auto h-[calc(80vh-8rem)]">
              <FilterPanel />
            </div>
            <DialogFooter>
              <div className="flex items-center justify-end gap-3 w-full">
                <Button variant="outline" onClick={resetFilters}>重置筛选</Button>
                <Button onClick={() => setShowFilters(false)}>关闭</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Toaster />
    </div>
  )
}
