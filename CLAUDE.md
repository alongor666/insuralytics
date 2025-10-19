# CLAUDE.md

# 导入csv文件在/test 目录下
# 项目开发文档在/开发文档 目录下
# 每个功能的开发都要先测试、并记录是否符合需求、直到符合需求，在/开发文档 目录下创建测试记录.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

这是一个**车险多维可视化智能数据分析网页**的 PRD（产品需求文档）仓库。该产品旨在帮助保险业务团队将复杂的车险数据转化为交互式可视化洞察，实现数据驱动决策。

**核心价值主张：**
- 数据民主化：让非技术人员也能轻松进行专业级数据分析
- 洞察实时化：从数据上传到洞察生成，全程不超过30秒
- 决策智能化：AI驱动的异常检测和归因分析
- 体验极致化：媲美原生应用的流畅交互和现代化设计美学

**目标用户：** 约100人（高层管理者、业务分析师、区域经理、产品经理、风控专员）

## 技术栈

### MVP阶段（静态文件模式）
**前端技术：**
- Next.js 14 (App Router) 支持 SSR/SSG
- React 18 + TypeScript 5.x
- Tailwind CSS 3.x 样式框架
- Shadcn/ui 组件库（基于 Radix UI）
- Zustand 4.x 状态管理
- Recharts 2.x 图表库

**工具链：**
- pnpm 8.x（包管理器）
- ESLint 8.x + Prettier 3.x
- Husky 8.x（Git 钩子）
- Vitest（单元测试）
- Playwright（E2E 测试）

**部署：**
- Vercel/Netlify/AWS S3+CloudFront 静态托管
- 静态 JSON 文件存放于 `public/data/`
- 通过 GitHub Actions 实现 CI/CD

**数据验证：**
- Zod 进行运行时数据验证

**性能优化：**
- Papa Parse 实现流式 CSV 解析（使用 Web Workers）
- react-window 实现虚拟滚动
- 多层缓存（内存 → localStorage → Service Worker）

### V1.0+（API 模式）
**后端技术：**
- Node.js 20.x LTS 运行时
- Fastify 4.x Web 框架
- PostgreSQL 15.x 数据库
- Redis 7.x 缓存
- Prisma 5.x ORM

**部署架构：**
- 前端：Vercel
- 后端：AWS ECS Fargate
- 数据库：PostgreSQL RDS（主从复制）
- 缓存：ElastiCache (Redis)
- CDN：CloudFront

## 数据架构

### 核心数据模型

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

### 核心 KPI 计算公式

系统计算8个核心 KPI，以 4×2 网格展示：

| KPI 指标 | 计算公式 | 单位 | 业务含义 |
|---------|---------|------|----------|
| **满期边际贡献率** | `SUM(marginal_contribution_amount_yuan) / SUM(matured_premium_yuan) * 100` | % | 核心盈利能力指标 |
| **保费达成率** | `(SUM(signed_premium_yuan) / SUM(premium_plan_yuan)) / (已过天数/365) * 100` | % | 保费完成进度 vs 时间进度 |
| **满期赔付率** | `SUM(reported_claim_payment_yuan) / SUM(matured_premium_yuan) * 100` | % | 核心风险指标 |
| **费用率** | `SUM(expense_amount_yuan) / SUM(signed_premium_yuan) * 100` | % | 费用占保费比例 |
| **满期率** | `SUM(matured_premium_yuan) / SUM(signed_premium_yuan) * 100` | % | 保单满期程度 |
| **满期出险率** | `(SUM(claim_case_count) / SUM(policy_count)) * 满期率` | % | 满期保单出险频率 |
| **变动成本率** | `费用率 + 满期赔付率` | % | 综合成本率 |
| **商业险自主系数** | `SUM(signed_premium_yuan) / SUM(commercial_premium_before_discount_yuan)` | 小数 | 商业险折扣力度 |

**附加 KPI：**
- `signed_premium`: 签单保费（万元，四舍五入取整）= `SUM(signed_premium_yuan) / 10000`
- `matured_premium`: 满期保费（万元，四舍五入取整）= `SUM(matured_premium_yuan) / 10000`
- `contribution_margin_amount`: 边际贡献额（万元，四舍五入取整）= `SUM(marginal_contribution_amount_yuan) / 10000`
- `average_premium`: 单均保费（元，四舍五入取整）= `SUM(signed_premium_yuan) / SUM(policy_count)`
- `average_claim`: 案均赔款（元，四舍五入取整）= `SUM(reported_claim_payment_yuan) / SUM(claim_case_count)`
- `average_expense`: 单均费用（元，四舍五入取整）= `SUM(expense_amount_yuan) / SUM(policy_count)`

### 数据验证规则

**字段级验证：**
- 日期字段：ISO 8601 格式（YYYY-MM-DD），范围 2020-01-01 至今
- 周序号：整数 28-41（实际数据范围）
- 机构代码：必须在13个枚举值内（实际数据）
- 保险类型：必须为 '商业险' 或 '交强险'
- 所有保费/费用字段：非负数
- 保单/赔案数：非负整数
- 布尔字段：`True` 或 `False`（区分大小写）

**跨字段验证（当前生效）：**
- 满期保费 ≤ 签单保费

说明：以下规则已取消，不再作为上传阻断条件：
- 赔案件数 ≤ 保单件数（取消）
- 商业险：折前保费 ≥ 签单保费（取消）
- 非营业客车：车险评级不能为 'X'（取消）

## 文件结构与命名规范

### CSV 导入文件

**核心原则：**
- **数据结构优先**：文件名可以灵活，但数据结构必须严格遵循规范
- **字段完整性**：所有必需字段必须存在，可选字段允许为空
- **数据类型一致**：相同字段在不同文件中必须保持相同的数据类型
- **编码统一**：统一使用UTF-8编码，支持中文字符

**命名建议（非强制）：**
- 周明细表：`<YYYY>保单第<WW>周变动成本明细表.csv`（例：`2024保单第28周变动成本明细表.csv`）
- 周汇总表：`<YY>年保单<WW1>-<WW2>周变动成本汇总表.csv`（例：`25年保单28-41周变动成本汇总表.csv`）

**必需字段（26个）：**
所有CSV文件必须包含以下26个字段，字段顺序可以灵活调整：

1. **时间维度**：`snapshot_date`, `policy_start_year`, `week_number`
2. **组织维度**：`chengdu_branch`, `third_level_organization`
3. **客户维度**：`customer_category_3`
4. **产品维度**：`insurance_type`, `business_type_category`, `coverage_type`
5. **业务属性**：`renewal_status`, `is_new_energy_vehicle`, `is_transferred_vehicle`
6. **评级维度**：`vehicle_insurance_grade`, `highway_risk_grade`, `large_truck_score`, `small_truck_score`（允许为空）
7. **渠道维度**：`terminal_source`
8. **业务指标**：`signed_premium_yuan`, `matured_premium_yuan`, `policy_count`, `claim_case_count`, `reported_claim_payment_yuan`, `expense_amount_yuan`, `commercial_premium_before_discount_yuan`, `premium_plan_yuan`（可为空）, `marginal_contribution_amount_yuan`

**CSV 格式要求：**
- 编码：UTF-8（无 BOM）
- 分隔符：英文逗号 `,`
- 换行符：LF (`\n`)
- 首行：snake_case 格式的字段名
- 缺失值：空字符串（评级字段和premium_plan_yuan允许）
- 日期格式：`YYYY-MM-DD`
- 数值格式：无千分位，小数点为 `.`
- 布尔值：`True` / `False`（区分大小写）

**错误处理机制：**
- **严重错误**：缺少必填字段、数据类型错误 → 跳过该行
- **警告错误**：枚举值不匹配、数值超出合理范围 → 尝试修正
- **信息提示**：可选字段为空、文件名格式不标准 → 正常处理

### 静态文件结构（MVP）
```
public/
├── data/
│   ├── 2024_week_28_41.json          # 周度明细数据
│   ├── metadata.json                  # 数据字典与枚举值
│   └── schema.json                    # 数据模式定义
├── templates/
│   └── import_template.csv            # CSV 导入模板
└── docs/
    └── user_guide.pdf                 # 用户手册
```

## 性能要求（100人并发场景）

| 操作类型 | 目标值 | 测试条件 |
|---------|-------|---------|
| **首次内容绘制 (FCP)** | <1.5s | 100并发，3G网络，10万条数据 |
| **最大内容绘制 (LCP)** | <2.5s | 同上 |
| **可交互时间 (TTI)** | <3.5s | 同上 |
| **筛选器响应** | <200ms | 单次筛选变更，10万条数据 |
| **KPI 计算** | <500ms | 8个核心KPI，复杂筛选，10万条数据 |
| **图表渲染** | <300ms | 单个趋势图，52周数据 |
| **CSV 上传解析** | <10s | 5万条记录，5MB 文件 |
| **数据导出** | <2s | 1万条记录，CSV 格式 |

**资源限制：**
- 客户端内存：<500MB
- 客户端 CPU：<30% 持续占用
- 单次上传 CSV：<50MB
- 缓存大小：<100MB（localStorage + 内存）
- 单次查询记录数：<10万条

## 核心设计模式

### 状态管理架构
```typescript
interface AppStore {
  // 数据状态
  rawData: InsuranceRecord[]
  isLoading: boolean
  error: Error | null

  // 筛选状态
  filters: FilterState

  // 计算缓存
  computedKPIs: Map<string, KPIResult>

  // UI 状态
  viewMode: 'single' | 'trend'
  expandedPanels: Set<string>

  // 操作方法
  loadData: (files: File[]) => Promise<void>
  updateFilters: (filters: Partial<FilterState>) => void
  clearCache: () => void
}
```

### 数据处理流水线
```
rawData
  → validate()    // 数据验证
  → transform()   // 字段转换
  → filter()      // 应用筛选
  → aggregate()   // 聚合计算
  → compute()     // 指标计算
  → memoize()     // 结果缓存
  → render()      // UI 渲染
```

### 聚合计算引擎模式
- 根据筛选状态生成缓存键
- 检查多层缓存（内存 → localStorage → Service Worker）
- 使用 `reduce()` 进行高效聚合
- 缓存计算结果
- 安全除法（除零时返回 null）
- 使用 Web Workers 处理重计算，避免阻塞 UI

## 视觉设计系统

**色彩体系：**
- 主题色：低饱和蓝 (#2196F3)
- 成功色：绿色 (#4CAF50) - 正向指标
- 警告色：橙色 (#FF9800) - 需关注
- 错误色：红色 (#F44336) - 异常告警
- 信息色：蓝色 (#2196F3) - 提示信息

**满期边际贡献率专用色谱：**
- >12%：深绿 (#2E7D32) - 优秀
- 8-12%：浅绿 (#4CAF50) - 良好
- ~8%：蓝色 (#1976D2) - 中等
- 4-8%：黄色 (#FBC02D) - 一般
- <4%：橙色 (#F57C00) - 较差
- <0%：红色 (#D32F2F) - 严重

**设计风格：**
- 玻璃态拟物化（毛玻璃效果）
- 微妙的阴影和模糊效果
- 平滑的缓动动画
- 响应式设计（移动优先）
- 无障碍访问（WCAG 2.1 AA）

## 开发工作流

### MVP 里程碑（6周，3人团队）
- **第1周**：项目启动 + 技术预研
- **第2周**：数据层开发（CSV 解析器、验证器）
- **第3周**：计算引擎开发（KPI 计算）
- **第4周**：UI 框架 + 筛选系统
- **第5周**：KPI 看板 + 图表
- **第6周**：测试 + 部署

### V1.0 里程碑（8周，5人团队）
- **第1-2周**：后端服务（API、数据库、认证）
- **第3-4周**：双模式分析（多周趋势、对比分析）
- **第5-6周**：图表增强 + 性能优化
- **第7周**：集成测试 + 安全加固
- **第8周**：部署 + 生产上线

## API 设计（V1.0+）

**RESTful 端点：**
```
GET    /api/v1/data/weeks?year=2024&weeks=28,29,30  // 获取周度数据
POST   /api/v1/data/upload                          // 上传 CSV 文件
GET    /api/v1/kpis?filters={...}                   // 获取 KPI 计算结果
GET    /api/v1/metadata                             // 获取数据字典
GET    /api/v1/health                               // 健康检查
```

**响应格式：**
```typescript
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-18T11:09:28Z",
    "version": "1.0.0",
    "executionTime": 123
  }
}
```

## 安全性要求

- **传输加密**：强制 HTTPS，TLS 1.3+，启用 HSTS
- **数据脱敏**：车牌号/保单号/手机号部分隐藏
- **访问控制**：基于角色的权限控制（RBAC），JWT 认证
- **数据备份**：每日自动备份，保留30天
- **审计日志**：记录所有数据操作（上传/导出/删除）
- **输入验证**：前后端双重验证（使用 Zod schemas）
- **XSS 防护**：内容安全策略（CSP）
- **CSRF 防护**：SameSite cookies，CSRF tokens

## 重要业务规则

1. **除零保护**：所有比率计算必须安全处理除零情况（返回 `null` 而非抛出错误）

2. **数据精度**：要求 100% 计算准确率 - 所有 KPI 计算必须与 Excel 结果完全一致

3. **维度适用性**：
   - 车险评级：仅适用于 `customer_category_3 = '非营业个人客车'`
   - 小货车评分：适用于非营业货车或 2吨以下货车
   - 大货车评分：适用于 10吨以上货车

4. **筛选联动**：选择某些维度值时应级联过滤相关维度

5. **周序号规则**：使用 ISO 8601 标准（周一为一周开始，第1周包含该年1月4日）

## 测试要求

**MVP 验收标准：**
- 支持 10万条 CSV 记录，解析时间 <10s
- 8个核心 KPI 计算正确，与 Excel 结果一致
- 筛选器响应时间 <300ms
- 首页加载时间 <3s（10万条数据）
- 支持 Chrome/Edge 最新版本
- 无 P0/P1 严重级别 Bug

**性能测试场景：**
1. 基准场景：1用户，1万条数据，简单筛选 → LCP <1.5s，KPI 计算 <100ms
2. 常规负载：10并发，5万条数据，中等复杂度 → LCP <2.0s，KPI 计算 <300ms
3. 高负载：50并发，10万条数据，复杂筛选 → LCP <2.5s，KPI 计算 <500ms
4. 压力测试：100并发，10万条数据，复杂筛选+图表 → LCP <3.0s，KPI 计算 <800ms

## 已知限制（MVP）

- 仅支持单周分析模式
- 不支持多周趋势对比
- 不支持数据编辑功能
- 不支持用户权限管理
- 不支持数据持久化（刷新页面丢失数据）

## 未来增强功能

**V2.0（AI 增强版）：**
- AI 驱动的异常检测
- 多维度归因分析
- 保费/赔付率预测模型
- 自然语言洞察生成
- 高级图表（瀑布图、桑基图、热力图）

**V3.0（行业对标版）：**
- 跨行业对比分析
- 最佳实践推荐
- 生态系统集成（API 平台）

## 开发注意事项

- 原始数据中所有金额单位为元，但大部分 KPI 显示时转换为万元
- 广泛使用 memoization 缓存计算结果
- 任何超过100项的列表都要实现虚拟滚动
- 计算时间超过100ms的操作使用 Web Workers，避免阻塞 UI
- 所有用户界面文本使用简体中文
- 必须启用 TypeScript 严格模式
- 所有组件必须响应式且支持移动端

## 最新更新记录

### 2025年10月 - 核心功能增强

**新增功能：**
1. **数据导出功能** (P0)
   - 支持导出全部原始数据
   - 支持导出当前筛选数据
   - 支持导出KPI汇总报告
   - CSV格式，UTF-8编码，Excel可直接打开
   - 文件: `src/lib/export/csv-exporter.ts`, `src/components/features/data-export.tsx`

2. **错误边界处理** (P0)
   - 全局React错误捕获
   - 友好的错误提示UI
   - 开发环境详细堆栈信息
   - 支持一键重试和刷新
   - 文件: `src/components/error-boundary.tsx`

3. **数据持久化机制** (P0)
   - 自动保存数据到localStorage
   - 刷新页面数据不丢失
   - 筛选条件自动保存和恢复
   - 7天数据过期机制
   - 100MB存储限制管理
   - 文件: `src/lib/storage/local-storage.ts`, `src/hooks/use-persist-data.ts`

**技术改进：**
- 完善的TypeScript类型定义
- 优化的错误处理策略
- 改进的用户体验设计
- 模块化的代码组织

**项目状态：**
- 完成度：85% → 92%
- 新增代码：~800行
- 新增文件：6个

### 2025年1月 - CSV上传功能优化
**问题解决：**
1. **字段顺序匹配问题**：调整 `csv-parser.ts` 中 `REQUIRED_FIELDS` 顺序，完全匹配实际CSV文件结构
2. **大文件解析优化**：配置Papa Parse使用64KB分块处理，支持16,000+行数据流式解析
3. **错误诊断增强**：添加详细的字段验证日志，包括缺失字段、额外字段和数据转换错误
4. **性能监控**：实现解析速度监控和进度反馈，提升用户体验

**技术改进：**
- 优化 `transformCSVRow` 函数的错误处理机制
- 增强 `parseCSVFile` 的批处理逻辑和内存管理
- 完善 `useFileUpload` 钩子的状态管理和错误恢复
- 更新CSV导入规范文档，添加测试验证记录

**测试验证：**
- ✅ 测试数据.csv (16,968行) 解析成功
- ✅ 26个必需字段全部验证通过
- ✅ 字段顺序完全匹配实际数据
- ✅ 错误处理和用户反馈完善
