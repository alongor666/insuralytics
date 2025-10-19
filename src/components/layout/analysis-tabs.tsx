'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type AnalysisTabValue =
  | 'kpi'
  | 'trend'
  | 'thematic'
  | 'multichart'
  | 'targets'

interface AnalysisTabsProps {
  active: AnalysisTabValue
  onChange: (value: AnalysisTabValue) => void
}

const TAB_ITEMS: Array<{ value: AnalysisTabValue; label: string }> = [
  { value: 'kpi', label: 'KPI看板' },
  { value: 'trend', label: '多周趋势' },
  { value: 'thematic', label: '专题分析' },
  { value: 'multichart', label: '多维图表' },
  { value: 'targets', label: '目标管理' },
]

export function AnalysisTabs({ active, onChange }: AnalysisTabsProps) {
  return (
    <Tabs
      value={active}
      onValueChange={value => onChange(value as AnalysisTabValue)}
    >
      <TabsList>
        {TAB_ITEMS.map(item => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
