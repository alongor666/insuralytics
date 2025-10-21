# 数据架构

本文档详细定义了车险分析平台的数据结构、验证规则和文件格式，是确保数据一致性与准确性的核心依据。

## 核心数据模型

系统处理包含以下维度的保险记录：

**时间维度：**
- `policy_start_year`: 保单年度（2024-2025，实际数据范围）
- `week_number`: ISO 周序号（28-41，实际数据范围）
- `snapshot_date`: 快照日期（YYYY-MM-DD）

**空间维度：**
- `third_level_organization`: 13个三级机构（本部、达州、德阳、高新、乐山、泸州、绵阳、南充、青羊、天府、武侯、新都、宜宾）
- `chengdu_branch`: 地域属性（'成都' | '中支'）

**产品维度：**
- `insurance_type`: 保险类型（'商业险' | '交强险'）
- `business_type_category`: 16种业务类型分类（实际数据）
- `coverage_type`: 险别组合（'主全' | '交三' | '单交'）

**客户维度：**
- `customer_category_3`: 11种客户类型分类（实际数据）
- `vehicle_insurance_grade`: A-G/X 车险评级（非营业客车，约18.3%为X）
- `highway_risk_grade`: A-F/X 高速风险等级
- `large_truck_score`: A-E/X 大货车评分
- `small_truck_score`: A-E/X 小货车评分

**渠道维度：**
- `terminal_source`: 8种终端来源（柜面、移动展业、B2B、PC、APP、电销等，实际数据）
- `is_new_energy_vehicle`: 是否新能源车（布尔值，约15.8%为新能源）
- `renewal_status`: 新续转状态（'新保' | '续保' | '转保'）
- `is_transferred_vehicle`: 是否过户车（布尔值，约9.1%为过户车）

**业务指标（单位：元）：**
- `signed_premium_yuan`: 签单保费（≥0）
- `matured_premium_yuan`: 满期保费（≥0）
- `policy_count`: 保单件数（≥0）
- `claim_case_count`: 赔案件数（≥0）
- `reported_claim_payment_yuan`: 已报告赔款（≥0）
- `expense_amount_yuan`: 费用金额（≥0）
- `commercial_premium_before_discount_yuan`: 商业险折前保费（≥0）
- `premium_plan_yuan`: 保费计划（可选，≥0）
- `marginal_contribution_amount_yuan`: 边际贡献额（可为负）

## 数据验证规则

数据验证是保障数据质量的第一道防线，所有导入数据均需通过以下规则校验。

### 字段级验证

- **日期字段**：必须为 ISO 8601 格式（`YYYY-MM-DD`），且日期在 `2020-01-01` 至今的范围内。
- **周序号**：必须为整数，实际数据范围为 `28-41`。
- **机构代码**：必须在预定义的13个枚举值之内。
- **保险类型**：必须为 `'商业险'` 或 `'交强险'`。
- **数值字段**：所有保费、费用、赔款金额字段必须为非负数。
- **计数单位**：保单件数和赔案件数必须为非负整数。
- **布尔字段**：必须为 `True` 或 `False`（区分大小写）。

### 跨字段验证

- **当前生效规则**：
  - `matured_premium_yuan` ≤ `signed_premium_yuan`

- **已停用规则**（注意：以下规则已不再作为数据上传的阻断条件）：
  - `claim_case_count` ≤ `policy_count`
  - 对于商业险, `commercial_premium_before_discount_yuan` ≥ `signed_premium_yuan`
  - 对于非营业客车, `vehicle_insurance_grade` 不能为 `'X'`

## CSV 导入文件规范

### 核心原则

- **数据结构优先**：文件名可以灵活，但CSV文件的数据结构必须严格遵循规范。
- **字段完整性**：所有必需字段必须存在，可选字段允许为空。
- **数据类型一致**：相同字段在不同文件中必须保持相同的数据类型。
- **编码统一**：统一使用UTF-8编码，以正确支持中文字符。

### 命名建议（非强制）

- **周明细表**: `<YYYY>保单第<WW>周变动成本明细表.csv` (例如: `2024保单第28周变动成本明细表.csv`)
- **周汇总表**: `<YY>年保单<WW1>-<WW2>周变动成本汇总表.csv` (例如: `25年保单28-41周变动成本汇总表.csv`)

### 必需字段（26个）

所有CSV文件必须包含以下26个字段，字段顺序可以灵活调整：

1.  **时间维度**: `snapshot_date`, `policy_start_year`, `week_number`
2.  **组织维度**: `chengdu_branch`, `third_level_organization`
3.  **客户维度**: `customer_category_3`
4.  **产品维度**: `insurance_type`, `business_type_category`, `coverage_type`
5.  **业务属性**: `renewal_status`, `is_new_energy_vehicle`, `is_transferred_vehicle`
6.  **评级维度**: `vehicle_insurance_grade`, `highway_risk_grade`, `large_truck_score`, `small_truck_score` (允许为空)
7.  **渠道维度**: `terminal_source`
8.  **业务指标**: `signed_premium_yuan`, `matured_premium_yuan`, `policy_count`, `claim_case_count`, `reported_claim_payment_yuan`, `expense_amount_yuan`, `commercial_premium_before_discount_yuan`, `premium_plan_yuan` (可为空), `marginal_contribution_amount_yuan`

### CSV 格式要求

- **编码**: UTF-8 (无 BOM)
- **分隔符**: 英文逗号 `,`
- **换行符**: LF (`
`)
- **首行**: 必须是字段名，采用 `snake_case` 格式。
- **缺失值**: 对于可选字段（如评级字段和 `premium_plan_yuan`），使用空字符串表示。
- **日期格式**: `YYYY-MM-DD`
- **数值格式**: 不含千分位分隔符，小数点使用 `.`。
- **布尔值**: `True` / `False` (区分大小写)。

### 错误处理机制

- **严重错误** (跳过整行):
  - 缺少必填字段
  - 字段数据类型不匹配
- **警告错误** (尝试修正或记录):
  - 枚举值不匹配
  - 数值超出合理范围
- **信息提示** (正常处理):
  - 可选字段为空
  - 文件名格式不符合建议标准