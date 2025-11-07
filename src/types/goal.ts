/**
 * 目标管理类型定义
 * INIT 表示年初目标（锁定版本），TUNED 表示微调目标版本
 */

export type GoalVersionType = 'INIT' | 'TUNED'

export interface GoalRow {
  bizType: string
  annualTargetInit: number
  annualTargetTuned: number
  achieved: number
  shareOfTotal?: number
}

export interface GoalVersion {
  id: string
  type: GoalVersionType
  createdAt: string
  locked: boolean
  rows: Array<Pick<GoalRow, 'bizType' | 'annualTargetInit' | 'annualTargetTuned'>>
}

export interface GoalState {
  baseYear: number
  versions: GoalVersion[]
  currentVersionId: string
  achievedMap: Record<string, number>
}

export interface GoalSnapshot {
  versions: GoalVersion[]
  currentVersionId: string
}

export type UnknownBusinessStrategy = 'block' | 'ignore'

export interface GoalCsvRow {
  bizType: string
  annualTarget: number
}

export interface GoalCsvParseOptions {
  knownBusinessTypes: string[]
  unknownBusinessStrategy?: UnknownBusinessStrategy
}

export interface GoalCsvParseResult {
  rows: GoalCsvRow[]
  ignoredUnknownCount: number
}

export interface CsvIssue {
  type:
    | 'MISSING_COLUMN'
    | 'EMPTY_VALUE'
    | 'NON_NUMERIC'
    | 'NEGATIVE_VALUE'
    | 'DUPLICATE_BIZ_TYPE'
    | 'UNKNOWN_BIZ_TYPE'
  message: string
  rowIndex?: number
  bizType?: string
  rawValue?: string
}

export class GoalCsvParseError extends Error {
  issues: CsvIssue[]

  constructor(message: string, issues: CsvIssue[]) {
    super(message)
    this.name = 'GoalCsvParseError'
    this.issues = issues
  }
}
