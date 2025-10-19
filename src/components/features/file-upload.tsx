/**
 * 文件上传组件 - 优化版
 * 支持拖拽上传、批量处理、实时进度显示和错误恢复
 */

'use client'

import React, { useState, useCallback } from 'react'
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  RefreshCw,
} from 'lucide-react'
import { useFileUpload } from '@/hooks/use-file-upload'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { UploadResultsDetail } from './upload-results-detail'

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化时间
 */
const formatTime = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [parallelMode, setParallelMode] = useState(true) // 默认启用并行模式

  const {
    status,
    progress,
    batchResult,
    uploadFiles,
    validateFiles,
    resetUpload,
    updateValidationOptions,
    isUploading,
    isSuccess,
    isError,
    hasResults,
  } = useFileUpload()

  const { toast } = useToast()

  // 初始化验证选项
  React.useEffect(() => {
    updateValidationOptions({
      maxFiles: 10,
      maxFileSize: 200 * 1024 * 1024, // 提升到200MB支持大文件
      validateFileName: false, // 文件名不再强制要求
    })
  }, [updateValidationOptions])

  /**
   * 处理拖拽进入
   */
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isUploading) {
        setIsDragging(true)
      }
    },
    [isUploading]
  )

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  /**
   * 处理文件拖拽放置
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (isUploading) return

      const files = Array.from(e.dataTransfer.files).filter(file =>
        file.name.endsWith('.csv')
      )

      if (files.length === 0) {
        toast({
          title: '文件格式错误',
          description: '请上传 CSV 格式的文件',
          variant: 'destructive',
        })
        return
      }

      // 验证文件
      const validation = validateFiles(files)
      if (!validation.valid) {
        toast({
          title: '文件验证失败',
          description: validation.errors.join('\n'),
          variant: 'destructive',
        })
        return
      }

      setSelectedFiles(files)
    },
    [isUploading, validateFiles, toast]
  )

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])

      if (files.length === 0) return

      // 验证文件
      const validation = validateFiles(files)
      if (!validation.valid) {
        toast({
          title: '文件验证失败',
          description: validation.errors.join('\n'),
          variant: 'destructive',
        })
        return
      }

      setSelectedFiles(files)

      // 重置 input
      e.target.value = ''
    },
    [validateFiles, toast]
  )

  /**
   * 开始上传
   */
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return

    try {
      const results = await uploadFiles(selectedFiles, parallelMode)

      // 显示结果通知
      if (results.failureCount === 0) {
        toast({
          title: '上传成功',
          description: `成功上传 ${results.successCount} 个文件，共 ${results.validRecords} 条有效记录`,
        })
      } else if (results.successCount > 0) {
        toast({
          title: '部分成功',
          description: `${results.successCount}/${results.totalFiles} 个文件上传成功`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: '上传失败',
          description: '所有文件上传失败，请检查文件格式',
          variant: 'destructive',
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      toast({
        title: '上传错误',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }, [selectedFiles, uploadFiles, toast, parallelMode])

  /**
   * 重置状态
   */
  const handleReset = useCallback(() => {
    setSelectedFiles([])
    resetUpload()
  }, [resetUpload])

  /**
   * 移除文件
   */
  const removeFile = useCallback(
    (index: number) => {
      if (isUploading) return
      setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    },
    [isUploading]
  )

  // 如果正在上传，显示进度
  if (isUploading && progress) {
    const phaseLabels = {
      uploading: '准备上传',
      parsing: '解析文件',
      validating: '验证数据',
      transforming: '处理数据',
    }

    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800">
              正在处理文件...
            </h3>
            <p className="text-sm text-slate-600">
              {progress.currentFileName} ({progress.currentFile}/
              {progress.totalFiles})
            </p>
            <p className="text-xs text-slate-500">
              {phaseLabels[progress.currentPhase]}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Progress value={progress.overallProgress} className="h-3" />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{Math.round(progress.overallProgress)}%</span>
            <div className="flex items-center gap-2">
              {progress.processingSpeed && (
                <span>{progress.processingSpeed} 记录/秒</span>
              )}
              {progress.estimatedTimeRemaining && (
                <span>剩余 {formatTime(progress.estimatedTimeRemaining)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 如果已完成，显示详细结果
  if (hasResults && batchResult) {
    return (
      <UploadResultsDetail batchResult={batchResult} onReset={handleReset} />
    )
  }

  // 已选择文件但未上传的状态
  if (selectedFiles.length > 0 && !hasResults) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* 文件列表 */}
        <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            已选择的文件 ({selectedFiles.length})
          </h3>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <FileText className="h-5 w-5 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{file.name}</div>
                  <div className="text-sm text-slate-500">
                    {formatFileSize(file.size)}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            ))}
          </div>

          {/* 并行模式开关 */}
          {selectedFiles.length > 1 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="parallel-mode"
                checked={parallelMode}
                onChange={e => setParallelMode(e.target.checked)}
                disabled={isUploading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
              />
              <label
                htmlFor="parallel-mode"
                className="flex-1 text-sm font-medium text-blue-900 cursor-pointer"
              >
                并行处理模式
                <span className="ml-2 text-xs text-blue-700 font-normal">
                  （{parallelMode ? '已启用' : '已禁用'}）
                  {parallelMode
                    ? ` - 同时处理${selectedFiles.length}个文件，速度更快`
                    : ' - 逐个处理文件，更稳定'}
                </span>
              </label>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Upload className="w-5 h-5 mr-2 inline" />
              开始上传 ({selectedFiles.length} 个文件)
            </button>
            <button
              onClick={handleReset}
              disabled={isUploading}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              重新选择
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 默认上传界面
  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 border-dashed p-16 transition-all duration-300',
        isDragging
          ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
          : 'border-slate-300 bg-white/80 backdrop-blur-sm hover:border-blue-400 hover:bg-white/90'
      )}
      onDragEnter={handleDragEnter}
      onDragOver={e => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-6">
          <div
            className={cn(
              'rounded-full p-6 transition-all duration-300',
              isDragging ? 'bg-blue-100 scale-110' : 'bg-slate-100'
            )}
          >
            <Upload
              className={cn(
                'w-16 h-16',
                isDragging ? 'text-blue-600' : 'text-slate-400'
              )}
            />
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-slate-800 mb-2">
          {isDragging ? '松开以上传文件' : '上传 CSV 数据文件'}
        </h2>

        <p className="text-slate-600 mb-8 max-w-md">
          拖拽文件到此处，或点击下方按钮选择文件
          <br />
          <span className="text-sm text-slate-500">
            支持批量上传，文件名格式不再强制要求
          </span>
        </p>

        <label className="cursor-pointer">
          <input
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <div className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            选择文件
          </div>
        </label>

        <p className="text-xs text-slate-500 mt-6">
          最大文件大小：200MB | 支持多文件上传 | 仅支持 CSV 格式 | 支持百万行数据导入
        </p>
      </div>
    </div>
  )
}
