/**
 * CSV 导出工具
 * 用于将过滤后的数据导出为 CSV 文件
 */

import { InsuranceRecord } from '@/types/insurance'
import Papa from 'papaparse'

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 文件名（不含扩展名） */
  filename?: string
  /** 是否包含表头 */
  includeHeader?: boolean
  /** 自定义字段顺序（字段名数组） */
  fieldOrder?: string[]
  /** 需要导出的字段（不传则导出全部） */
  fields?: string[]
}

/**
 * 默认字段顺序（按照业务逻辑分组）
 */
const DEFAULT_FIELD_ORDER = [
  // 时间维度
  'snapshot_date',
  'policy_start_year',
  'week_number',

  // 组织维度
  'chengdu_branch',
  'third_level_organization',

  // 客户维度
  'customer_category_3',

  // 产品维度
  'insurance_type',
  'business_type_category',
  'coverage_type',

  // 业务属性
  'renewal_status',
  'is_new_energy_vehicle',
  'is_transferred_vehicle',

  // 评级维度
  'vehicle_insurance_grade',
  'highway_risk_grade',
  'large_truck_score',
  'small_truck_score',

  // 渠道维度
  'terminal_source',

  // 业务指标
  'signed_premium_yuan',
  'matured_premium_yuan',
  'policy_count',
  'claim_case_count',
  'reported_claim_payment_yuan',
  'expense_amount_yuan',
  'commercial_premium_before_discount_yuan',
  'premium_plan_yuan',
  'marginal_contribution_amount_yuan',
]

/**
 * 字段中文名映射
 */
const FIELD_LABELS: Record<string, string> = {
  snapshot_date: '快照日期',
  policy_start_year: '保单年度',
  week_number: '周序号',
  chengdu_branch: '地域',
  third_level_organization: '三级机构',
  customer_category_3: '客户类别',
  insurance_type: '保险类型',
  business_type_category: '业务类型',
  coverage_type: '险别组合',
  renewal_status: '新续转状态',
  is_new_energy_vehicle: '是否新能源',
  is_transferred_vehicle: '是否过户车',
  vehicle_insurance_grade: '车险评级',
  highway_risk_grade: '高速风险等级',
  large_truck_score: '大货车评分',
  small_truck_score: '小货车评分',
  terminal_source: '终端来源',
  signed_premium_yuan: '签单保费(元)',
  matured_premium_yuan: '满期保费(元)',
  policy_count: '保单件数',
  claim_case_count: '赔案件数',
  reported_claim_payment_yuan: '已报告赔款(元)',
  expense_amount_yuan: '费用金额(元)',
  commercial_premium_before_discount_yuan: '商业险折前保费(元)',
  premium_plan_yuan: '保费计划(元)',
  marginal_contribution_amount_yuan: '边际贡献额(元)',
}

/**
 * 将数据导出为 CSV
 */
export function exportToCSV(
  data: InsuranceRecord[],
  options: ExportOptions = {}
): void {
  const {
    filename = `保险数据_${new Date().toISOString().split('T')[0]}`,
    includeHeader = true,
    fieldOrder = DEFAULT_FIELD_ORDER,
    fields,
  } = options

  // 确定要导出的字段
  const exportFields = fields || fieldOrder

  // 如果没有数据，提示用户
  if (data.length === 0) {
    alert('没有数据可导出')
    return
  }

  // 转换数据格式
  const exportData = data.map(record => {
    const row: Record<string, any> = {}
    exportFields.forEach(field => {
      const value = (record as any)[field]
      // 处理布尔值
      if (typeof value === 'boolean') {
        row[field] = value ? 'True' : 'False'
      }
      // 处理 undefined/null
      else if (value === undefined || value === null) {
        row[field] = ''
      }
      // 其他值直接使用
      else {
        row[field] = value
      }
    })
    return row
  })

  // 生成 CSV
  const csv = Papa.unparse(exportData, {
    columns: exportFields,
    header: includeHeader,
  })

  // 下载文件
  downloadCSV(csv, `${filename}.csv`)
}

/**
 * 导出 KPI 汇总数据
 */
export function exportKPISummary(
  kpiData: any,
  filterState: any,
  options: ExportOptions = {}
): void {
  const filename =
    options.filename || `KPI汇总_${new Date().toISOString().split('T')[0]}`

  // 构建 KPI 汇总数据
  const summaryData = [
    {
      指标名称: '满期边际贡献率',
      数值: kpiData.maturedMarginRate
        ? `${kpiData.maturedMarginRate.toFixed(2)}%`
        : '-',
      单位: '%',
    },
    {
      指标名称: '保费达成率',
      数值: kpiData.premiumAchievementRate
        ? `${kpiData.premiumAchievementRate.toFixed(2)}%`
        : '-',
      单位: '%',
    },
    {
      指标名称: '满期赔付率',
      数值: kpiData.maturedClaimRate
        ? `${kpiData.maturedClaimRate.toFixed(2)}%`
        : '-',
      单位: '%',
    },
    {
      指标名称: '费用率',
      数值: kpiData.expenseRate ? `${kpiData.expenseRate.toFixed(2)}%` : '-',
      单位: '%',
    },
    {
      指标名称: '满期率',
      数值: kpiData.maturityRate ? `${kpiData.maturityRate.toFixed(2)}%` : '-',
      单位: '%',
    },
    {
      指标名称: '满期出险率',
      数值: kpiData.maturedClaimFrequency
        ? `${kpiData.maturedClaimFrequency.toFixed(2)}%`
        : '-',
      单位: '%',
    },
    {
      指标名称: '变动成本率',
      数值: kpiData.variableCostRate
        ? `${kpiData.variableCostRate.toFixed(2)}%`
        : '-',
      单位: '%',
    },
    {
      指标名称: '商业险自主系数',
      数值: kpiData.autonomyCoefficient
        ? kpiData.autonomyCoefficient.toFixed(4)
        : '-',
      单位: '小数',
    },
    {
      指标名称: '签单保费',
      数值: kpiData.signedPremium ? kpiData.signedPremium.toFixed(2) : '-',
      单位: '万元',
    },
    {
      指标名称: '满期保费',
      数值: kpiData.maturedPremium ? kpiData.maturedPremium.toFixed(2) : '-',
      单位: '万元',
    },
  ]

  // 添加筛选条件信息
  const filterInfo = [
    { 指标名称: '=== 筛选条件 ===', 数值: '', 单位: '' },
    {
      指标名称: '保单年度',
      数值: filterState.policyYear?.join(', ') || '全部',
      单位: '',
    },
    {
      指标名称: '周序号',
      数值: filterState.weekNumber?.join(', ') || '全部',
      单位: '',
    },
    {
      指标名称: '三级机构',
      数值: filterState.thirdLevelOrganization?.join(', ') || '全部',
      单位: '',
    },
    {
      指标名称: '保险类型',
      数值: filterState.insuranceType?.join(', ') || '全部',
      单位: '',
    },
  ]

  const allData = [...summaryData, ...filterInfo]

  // 生成 CSV
  const csv = Papa.unparse(allData, {
    header: true,
  })

  // 下载文件
  downloadCSV(csv, `${filename}.csv`)
}

/**
 * 下载 CSV 文件
 */
function downloadCSV(csvContent: string, filename: string): void {
  // 添加 UTF-8 BOM，确保 Excel 正确识别中文
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // 释放 URL 对象
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * 导出过滤后的明细数据
 */
export function exportFilteredData(
  data: InsuranceRecord[],
  filterState: any,
  options: ExportOptions = {}
): void {
  const filters = []
  if (filterState.policyYear?.length)
    filters.push(`年度${filterState.policyYear.join(',')}`)
  if (filterState.weekNumber?.length)
    filters.push(`周${filterState.weekNumber.join(',')}`)
  if (filterState.thirdLevelOrganization?.length)
    filters.push(filterState.thirdLevelOrganization.join(','))

  const filterSuffix = filters.length > 0 ? `_${filters.join('_')}` : ''
  const filename =
    options.filename ||
    `保险数据明细${filterSuffix}_${new Date().toISOString().split('T')[0]}`

  exportToCSV(data, {
    ...options,
    filename,
  })
}
