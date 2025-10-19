# 代理协作指南（中文）

本仓库为 Next.js + TypeScript 前端项目，包含 CSV 数据上传解析、数据验证与可视化。以下为在本仓库中工作的约定与指南，帮助代理（Agent）高效协作。

## 范围与原则

- 作用范围：本 AGENTS.md 适用于仓库内所有目录与文件。
- 修改策略：
  - 仅围绕需求精准修改，避免无关重构。
  - 优先修正根因（验证规则/解析逻辑），不做表面修补。
  - 与现有风格保持一致，最小化改动范围。

## 开发环境初始化

- Node.js 18+，推荐使用 pnpm。
- 初始化命令：
  - 安装依赖：`pnpm install`
  - 开发调试：`pnpm dev`
  - 构建生产：`pnpm build && pnpm start`
  - 本地上传解析测试：`pnpm run test:upload -- <csv路径>`

## 关键目录

- `src/lib/parsers/csv-parser.ts`：CSV 解析器（Papa Parse，含表头检查与进度回调）
- `src/lib/validations/insurance-schema.ts`：数据验证（Zod）
- `src/components/features/file-upload.tsx`：上传与解析 UI
- `scripts/test_upload.js`：离线解析与校验脚本（与前端逻辑对齐）

## 验证规则（重要）

- 跨字段规则（当前仅保留）：
  - 满期保费 ≤ 签单保费
- 以下规则已取消，不再作为上传阻断：
  - 赔案件数 ≤ 保单件数（取消）
  - 商业险：折前保费 ≥ 签单保费（取消）
  - 非营业个人客车：车险评级不能为 X（取消）
- 字段级规则仍生效（示例）：
  - 日期格式 `YYYY-MM-DD` 且在 2020-01-01 至今区间
  - `policy_start_year`：整数 ∈ [2020, 2030]
  - `week_number`：整数 ∈ [1, 105]
  - 数值字段非负（如赔款、费用），保费不超过 1,000 万
  - 枚举严格校验：`chengdu_branch ∈ {成都, 中支}`、`third_level_organization` 为限定枚举等

提示：若放宽规则，请同步修改 `insurance-schema.ts` 与开发文档（`开发文档/`）。

## 提交流程与注意事项

- 保持变更聚焦与可回滚；必要时在 PR/说明中列出修改点与测试结果。
- 如需新增脚本或调试工具，置于 `scripts/`，并在 `package.json` 添加对应 npm script。
- 文档更新：涉及规则/接口变更，务必同步更新 `开发文档/` 内相关说明。

## 本地验证建议

1. 使用 `scripts/test_upload.js` 对大型 CSV 做预检测（可定位高频错误字段）。
2. 在浏览器侧通过上传组件复验：`pnpm dev`，访问首页拖拽上传。
3. 如遇“表头缺失”或“枚举不匹配”，先检查 CSV 字段名、编码与实际枚举集。

## 联系与扩展

- 如需新增维度/枚举或放宽范围，请先在 `开发文档/` 设计与确认，再落实到 Schema/解析器与 UI。

