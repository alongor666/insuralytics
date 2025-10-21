# 数据架构

> **[warning] 警告：数据库模型缺失**
> 截至文档更新时（2025-10-21），项目尚未建立数据库持久化层。`prisma` 目录及 `schema.prisma` 文件不存在。当前所有数据处理均在客户端内存中完成。以下数据结构规范基于CSV导入标准，是未来数据库建模的唯一事实来源。

本文档详细定义了车险分析平台的数据结构、验证规则和文件格式，是确保数据一致性与准确性的核心依据。

## 核心原则

1.  **数据结构优先**：文件名可以灵活，但数据结构必须严格遵循规范。
2.  **字段完整性**：所有必需字段必须存在，可选字段允许为空。
3.  **数据类型一致**：相同字段在不同文件中必须保持相同的数据类型。
4.  **编码统一**：统一使用UTF-8编码，支持中文字符。

## 数据结构规范 (26个字段)

CSV文件必须包含以下26个字段。为保证解析效率，**强烈推荐遵循标准字段顺序**。

| # | 字段名 | 数据类型 | 描述 | 示例/枚举值 | 可否为空 |
|---|---|---|---|---|---|
| 1 | `snapshot_date` | Date | 快照日期 | `2025-07-13` | 否 |
| 2 | `policy_start_year` | Integer | 保单年度 | `2024` | 否 |
| 3 | `business_type_category` | String | 业务类型 | `10吨以上-普货`, `网约车`... (16种) | 否 |
| 4 | `chengdu_branch` | String | 地域属性 | `成都`, `中支` | 否 |
| 5 | `third_level_organization` | String | 三级机构 | `本部`, `达州`, `德阳`... (13种) | 否 |
| 6 | `customer_category_3` | String | 客户类型 | `非营业个人客车`, `营业货车`... (11种) | 否 |
| 7 | `insurance_type` | String | 保险类型 | `商业险`, `交强险` | 否 |
| 8 | `is_new_energy_vehicle` | Boolean | 是否新能源 | `True`, `False` | 否 |
| 9 | `coverage_type` | String | 险别组合 | `主全`, `交三`, `单交` | 否 |
| 10 | `is_transferred_vehicle` | Boolean | 是否过户车 | `True`, `False` | 否 |
| 11 | `renewal_status` | String | 新续转状态 | `新保`, `续保`, `转保` | 否 |
| 12 | `vehicle_insurance_grade` | String | 车险评级 | `A`, `B`, `C`, `D`, `E`, `F`, `G`, `X` | 是 |
| 13 | `highway_risk_grade` | String | 高速风险等级 | `A`, `B`, `C`, `D`, `E`, `F`, `X` | 是 |
| 14 | `large_truck_score` | String | 大货车评分 | `A`, `B`, `C`, `D`, `E`, `X` | 是 |
| 15 | `small_truck_score` | String | 小货车评分 | `A`, `B`, `C`, `D`, `E`, `X` | 是 |
| 16 | `terminal_source` | String | 终端来源 | `0101柜面`, `0106移动展业(App)`... (8种) | 否 |
| 17 | `signed_premium_yuan` | Number | 签单保费 | `2958.49` | 否 |
| 18 | `matured_premium_yuan` | Number | 满期保费 | `2958.49` | 否 |
| 19 | `policy_count` | Integer | 保单件数 | `1` | 否 |
| 20 | `claim_case_count` | Integer | 赔案件数 | `0` | 否 |
| 21 | `reported_claim_payment_yuan` | Number | 已报告赔款 | `0.0` | 否 |
| 22 | `expense_amount_yuan` | Number | 费用金额 | `59.17` | 否 |
| 23 | `commercial_premium_before_discount_yuan` | Number | 商业险折前保费 | `0.0` | 否 |
| 24 | `premium_plan_yuan` | Number | 保费计划 | `2958.49` | 是 |
| 25 | `marginal_contribution_amount_yuan` | Number | 边际贡献额 | `2899.32` (可为负) | 否 |
| 26 | `week_number` | Integer | 周序号 | `80` | 否 |

## 数据格式与验证规则

### 文件格式
- **文件类型**: CSV (`.csv`)
- **编码**: **UTF-8**
- **分隔符**: 英文逗号 (`,`)
- **首行**: 必须是与上表完全一致的字段名 (`snake_case`)

### 数据类型与格式
- **Date**: `YYYY-MM-DD`
- **Boolean**: `True` 或 `False` (首字母大写)
- **Number**: 使用点号作为小数点，不含千分位分隔符
- **Integer**: 整数
- **空值**: 允许为空的字段使用空字符串 `""`

### 字段验证规则
- **必填字段**: 所有“可否为空”为“否”的字段都必须有值。
- **数值范围**:
    - `policy_start_year`: 2024-2025
    - `week_number`: 28-41
    - 除 `marginal_contribution_amount_yuan` 外，所有金额和数量字段 ≥ 0。
- **枚举值**: 严格按照规范中定义的实际枚举值进行匹配。

## 文件命名建议 (非强制)

- **周度明细文件**: `YYYY保单第WW周变动成本明细表.csv` (例: `2024保单第28周变动成本明细表.csv`)
- **汇总文件**: `YY年保单WW-WW周变动成本汇总表.csv` (例: `25年保单28-41周变动成本汇总表.csv`)

## 错误处理机制

系统在导入时会对每行数据进行验证。
- **严重错误 (跳过该行)**: 缺少必填字段、数据类型错误。
- **警告错误 (尝试修正或记录)**: 枚举值不匹配、数值超出合理范围。
- **信息提示 (正常处理)**: 可选字段为空。

## 目标管理数据结构

目标管理功能的所有配置保存在浏览器 `localStorage` 中的 `insurDashPremiumTargets` 键下，结构如下：

- `year`: 数值，目标适用年度。
- `overall`: 数值，年度总目标（单位：元）。
- `byBusinessType`: 业务类型拆分，用于兼容旧版本逻辑，等价于 `dimensions.businessType.entries`。
- `dimensions`: `Record<TargetDimensionKey, DimensionTargetState>`，支持以下四个维度：
  - `businessType`（业务类型）
  - `thirdLevelOrganization`（三级机构）
  - `customerCategory`（客户分类）
  - `insuranceType`（保险类型）
- `updatedAt`: 字符串，最近一次保存时间（ISO）。

`DimensionTargetState` 定义：

- `entries`: `Record<string, number>`，key 为经过规范化的维度值，value 为元单位目标额。
- `updatedAt`: 字符串或 `null`，该维度最近保存时间。
- `versions`: `TargetVersionSnapshot[]`，按时间倒序排列的历史快照。

`TargetVersionSnapshot` 包含：

- `id`: 版本唯一标识。
- `label`: 版本名称（默认“维度名 + 保存时间”）。
- `createdAt`: 保存时间戳（ISO）。
- `overall`: 保存时的年度总目标（元）。
- `entries`: 该快照下的分配明细（元）。
- `note`: 可选备注。

### 交互约定

- 目标管理页面（`src/app/targets/page.tsx`）中的“年度目标”列采用 Excel 式键盘操作：`Enter` 跳转到下一行，方向键在同一列的上下条目之间移动焦点，便于快速录入。
- 输入框保持手动输入能力，同时设置数值步进为 50（万元），通过浏览器原生的增减控制或键盘调整时都以 50 为最小增量。

### CSV 模板与导入规范

每个维度均可导出/导入 CSV 模板，列规范如下：

| 维度 | 维度列名 | 汇总行标识 | 说明 |
| --- | --- | --- | --- |
| 业务类型 | `business_type` | `车险整体` | 兼容旧模板；导入时自动更新年度总目标。 |
| 三级机构 | `third_level_organization` | `年度总目标` | 未提供汇总行则总目标保持当前值。 |
| 客户分类 | `customer_category_3` | `年度总目标` | 同上。 |
| 保险类型 | `insurance_type` | `年度总目标` | 同上。 |

模板中的 `target_wan` 列以“万元”为单位，系统会自动转换为“元”进行存储；未在 CSV 中出现的维度值将保留原有配置。

## 相关文档

- **[CSV导入规范](../archive/CSV导入规范.md)**: 本数据架构的原始需求和详细解释，包含了更详细的字段枚举值、业务背景和测试记录。