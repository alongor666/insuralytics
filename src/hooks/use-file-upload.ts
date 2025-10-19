/**
 * 文件上传钩子 - 优化版
 * 支持批量上传、错误恢复、进度跟踪和性能优化
 */

import { useState, useCallback } from 'react'
import {
  parseCSVFile,
  type CSVParseResult,
  type ProgressCallback,
} from '@/lib/parsers/csv-parser'
import { useAppStore } from '@/store/use-app-store'

/**
 * 上传状态
 */
export type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'validating'
  | 'success'
  | 'error'

/**
 * 文件上传结果
 */
export interface FileUploadResult {
  file: File
  success: boolean
  result?: CSVParseResult
  error?: string
  uploadTime: number
}

/**
 * 批量上传结果
 */
export interface BatchUploadResult {
  totalFiles: number
  successCount: number
  failureCount: number
  results: FileUploadResult[]
  totalTime: number
  totalRecords: number
  validRecords: number
  invalidRecords: number
}

/**
 * 上传进度信息 - 增强版
 */
export interface UploadProgress {
  currentFile: number
  totalFiles: number
  fileName: string
  fileProgress: number
  overallProgress: number
  currentPhase: 'parsing' | 'validating' | 'transforming'
  estimatedTimeRemaining?: number
  processingSpeed?: number
  processedRows: number
  totalRows?: number
  memoryUsage?: number
  errorCount?: number
}

/**
 * 文件验证选项
 */
export interface FileValidationOptions {
  maxFileSize: number // 最大文件大小（字节）
  allowedExtensions: string[] // 允许的文件扩展名
  maxFiles: number // 最大文件数量
  validateFileName: boolean // 是否验证文件名格式
}

/**
 * 默认验证选项
 */
const DEFAULT_VALIDATION_OPTIONS: FileValidationOptions = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedExtensions: ['.csv'],
  maxFiles: 10,
  validateFileName: false, // 文件名不再是强制要求
}

/**
 * 显示通知的辅助函数
 */
const showNotification = (
  type: 'success' | 'warning' | 'error',
  message: string
) => {
  console.log(`[${type.toUpperCase()}] ${message}`)
  // 这里可以集成实际的通知系统
}

/**
 * 文件上传钩子
 */
export function useFileUpload() {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [batchResult, setBatchResult] = useState<BatchUploadResult | null>(null)
  const [validationOptions, setValidationOptions] =
    useState<FileValidationOptions>(DEFAULT_VALIDATION_OPTIONS)

  const { setRawData, setError, setLoading } = useAppStore()

  /**
   * 验证单个文件
   */
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // 检查文件大小
      if (file.size > validationOptions.maxFileSize) {
        return {
          valid: false,
          error: `文件大小超过限制 (${Math.round(validationOptions.maxFileSize / 1024 / 1024)}MB)`,
        }
      }

      // 检查文件扩展名
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!validationOptions.allowedExtensions.includes(extension)) {
        return {
          valid: false,
          error: `不支持的文件格式，仅支持: ${validationOptions.allowedExtensions.join(', ')}`,
        }
      }

      // 可选的文件名验证（不再强制）
      if (validationOptions.validateFileName) {
        const namePattern = /^保险数据_\d{4}年\d{1,2}月.*\.csv$/i
        if (!namePattern.test(file.name)) {
          // 仅显示警告，不阻止上传
          console.warn(
            `文件名建议格式: 保险数据_YYYY年M月_描述.csv，当前: ${file.name}`
          )
        }
      }

      return { valid: true }
    },
    [validationOptions]
  )

  /**
   * 验证文件列表
   */
  const validateFiles = useCallback(
    (files: File[]): { valid: boolean; errors: string[] } => {
      const errors: string[] = []

      // 检查文件数量
      if (files.length > validationOptions.maxFiles) {
        errors.push(`文件数量超过限制 (最多${validationOptions.maxFiles}个)`)
      }

      // 检查重复文件名
      const fileNames = files.map(f => f.name)
      const duplicates = fileNames.filter(
        (name, index) => fileNames.indexOf(name) !== index
      )
      if (duplicates.length > 0) {
        errors.push(
          `发现重复文件: ${Array.from(new Set(duplicates)).join(', ')}`
        )
      }

      // 验证每个文件
      files.forEach((file, index) => {
        const validation = validateFile(file)
        if (!validation.valid) {
          errors.push(`文件 ${index + 1} (${file.name}): ${validation.error}`)
        }
      })

      return {
        valid: errors.length === 0,
        errors,
      }
    },
    [validateFile, validationOptions]
  )

  /**
   * 上传单个文件
   */
  const uploadSingleFile = useCallback(
    async (
      file: File,
      fileIndex: number,
      totalFiles: number
    ): Promise<FileUploadResult> => {
      const startTime = performance.now()

      try {
        // 创建进度回调 - 增强版
        const onProgress: ProgressCallback = progressInfo => {
          const overallProgress =
            (fileIndex / totalFiles) * 100 +
            (progressInfo.percentage / 100) * (100 / totalFiles)

          // 估算内存使用量
          const estimatedMemoryUsage = progressInfo.processedRows 
            ? Math.round((progressInfo.processedRows * 26 * 50) / (1024 * 1024)) // 假设每行26个字段，每字段平均50字符
            : undefined

          setProgress({
            currentFile: fileIndex + 1,
            totalFiles,
            fileName: file.name,
            fileProgress: progressInfo.percentage,
            overallProgress: Math.min(overallProgress, 99),
            currentPhase:
              progressInfo.currentPhase === 'parsing'
                ? 'parsing'
                : progressInfo.currentPhase === 'validating'
                  ? 'validating'
                  : 'transforming',
            estimatedTimeRemaining: progressInfo.estimatedTimeRemaining,
            processingSpeed:
              progressInfo.processedRows > 0
                ? Math.round(
                    progressInfo.processedRows /
                      ((performance.now() - startTime) / 1000)
                  )
                : undefined,
            processedRows: progressInfo.processedRows,
            totalRows: progressInfo.totalRows,
            memoryUsage: estimatedMemoryUsage,
            errorCount: progressInfo.errorCount || 0,
          })
        }

        // 解析文件
        const result = await parseCSVFile(file, onProgress)
        const uploadTime = performance.now() - startTime

        return {
          file,
          success: result.success,
          result,
          uploadTime: Math.round(uploadTime),
        }
      } catch (error) {
        const uploadTime = performance.now() - startTime
        const errorMessage = error instanceof Error ? error.message : '未知错误'

        return {
          file,
          success: false,
          error: errorMessage,
          uploadTime: Math.round(uploadTime),
        }
      }
    },
    []
  )

  /**
   * 批量上传文件 - 支持并行处理
   */
  const uploadFiles = useCallback(
    async (files: File[], parallel = true): Promise<BatchUploadResult> => {
      console.log(
        `[File Upload] 开始上传 ${files.length} 个文件（${parallel ? '并行' : '顺序'}模式）:`,
        files.map(f => f.name)
      )
      const batchStartTime = performance.now()

      try {
        setStatus('uploading')
        setError(null)
        setLoading(true)
        setBatchResult(null)

        // 验证文件
        console.log(`[File Upload] 开始文件验证`)
        const validation = validateFiles(files)
        if (!validation.valid) {
          console.error(`[File Upload] 文件验证失败:`, validation.errors)
          throw new Error(`文件验证失败:\n${validation.errors.join('\n')}`)
        }
        console.log(`[File Upload] 文件验证通过`)

        let results: FileUploadResult[] = []
        let totalRecords = 0
        let validRecords = 0
        let invalidRecords = 0

        // 并行处理模式
        if (parallel && files.length > 1) {
          console.log(`[File Upload] 使用并行处理模式`)
          setStatus('parsing')

          // 使用Promise.all并行处理所有文件
          const uploadPromises = files.map((file, index) =>
            uploadSingleFile(file, index, files.length)
          )

          results = await Promise.all(uploadPromises)
          console.log(`[File Upload] 所有文件并行处理完成`)
        } else {
          // 顺序处理模式（向后兼容）
          console.log(`[File Upload] 使用顺序处理模式`)
          for (let i = 0; i < files.length; i++) {
            const file = files[i]
            console.log(
              `[File Upload] 处理文件 ${i + 1}/${files.length}: ${file.name}`
            )

            setStatus('parsing')
            const result = await uploadSingleFile(file, i, files.length)
            results.push(result)
          }
        }

        // 统计结果
        for (const result of results) {
          console.log(`[File Upload] 文件 ${result.file.name} 处理完成:`, {
            success: result.success,
            error: result.error,
            uploadTime: result.uploadTime,
          })

          // 统计记录数
          if (result.result) {
            totalRecords += result.result.stats.totalRows
            validRecords += result.result.stats.validRows
            invalidRecords += result.result.stats.invalidRows

            console.log(`[File Upload] 文件 ${result.file.name} 统计:`, {
              totalRows: result.result.stats.totalRows,
              validRows: result.result.stats.validRows,
              invalidRows: result.result.stats.invalidRows,
            })
          }

          // 如果有成功的文件，合并数据
          if (result.success && result.result) {
            console.log(
              `[File Upload] 添加 ${result.result.data.length} 条有效记录到存储`
            )
            const existingData = useAppStore.getState().rawData
            const newData = [...existingData, ...result.result.data]
            setRawData(newData)
          } else {
            console.warn(
              `[File Upload] 文件 ${result.file.name} 没有有效数据可添加`
            )
          }
        }

        const totalTime = performance.now() - batchStartTime
        const successCount = results.filter(r => r.success).length
        const failureCount = results.length - successCount

        const batchResult: BatchUploadResult = {
          totalFiles: files.length,
          successCount,
          failureCount,
          results,
          totalTime: Math.round(totalTime),
          totalRecords,
          validRecords,
          invalidRecords,
        }

        setBatchResult(batchResult)

        // 更新最终进度
        setProgress({
          currentFile: files.length,
          totalFiles: files.length,
          fileName: '完成',
          fileProgress: 100,
          overallProgress: 100,
          currentPhase: 'transforming',
          processedRows: totalRecords,
          totalRows: totalRecords,
          errorCount: invalidRecords,
        })

        console.log(`[File Upload] 批量上传完成统计:`, {
          总文件数: files.length,
          成功文件数: successCount,
          失败文件数: failureCount,
          总记录数: totalRecords,
          有效记录数: validRecords,
          无效记录数: invalidRecords,
          总耗时: Math.round(totalTime) + 'ms',
        })

        // 显示结果通知
        if (successCount === files.length) {
          setStatus('success')
          if (invalidRecords > 0) {
            showNotification(
              'warning',
              `成功上传 ${successCount} 个文件，但存在 ${invalidRecords} 条无效记录`
            )
          } else {
            showNotification(
              'success',
              `成功上传 ${successCount} 个文件，共 ${validRecords} 条有效记录`
            )
          }
        } else if (successCount > 0) {
          setStatus('success')
          showNotification(
            'warning',
            `部分成功：${successCount}/${files.length} 个文件上传成功，${invalidRecords} 条无效记录`
          )
        } else {
          setStatus('error')
          console.error('[File Upload] 所有文件上传失败')
          showNotification('error', '所有文件上传失败')
        }

        return batchResult
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '批量上传失败'
        console.error('[File Upload] 批量上传过程中发生错误:', error)
        setError(new Error(errorMessage))
        setStatus('error')
        showNotification('error', errorMessage)

        throw error
      } finally {
        setLoading(false)
        console.log('[File Upload] 上传流程结束')
        // 3秒后清除进度信息
        setTimeout(() => {
          setProgress(null)
        }, 3000)
      }
    },
    [uploadSingleFile, validateFiles, setRawData, setError, setLoading]
  )

  /**
   * 重置上传状态
   */
  const resetUpload = useCallback(() => {
    setStatus('idle')
    setProgress(null)
    setBatchResult(null)
    setError(null)
  }, [setError])

  /**
   * 更新验证选项
   */
  const updateValidationOptions = useCallback(
    (options: Partial<FileValidationOptions>) => {
      setValidationOptions(prev => ({ ...prev, ...options }))
    },
    []
  )

  return {
    // 状态
    status,
    progress,
    batchResult,
    validationOptions,

    // 方法
    uploadFiles,
    validateFile,
    validateFiles,
    resetUpload,
    updateValidationOptions,

    // 计算属性
    isUploading:
      status === 'uploading' || status === 'parsing' || status === 'validating',
    isSuccess: status === 'success',
    isError: status === 'error',
    hasResults: batchResult !== null,
  }
}
