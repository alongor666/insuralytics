/**
 * 车险数据分析 - 核心类型定义
 */

// ============= 枚举类型定义 =============

/**
 * 三级机构枚举
 */
export enum ThirdLevelOrganization {
  HEADQUARTERS = '本部',
  DAZHOU = '达州',
  DEYANG = '德阳',
  GAOXIN = '高新',
  LESHAN = '乐山',
  LUZHOU = '泸州',
  QINGYANG = '青羊',
  TIANFU = '天府',
  WUHOU = '武侯',
  XINDU = '新都',
  YIBIN = '宜宾',
  ZIYANG = '资阳',
  ZIGONG = '自贡',
}

/**
 * 保险类型
 */
export type InsuranceType = '商业险' | '交强险'

/**
 * 险别组合
 */
export type CoverageType = '主全' | '交三' | '单交'

/**
 * 新续转状态
 */
export type RenewalStatus = '新保' | '续保' | '转保'

/**
 * 车险评级
 */
export type VehicleInsuranceGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'X'

/**
 * 高速风险等级
 */
export type HighwayRiskGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X'

/**
 * 货车评分
 */
export type TruckScore = 'A' | 'B' | 'C' | 'D' | 'E' | 'X'

// ============= 数据记录类型 =============

/**
 * 保险记录接口 - 单条数据记录
 */
export interface InsuranceRecord {
  // 时间维度
  snapshot_date: string // 快照日期 YYYY-MM-DD
  policy_start_year: number // 保单年度
  week_number: number // 周序号 1-105

  // 组织维度
  chengdu_branch: '成都' | '中支' // 地域属性
  third_level_organization: string // 三级机构

  // 客户维度
  customer_category_3: string // 客户类型

  // 产品维度
  insurance_type: InsuranceType
  business_type_category: string // 业务类型
  coverage_type: CoverageType // 险别组合

  // 业务属性
  renewal_status: RenewalStatus
  is_new_energy_vehicle: boolean // 是否新能源
  is_transferred_vehicle: boolean // 是否过户车

  // 评级维度
  vehicle_insurance_grade: VehicleInsuranceGrade // 车险评级 A-G/X
  highway_risk_grade: HighwayRiskGrade // 高速风险等级
  large_truck_score: TruckScore // 大货车评分
  small_truck_score: TruckScore // 小货车评分

  // 渠道维度
  terminal_source: string // 终端来源

  // 业务指标（绝对值，单位：元）
  signed_premium_yuan: number // 签单保费 ≥0
  matured_premium_yuan: number // 满期保费 ≥0
  policy_count: number // 保单件数 ≥0
  claim_case_count: number // 赔案件数 ≥0
  reported_claim_payment_yuan: number // 已报告赔款 ≥0
  expense_amount_yuan: number // 费用金额 ≥0
  commercial_premium_before_discount_yuan: number // 商业险折前保费 ≥0
  premium_plan_yuan: number | null // 保费计划（可选）
  marginal_contribution_amount_yuan: number // 边际贡献额（可负）
}

// ============= KPI 类型定义 =============

/**
 * KPI 计算结果
 */
export interface KPIResult {
  // 率值指标
  loss_ratio: number | null // 满期赔付率
  premium_progress: number | null // 保费达成率
  maturity_ratio: number | null // 满期率
  expense_ratio: number | null // 费用率
  contribution_margin_ratio: number | null // 满期边际贡献率
  variable_cost_ratio: number | null // 变动成本率
  matured_claim_ratio: number | null // 满期出险率
  autonomy_coefficient: number | null // 商业险自主系数

  // 绝对值指标（万元）
  signed_premium: number // 签单保费
  matured_premium: number // 满期保费
  policy_count: number // 保单件数
  claim_case_count: number // 赔案件数
  reported_claim_payment: number // 已报告赔款
  expense_amount: number // 费用金额
  contribution_margin_amount: number // 边际贡献额

  // 均值指标（元）
  average_premium: number | null // 单均保费
  average_claim: number | null // 案均赔款
  average_expense: number | null // 单均费用
}

/**
 * KPI 对比结果
 */
export interface KPIComparison {
  type: 'yoy' | 'mom' | 'custom'
  baseline: KPIResult
  changes: {
    [key: string]: {
      absolute: number // 绝对变化值
      relative: number // 相对变化率（%）
      direction: 'up' | 'down' | 'flat'
    }
  }
}

/**
 * 完整的 KPI 响应
 */
export interface KPIResponse {
  filters: FilterState
  kpis: KPIResult
  comparison?: KPIComparison
  meta: {
    calculationTime: number // 计算耗时（ms）
    recordCount: number // 参与计算的记录数
    cacheHit: boolean // 是否命中缓存
    timestamp: string // 计算时间戳
  }
}

// ============= 筛选器类型 =============

/**
 * 筛选器状态
 */
export interface FilterState {
  // 时间筛选
  viewMode: 'single' | 'trend' // 分析模式
  policyYear?: number
  weekNumbers?: number[] // 单周或多周

  // 空间筛选
  organizations?: string[] // 三级机构

  // 产品筛选
  insuranceTypes?: InsuranceType[]
  businessTypes?: string[]
  coverageTypes?: CoverageType[]

  // 客户筛选
  customerCategories?: string[]
  vehicleGrades?: VehicleInsuranceGrade[]

  // 渠道筛选
  terminalSources?: string[]
  isNewEnergy?: boolean | null
  renewalStatuses?: RenewalStatus[]
}

// ============= 聚合结果类型 =============

/**
 * 基础聚合结果
 */
export interface BaseAggregation {
  signed_premium_yuan: number
  matured_premium_yuan: number
  policy_count: number
  claim_case_count: number
  reported_claim_payment_yuan: number
  expense_amount_yuan: number
  commercial_premium_before_discount_yuan: number
  premium_plan_yuan: number
  marginal_contribution_amount_yuan: number
}

/**
 * 聚合结果（带 KPI）
 */
export interface AggregationResult extends BaseAggregation, KPIResult {}

// ============= 数据验证类型 =============

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  index?: number
  data?: InsuranceRecord
  errors?: Array<{
    field: string
    message: string
    code: string
  }>
}

/**
 * 批量验证结果
 */
export interface BatchValidationResult {
  totalRecords: number
  validRecords: number
  invalidRecords: ValidationResult[]
  validData: InsuranceRecord[]
}
