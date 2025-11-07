/**
 * 目标管理状态存储
 * 使用 Zustand（状态管理库）统一维护年度目标的版本、导入、导出与撤销
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  GoalCsvRow,
  GoalSnapshot,
  GoalState,
  GoalVersion,
} from '@/types/goal'

interface GoalStore extends GoalState {
  history: GoalSnapshot[]
  getInitialVersion: () => GoalVersion
  getCurrentVersion: () => GoalVersion
  setAchievedMap: (achieved: Record<string, number>) => void
  updateAchievedValue: (bizType: string, value: number) => void
  switchVersion: (versionId: string) => void
  createTunedVersion: (rows: GoalCsvRow[], importedAt?: Date) => {
    versionId: string
  }
  exportVersionCsv: (versionId: string) => string
  exportCurrentVersionCsv: () => string
  undo: () => void
}

const BASE_YEAR = 2025

const INITIAL_TARGETS: Array<{ bizType: string; annualTarget: number }> = [
  { bizType: '车险整体', annualTarget: 43100 },
  { bizType: '10吨以上-普货', annualTarget: 450 },
  { bizType: '10吨以上-牵引', annualTarget: 2100 },
  { bizType: '1吨以上非营业货车', annualTarget: 1000 },
  { bizType: '1吨以下非营业货车', annualTarget: 1600 },
  { bizType: '2-9吨营业货车', annualTarget: 600 },
  { bizType: '2吨以下营业货车', annualTarget: 1500 },
  { bizType: '9-10吨营业货车', annualTarget: 250 },
  { bizType: '出租车', annualTarget: 100 },
  { bizType: '非营业客车旧车非过户', annualTarget: 27000 },
  { bizType: '非营业客车旧车过户车', annualTarget: 4000 },
  { bizType: '非营业客车新车', annualTarget: 1400 },
  { bizType: '摩托车', annualTarget: 1700 },
  { bizType: '其他', annualTarget: 100 },
  { bizType: '特种车', annualTarget: 100 },
  { bizType: '网约车', annualTarget: 300 },
  { bizType: '自卸', annualTarget: 900 },
]

const INITIAL_VERSION_ID = `${BASE_YEAR}-年初目标`

const createInitialVersion = (): GoalVersion => ({
  id: INITIAL_VERSION_ID,
  type: 'INIT',
  createdAt: new Date(`${BASE_YEAR}-01-01T00:00:00.000Z`).toISOString(),
  locked: true,
  rows: INITIAL_TARGETS.map(target => ({
    bizType: target.bizType,
    annualTargetInit: target.annualTarget,
    annualTargetTuned: target.annualTarget,
  })),
})

const buildInitialAchievedMap = (version: GoalVersion): Record<string, number> => {
  const map: Record<string, number> = {}
  version.rows.forEach(row => {
    map[row.bizType] = 0
  })
  return map
}

const createInitialState = () => {
  const initialVersion = createInitialVersion()
  return {
    baseYear: BASE_YEAR,
    versions: [initialVersion],
    currentVersionId: INITIAL_VERSION_ID,
    achievedMap: buildInitialAchievedMap(initialVersion),
    history: [] as GoalSnapshot[],
  }
}

const cloneSnapshot = (snapshot: GoalSnapshot): GoalSnapshot => ({
  currentVersionId: snapshot.currentVersionId,
  versions: snapshot.versions.map(version => ({
    ...version,
    rows: version.rows.map(row => ({ ...row })),
  })),
})

const buildSnapshot = (state: GoalState): GoalSnapshot => ({
  currentVersionId: state.currentVersionId,
  versions: state.versions.map(version => ({
    ...version,
    rows: version.rows.map(row => ({ ...row })),
  })),
})

const generateVersionName = (existing: GoalVersion[], baseYear: number, importedAt: Date): string => {
  const dateLabel = `${importedAt.getFullYear()}${`${importedAt.getMonth() + 1}`.padStart(2, '0')}${`${importedAt.getDate()}`.padStart(2, '0')}`
  const baseName = `${baseYear}-微调目标-${dateLabel}`
  let candidate = baseName
  let counter = 2
  while (existing.some(version => version.id === candidate)) {
    candidate = `${baseName}_#${counter}`
    counter += 1
  }
  return candidate
}

const serializeVersionToCsv = (version: GoalVersion): string => {
  const lines = ['业务类型,年度目标（万）']
  version.rows.forEach(row => {
    const value = version.type === 'INIT' ? row.annualTargetInit : row.annualTargetTuned
    lines.push(`${row.bizType},${value}`)
  })
  return `${lines.join('\n')}\n`
}

export const KNOWN_BUSINESS_TYPES = INITIAL_TARGETS.map(item => item.bizType)

export const useGoalStore = create<GoalStore>()(
  devtools((set, get) => ({
    ...createInitialState(),

    getInitialVersion: () => {
      const { versions } = get()
      const initVersion = versions.find(version => version.type === 'INIT')
      if (!initVersion) {
        throw new Error('缺少年初目标版本，请检查初始化数据')
      }
      return initVersion
    },

    getCurrentVersion: () => {
      const { versions, currentVersionId } = get()
      const version = versions.find(item => item.id === currentVersionId)
      if (!version) {
        throw new Error('当前版本不存在，请重新选择版本')
      }
      return version
    },

    setAchievedMap: achieved => {
      set(state => ({
        achievedMap: {
          ...state.achievedMap,
          ...achieved,
        },
      }))
    },

    updateAchievedValue: (bizType, value) => {
      set(state => ({
        achievedMap: {
          ...state.achievedMap,
          [bizType]: value,
        },
      }))
    },

    switchVersion: versionId => {
      set(state => {
        if (!state.versions.some(version => version.id === versionId)) {
          return state
        }
        return {
          ...state,
          currentVersionId: versionId,
        }
      })
    },

    createTunedVersion: (rows, importedAt = new Date()) => {
      const state = get()
      const initVersion = state.versions.find(version => version.type === 'INIT')
      if (!initVersion) {
        throw new Error('缺少年初目标版本，无法创建微调目标')
      }

      const importedMap = new Map(rows.map(row => [row.bizType, row.annualTarget]))
      const missingBizTypes = initVersion.rows
        .filter(row => !importedMap.has(row.bizType))
        .map(row => row.bizType)

      if (missingBizTypes.length > 0) {
        throw new Error(`导入失败，缺少以下业务类型：${missingBizTypes.join('、')}`)
      }

      const newRows = initVersion.rows.map(row => ({
        bizType: row.bizType,
        annualTargetInit: row.annualTargetInit,
        annualTargetTuned: importedMap.get(row.bizType) ?? row.annualTargetTuned,
      }))

      const snapshot = buildSnapshot(state)
      const versionId = generateVersionName(state.versions, state.baseYear, importedAt)

      const newVersion: GoalVersion = {
        id: versionId,
        type: 'TUNED',
        createdAt: importedAt.toISOString(),
        locked: false,
        rows: newRows,
      }

      set({
        versions: [...state.versions, newVersion],
        currentVersionId: versionId,
        achievedMap: { ...state.achievedMap },
        history: [...state.history, cloneSnapshot(snapshot)],
      })

      return { versionId }
    },

    exportVersionCsv: versionId => {
      const { versions } = get()
      const version = versions.find(item => item.id === versionId)
      if (!version) {
        throw new Error(`未找到指定版本：${versionId}`)
      }
      return serializeVersionToCsv(version)
    },

    exportCurrentVersionCsv: () => {
      const { currentVersionId } = get()
      return get().exportVersionCsv(currentVersionId)
    },

    undo: () => {
      const state = get()
      if (state.history.length === 0) {
        return
      }
      const history = [...state.history]
      const snapshot = history.pop()!
      set({
        versions: snapshot.versions,
        currentVersionId: snapshot.currentVersionId,
        history,
      })
    },
  }))
)

export const resetGoalStore = () => {
  const initialVersion = createInitialVersion()
  useGoalStore.setState({
    baseYear: BASE_YEAR,
    versions: [initialVersion],
    currentVersionId: INITIAL_VERSION_ID,
    achievedMap: buildInitialAchievedMap(initialVersion),
    history: [],
  })
}
