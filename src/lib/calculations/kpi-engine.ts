/**
 * KPI 计算引擎
 * 实现所有核心指标的计算逻辑
 */

import type { InsuranceRecord, KPIResult } from '@/types/insurance'

/**
 * 基础聚合数据
 */
interface BaseAggregation {
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

interface KPIComputationOptions {
  premiumTargetYuan?: number | null
  policyCountTarget?: number | null
}

/**
 * 安全除法 - 防止除零错误
 * @param numerator 分子
 * @param denominator 分母
 * @returns 计算结果，除零时返回 null
 */
function safeDivide(numerator: number, denominator: number): number | null {
  if (!denominator || denominator === 0) {
    return null
  }
  return numerator / denominator
}

/**
 * 聚合原始数据
 * @param records 保险记录数组
 * @returns 聚合后的基础数据
 */
function aggregateData(records: InsuranceRecord[]): BaseAggregation {
  return records.reduce(
    (acc, record) => {
      acc.signed_premium_yuan += record.signed_premium_yuan
      acc.matured_premium_yuan += record.matured_premium_yuan
      acc.policy_count += record.policy_count
      acc.claim_case_count += record.claim_case_count
      acc.reported_claim_payment_yuan += record.reported_claim_payment_yuan
      acc.expense_amount_yuan += record.expense_amount_yuan
      acc.commercial_premium_before_discount_yuan +=
        record.commercial_premium_before_discount_yuan
      acc.premium_plan_yuan += record.premium_plan_yuan || 0
      acc.marginal_contribution_amount_yuan +=
        record.marginal_contribution_amount_yuan
      return acc
    },
    {
      signed_premium_yuan: 0,
      matured_premium_yuan: 0,
      policy_count: 0,
      claim_case_count: 0,
      reported_claim_payment_yuan: 0,
      expense_amount_yuan: 0,
      commercial_premium_before_discount_yuan: 0,
      premium_plan_yuan: 0,
      marginal_contribution_amount_yuan: 0,
    }
  )
}

/**
 * 计算 KPI 指标
 * @param aggregated 聚合后的基础数据
 * @returns KPI 计算结果
 */
function computeKPIs(
  aggregated: BaseAggregation,
  options: KPIComputationOptions = {}
): KPIResult {
  const premiumTargetYuan =
    typeof options.premiumTargetYuan === 'number'
      ? Math.max(0, options.premiumTargetYuan)
      : null
  const policyCountTarget =
    typeof options.policyCountTarget === 'number'
      ? Math.max(0, Math.round(options.policyCountTarget))
      : null

  const premiumPlanYuan =
    premiumTargetYuan !== null ? premiumTargetYuan : aggregated.premium_plan_yuan

  // ============= 率值指标计算 =============

  // 满期赔付率 = 已报告赔款 / 满期保费 * 100
  const loss_ratio =
    safeDivide(
      aggregated.reported_claim_payment_yuan,
      aggregated.matured_premium_yuan
    ) !== null
      ? safeDivide(
          aggregated.reported_claim_payment_yuan,
          aggregated.matured_premium_yuan
        )! * 100
      : null

  // 费用率 = 费用金额 / 签单保费 * 100
  const expense_ratio =
    safeDivide(
      aggregated.expense_amount_yuan,
      aggregated.signed_premium_yuan
    ) !== null
      ? safeDivide(
          aggregated.expense_amount_yuan,
          aggregated.signed_premium_yuan
        )! * 100
      : null

  // 满期率 = 满期保费 / 签单保费 * 100
  const maturity_ratio =
    safeDivide(
      aggregated.matured_premium_yuan,
      aggregated.signed_premium_yuan
    ) !== null
      ? safeDivide(
          aggregated.matured_premium_yuan,
          aggregated.signed_premium_yuan
        )! * 100
      : null

  // 满期边际贡献率 = 边际贡献额 / 满期保费 * 100
  const contribution_margin_ratio =
    safeDivide(
      aggregated.marginal_contribution_amount_yuan,
      aggregated.matured_premium_yuan
    ) !== null
      ? safeDivide(
          aggregated.marginal_contribution_amount_yuan,
          aggregated.matured_premium_yuan
        )! * 100
      : null

  // 变动成本率 = 费用率 + 满期赔付率
  const variable_cost_ratio =
    expense_ratio !== null && loss_ratio !== null
      ? expense_ratio + loss_ratio
      : null

  // 满期出险率 = (赔案件数 / 保单件数) * 满期率
  const claim_ratio = safeDivide(
    aggregated.claim_case_count,
    aggregated.policy_count
  )
  const matured_claim_ratio =
    claim_ratio !== null && maturity_ratio !== null
      ? claim_ratio * maturity_ratio
      : null

  // 商业险自主系数 = 签单保费 / 商业险折前保费
  const autonomy_coefficient = safeDivide(
    aggregated.signed_premium_yuan,
    aggregated.commercial_premium_before_discount_yuan
  )

  // 计算年度时间进度
  const currentDayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  )
  const yearProgress = currentDayOfYear / 365
  const completionRatio = safeDivide(
    aggregated.signed_premium_yuan,
    premiumPlanYuan
  )
  const premium_progress =
    completionRatio !== null ? completionRatio * 100 : null

  // ============= 绝对值指标（转换为万元）=============

  const signed_premium = Math.round(aggregated.signed_premium_yuan / 10000)
  const matured_premium = Math.round(aggregated.matured_premium_yuan / 10000)
  const reported_claim_payment = Math.round(
    aggregated.reported_claim_payment_yuan / 10000
  )
  const expense_amount = Math.round(aggregated.expense_amount_yuan / 10000)
  const contribution_margin_amount = Math.round(
    aggregated.marginal_contribution_amount_yuan / 10000
  )

  // ============= 均值指标（元）=============

  const average_premium_raw = safeDivide(
    aggregated.signed_premium_yuan,
    aggregated.policy_count
  )
  const average_claim_raw = safeDivide(
    aggregated.reported_claim_payment_yuan,
    aggregated.claim_case_count
  )
  const average_expense_raw = safeDivide(
    aggregated.expense_amount_yuan,
    aggregated.policy_count
  )
  const average_contribution_raw = safeDivide(
    aggregated.marginal_contribution_amount_yuan,
    aggregated.policy_count
  )

  const average_premium =
    average_premium_raw !== null ? Math.round(average_premium_raw) : null
  const average_claim =
    average_claim_raw !== null ? Math.round(average_claim_raw) : null
  const average_expense =
    average_expense_raw !== null ? Math.round(average_expense_raw) : null
  const average_contribution =
    average_contribution_raw !== null ? Math.round(average_contribution_raw) : null

  // ============= 时间进度达成率 =============
  const premium_time_progress_achievement_rate =
    completionRatio !== null && yearProgress > 0
      ? (completionRatio / yearProgress) * 100
      : null

  // 计算件数时间进度达成率（假设有年度件数目标）
  const policyCompletionRatio =
    policyCountTarget !== null
      ? safeDivide(aggregated.policy_count, policyCountTarget)
      : null
  const policy_count_time_progress_achievement_rate =
    policyCompletionRatio !== null && yearProgress > 0
      ? (policyCompletionRatio / yearProgress) * 100
      : null

  // ============= 年度目标（暂不计算，需要额外数据）=============
  const annual_premium_target =
    premiumPlanYuan > 0 ? Math.round(premiumPlanYuan / 10000) : null
  const annual_policy_count_target =
    policyCountTarget !== null ? policyCountTarget : null

  return {
    // 率值指标
    loss_ratio,
    premium_progress,
    premium_time_progress_achievement_rate,
    policy_count_time_progress_achievement_rate,
    maturity_ratio,
    expense_ratio,
    contribution_margin_ratio,
    variable_cost_ratio,
    matured_claim_ratio,
    autonomy_coefficient,

    // 绝对值指标（万元）
    signed_premium,
    matured_premium,
    policy_count: aggregated.policy_count,
    claim_case_count: aggregated.claim_case_count,
    reported_claim_payment,
    expense_amount,
    contribution_margin_amount,
    annual_premium_target,
    annual_policy_count_target,

    // 均值指标（元）
    average_premium,
    average_claim,
    average_expense,
    average_contribution,
  }
}

/**
 * KPI 计算引擎类
 */
export class KPIEngine {
  private cache: Map<string, KPIResult> = new Map()

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    records: InsuranceRecord[],
    mode?: string,
    targetOverride?: number | null
  ): string {
    // 使用记录数量和基础字段的哈希作为缓存键
    const targetKey = targetOverride ? `_${Math.round(targetOverride)}` : ''
    const key = `${mode || 'current'}_${records.length}_${records.reduce((sum, r) => sum + r.signed_premium_yuan, 0)}${targetKey}`
    return key
  }

  /**
   * 计算 KPI
   * @param records 保险记录数组
   * @param useCache 是否使用缓存（默认 true）
   * @returns KPI 计算结果
   */
  calculate(
    records: InsuranceRecord[],
    options: { annualTargetYuan?: number | null; useCache?: boolean } = {}
  ): KPIResult {
    const { annualTargetYuan = null, useCache = true } = options

    if (records.length === 0) {
      return this.getEmptyKPIResult()
    }

    // 检查缓存
    const cacheKey = this.generateCacheKey(records, 'current', annualTargetYuan)
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // 聚合数据
    const aggregated = aggregateData(records)

    // 计算 KPI
    const result = computeKPIs(aggregated, {
      premiumTargetYuan: annualTargetYuan ?? null,
    })

    // 缓存结果
    if (useCache) {
      this.cache.set(cacheKey, result)
    }

    return result
  }

  /**
   * 计算周增量 KPI
   * @param currentWeekRecords 当前周的记录
   * @param previousWeekRecords 前一周的记录
   * @param useCache 是否使用缓存（默认 true）
   * @returns 周增量 KPI 结果
   */
  calculateIncrement(
    currentWeekRecords: InsuranceRecord[],
    previousWeekRecords: InsuranceRecord[],
    useCache = true
  ): KPIResult {
    // 如果当前周没有数据，返回空结果
    if (currentWeekRecords.length === 0) {
      return this.getEmptyKPIResult()
    }

    // 检查缓存
    const cacheKey = this.generateCacheKey(currentWeekRecords, 'increment')
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // 聚合当前周和前一周数据
    const currentAgg = aggregateData(currentWeekRecords)
    const previousAgg = previousWeekRecords.length > 0
      ? aggregateData(previousWeekRecords)
      : this.getEmptyAggregation()

    // 计算增量聚合数据
    const incrementAgg: BaseAggregation = {
      signed_premium_yuan: currentAgg.signed_premium_yuan - previousAgg.signed_premium_yuan,
      matured_premium_yuan: currentAgg.matured_premium_yuan - previousAgg.matured_premium_yuan,
      policy_count: currentAgg.policy_count - previousAgg.policy_count,
      claim_case_count: currentAgg.claim_case_count - previousAgg.claim_case_count,
      reported_claim_payment_yuan: currentAgg.reported_claim_payment_yuan - previousAgg.reported_claim_payment_yuan,
      expense_amount_yuan: currentAgg.expense_amount_yuan - previousAgg.expense_amount_yuan,
      commercial_premium_before_discount_yuan: currentAgg.commercial_premium_before_discount_yuan - previousAgg.commercial_premium_before_discount_yuan,
      premium_plan_yuan: currentAgg.premium_plan_yuan - previousAgg.premium_plan_yuan,
      marginal_contribution_amount_yuan: currentAgg.marginal_contribution_amount_yuan - previousAgg.marginal_contribution_amount_yuan,
    }

    // 计算增量 KPI
    const result = computeKPIs(incrementAgg)

    // 缓存结果
    if (useCache) {
      this.cache.set(cacheKey, result)
    }

    return result
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取空的聚合数据
   */
  private getEmptyAggregation(): BaseAggregation {
    return {
      signed_premium_yuan: 0,
      matured_premium_yuan: 0,
      policy_count: 0,
      claim_case_count: 0,
      reported_claim_payment_yuan: 0,
      expense_amount_yuan: 0,
      commercial_premium_before_discount_yuan: 0,
      premium_plan_yuan: 0,
      marginal_contribution_amount_yuan: 0,
    }
  }

  /**
   * 获取空的 KPI 结果
   */
  private getEmptyKPIResult(): KPIResult {
    return {
      loss_ratio: null,
      premium_progress: null,
      premium_time_progress_achievement_rate: null,
      policy_count_time_progress_achievement_rate: null,
      maturity_ratio: null,
      expense_ratio: null,
      contribution_margin_ratio: null,
      variable_cost_ratio: null,
      matured_claim_ratio: null,
      autonomy_coefficient: null,
      signed_premium: 0,
      matured_premium: 0,
      policy_count: 0,
      claim_case_count: 0,
      reported_claim_payment: 0,
      expense_amount: 0,
      contribution_margin_amount: 0,
      annual_premium_target: null,
      annual_policy_count_target: null,
      average_premium: null,
      average_claim: null,
      average_expense: null,
      average_contribution: null,
    }
  }
}

/**
 * 导出单例实例
 */
export const kpiEngine = new KPIEngine()

/**
 * 便捷函数：直接计算 KPI
 */
export function calculateKPIs(
  records: InsuranceRecord[],
  options?: { annualTargetYuan?: number | null; useCache?: boolean }
): KPIResult {
  return kpiEngine.calculate(records, options)
}
