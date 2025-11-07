'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AnalysisTabs, type AnalysisTabValue } from '@/components/layout/analysis-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoalVersionSwitcher } from '@/components/goal-version-switcher'
import { GoalImportExport } from '@/components/goal-import-export'
import { TargetGoalTable } from '@/components/target-goal-table'
import { useGoalStore } from '@/store/goalStore'
import { useAppStore } from '@/store/use-app-store'
import { normalizeChineseText } from '@/lib/utils'
import { formatNumber } from '@/utils/format'
import { formatAchievementRate } from '@/utils/goalCalculator'

export default function TargetsPage() {
  const router = useRouter()
  const rawData = useAppStore(state => state.rawData)
  const setAchievedMap = useGoalStore(state => state.setAchievedMap)
  const initialVersion = useGoalStore(state => state.getInitialVersion())
  const currentVersion = useGoalStore(state => state.getCurrentVersion())
  const achievedMap = useGoalStore(state => state.achievedMap)

  const achievedWanMap = useMemo(() => {
    const aggregatedYuan = new Map<string, number>()
    rawData.forEach(record => {
      const bizType = normalizeChineseText(record.business_type_category)
      if (!bizType) {
        return
      }
      const current = aggregatedYuan.get(bizType) ?? 0
      aggregatedYuan.set(bizType, current + record.signed_premium_yuan)
    })

    const result: Record<string, number> = {}
    initialVersion.rows.forEach(row => {
      const normalized = normalizeChineseText(row.bizType)
      const totalYuan = aggregatedYuan.get(normalized) ?? 0
      result[row.bizType] = Number((totalYuan / 10000).toFixed(2))
    })

    return result
  }, [initialVersion, rawData])

  useEffect(() => {
    setAchievedMap(achievedWanMap)
  }, [achievedWanMap, setAchievedMap])

  const totalInitial = useMemo(
    () => initialVersion.rows.reduce((sum, row) => sum + row.annualTargetInit, 0),
    [initialVersion]
  )
  const totalTuned = useMemo(
    () => currentVersion.rows.reduce((sum, row) => sum + row.annualTargetTuned, 0),
    [currentVersion]
  )
  const totalAchieved = useMemo(
    () =>
      currentVersion.rows.reduce(
        (sum, row) => sum + (achievedMap[row.bizType] ?? 0),
        0
      ),
    [achievedMap, currentVersion]
  )

  const initialAchievementRate = totalInitial === 0 ? null : totalAchieved / totalInitial
  const tunedAchievementRate = totalTuned === 0 ? null : totalAchieved / totalTuned

  const navigateByTab = (tab: AnalysisTabValue) => {
    if (tab === 'targets') return
    router.push(tab === 'kpi' ? '/' : `/?tab=${tab}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/')}
                className="mb-2 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </button>
              <h1 className="text-3xl font-bold text-slate-900">目标管理中心</h1>
              <p className="text-sm text-slate-600">
                统一管理年初目标与微调目标，实时对比达成率与缺口。
              </p>
            </div>
            <AnalysisTabs active="targets" onChange={navigateByTab} />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>版本概览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <GoalVersionSwitcher />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-muted-foreground">年初目标总计（万）</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatNumber(totalInitial, 1)}
                  </p>
                  <p className="text-xs text-muted-foreground">锁定版本</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-muted-foreground">微调目标总计（万）</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatNumber(totalTuned, 1)}
                  </p>
                  <p className="text-xs text-muted-foreground">当前版本</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-muted-foreground">已达成总计（万）</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatNumber(totalAchieved, 1)}
                  </p>
                  <p className="text-xs text-muted-foreground">来源：签单保费累计</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-muted-foreground">年初目标达成率</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatAchievementRate(initialAchievementRate)}
                  </p>
                  <p className="text-xs text-muted-foreground">达成率基于年初口径</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-muted-foreground">微调目标达成率</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatAchievementRate(tunedAchievementRate)}
                  </p>
                  <p className="text-xs text-muted-foreground">达成率基于微调口径</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <GoalImportExport />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>年度目标双轨对比</CardTitle>
          </CardHeader>
          <CardContent>
            <TargetGoalTable />
          </CardContent>
        </Card>

        <div>
          <Button variant="outline" onClick={() => router.push('/')}>
            返回数据总览
          </Button>
        </div>
      </div>
    </div>
  )
}
