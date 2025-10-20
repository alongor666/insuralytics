---
id: ADR-002
title: 将评级相关字段的验证规则从“必需”调整为“可选”
status: Accepted
date: 2025-01-28
impacts_features:
  - FEAT-P0-01_data-upload
---

### 背景 (Context)

在初期的数据上传测试中，发现大量数据行（约22%）验证失败。经过排查，根本原因是 `vehicle_insurance_grade`（车险评级）等多个评级字段在业务数据中经常为空，但系统的Zod Schema将其定义为必填项，导致校验失败。

### 决策 (Decision)

我们决定修改数据验证Schema (`insurance-schema.ts`)，将以下评级相关字段调整为可选（`.optional()`）：
- `vehicle_insurance_grade`
- `highway_risk_grade`
- `large_truck_score`
- `small_truck_score`

同时，CSV解析器逻辑也相应修改，当遇到这些字段的空值时，解析为 `undefined` 而非强制赋予默认值 'X'。

### 后果 (Consequences)

**优点:**
*   **符合业务实际**：新的验证规则与业务数据的实际情况相符，大大提高了数据导入的成功率。
*   **数据保真性**：避免了为本应为空的字段强制赋予默认值，保证了数据的原始性和准确性。
*   **提升用户体验**：用户不再因为正常的空值数据而被阻挡在系统之外。

**缺点:**
*   **下游处理需更鲁棒**：所有使用这些评级字段的下游组件（如筛选器、分析模块），都必须能正确处理 `undefined` 或 `null` 值，增加了下游逻辑的复杂性。
*   **数据完整性风险**：如果未来业务要求这些字段变为必填，需要重新审视和修改此决策。
