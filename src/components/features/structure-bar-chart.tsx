'use client'

import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import {
  useOrganizationStructure,
  useProductStructure,
} from '@/hooks/use-aggregation'
import { formatNumber } from '@/utils/format'

// 使用React.memo优化组件性能
export const StructureBarChart = React.memo(function StructureBarChart() {
  const [mode, setMode] = useState<'org' | 'product'>('org')
  const orgData = useOrganizationStructure()
  const prodData = useProductStructure()

  // 图例联动：控制系列显隐
  const [visible, setVisible] = useState({ signed: true, matured: true })
  const [activeSeries, setActiveSeries] = useState<null | 'signed' | 'matured'>(
    null
  )

  // 排序 + TopN 控件
  const [sortBy, setSortBy] = useState<'matured' | 'signed' | 'count'>(
    'matured'
  )
  const [topN, setTopN] = useState<number>(12)

  const raw = mode === 'org' ? orgData : prodData

  // 使用useMemo优化数据处理
  const data = useMemo(() => {
    const list = [...raw]
    list.sort((a, b) => {
      if (sortBy === 'matured')
        return b.matured_premium_10k - a.matured_premium_10k
      if (sortBy === 'signed')
        return b.signed_premium_10k - a.signed_premium_10k
      return b.policy_count - a.policy_count
    })
    return list.slice(0, Math.max(1, Math.min(50, topN)))
  }, [raw, sortBy, topN])

  // 事件处理函数
  const handleModeChange = (newMode: 'org' | 'product') => {
    setMode(newMode)
  }

  const handleSortChange = (newSort: 'matured' | 'signed' | 'count') => {
    setSortBy(newSort)
  }

  const handleTopNChange = (newTopN: number) => {
    setTopN(newTopN)
  }

  if (!data || data.length === 0) return null

  const chartId = mode === 'org' ? 'organization-chart' : 'product-chart'

  return (
    <div
      id={chartId}
      className="rounded-2xl border border-white/50 bg-white/40 p-6 shadow-lg backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">结构分布</h3>
          <p className="text-xs text-slate-500">满期保费（万元） Top 排序</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`px-2 py-1 text-xs rounded border ${mode === 'org' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-700'}`}
            onClick={() => setMode('org')}
          >
            机构
          </button>
          <button
            className={`px-2 py-1 text-xs rounded border ${mode === 'product' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-700'}`}
            onClick={() => setMode('product')}
          >
            产品
          </button>
          <div className="ml-3 flex items-center gap-2 text-xs">
            <label className="text-slate-600">排序</label>
            <select
              className="border border-slate-300 rounded px-2 py-1 bg-white"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="matured">满期保费</option>
              <option value="signed">签单保费</option>
              <option value="count">保单件数</option>
            </select>
            <label className="ml-3 text-slate-600">Top</label>
            <input
              type="number"
              min={1}
              max={50}
              value={topN}
              onChange={e => setTopN(Number(e.target.value) || 1)}
              className="w-16 border border-slate-300 rounded px-2 py-1"
            />
          </div>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              tickFormatter={v => formatNumber(v as number, 0)}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={(val: any) => formatNumber(val as number, 2)} />
            <Legend
              onClick={(e: any) => {
                const name: string = e?.value || ''
                const key = name.includes('满期') ? 'matured' : 'signed'
                setVisible(v => ({ ...v, [key]: !v[key as keyof typeof v] }))
              }}
              onMouseEnter={(e: any) => {
                const name: string = e?.value || ''
                setActiveSeries(name.includes('满期') ? 'matured' : 'signed')
              }}
              onMouseLeave={() => setActiveSeries(null)}
            />
            <Bar
              dataKey="matured_premium_10k"
              name="满期保费(万)"
              fill="#0ea5e9"
              fillOpacity={activeSeries && activeSeries !== 'matured' ? 0.5 : 1}
              hide={!visible.matured}
            />
            <Bar
              dataKey="signed_premium_10k"
              name="签单保费(万)"
              fill="#1d4ed8"
              fillOpacity={activeSeries && activeSeries !== 'signed' ? 0.5 : 1}
              hide={!visible.signed}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
