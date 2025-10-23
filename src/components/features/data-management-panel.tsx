/**
 * 数据管理面板 - 包含数据导入、导出、历史记录和清空功能
 */

'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from './file-upload'
import { UploadHistory } from './upload-history'
import { DataExport } from './data-export'
import { PDFReportExport } from './pdf-report-export'
import { useAppStore } from '@/store/use-app-store'
import { usePersistData } from '@/hooks/use-persist-data'
import { Database, History, Download, Trash2 } from 'lucide-react'

export function DataManagementPanel() {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'history'>('upload')
  const { clearPersistedData } = usePersistData()
  const rawData = useAppStore(state => state.rawData)

  const handleClearData = () => {
    if (
      confirm('确定要清空当前数据并重新开始吗?此操作将清除所有缓存的数据。')
    ) {
      useAppStore.getState().clearData()
      clearPersistedData()
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-slate-800">导入导出</h2>
            <p className="text-sm text-slate-600 mt-1">
              管理数据导入、导出和历史记录
            </p>
          </div>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-3">
          <DataExport />
          <PDFReportExport />
          {rawData.length > 0 && (
            <button
              onClick={handleClearData}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              清空数据
            </button>
          )}
        </div>
      </div>

      {/* 主内容区 - 子标签页 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'upload' | 'history')}>
          <div className="border-b border-slate-200 px-6 pt-4">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="upload" className="gap-2">
                <Database className="w-4 h-4" />
                数据导入
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                导入记录
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload" className="p-6 m-0">
            <FileUpload />
          </TabsContent>

          <TabsContent value="history" className="p-6 m-0">
            <UploadHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
