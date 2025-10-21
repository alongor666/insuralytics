# Insuralytics - 多维车险分析平台

**化繁为简，洞见未来。**

Insuralytics 是一个专为车险业务设计的现代化、轻量级多维分析平台。它通过直观的界面和强大的数据处理能力，帮助精算师、业务分析师和管理层快速从业管数据中提取洞见，实现数据驱动的精细化运营。

## ✨ 核心功能

- **数据导入与验证**: 支持标准格式的 CSV 文件上传，并提供严格的客户端与服务器端数据验证，确保数据质量。
- **KPI 仪表盘**: 以 4x4 网格布局集中展示关键绩效指标（KPI），如综合成本率、签单进度、边际贡献率等，实时掌握业务健康状况。
- **趋势分析**: 可视化展示核心 KPI 的历史变化趋势，辅助判断业务波动和周期性规律。
- **动态筛选与切片**: 提供丰富的维度筛选器（如机构、险种、渠道等），支持对数据进行灵活的下钻和切片分析。
- **结构分析**: 深入剖析保费、赔付等关键指标的内部构成，例如不同车型的保费占比。
- **数据导出**: 支持将分析结果导出为 CSV 文件，便于离线分析和报告制作。
- **计算逻辑校验**: 提供独立的校验工具，确保前端展示的 KPI 结果与后端计算逻辑完全一致。

## 🛠️ 技术栈

- **前端**: Next.js (React), shadcn/ui, Recharts, Zustand
- **后端**: Node.js, Prisma
- **数据库**: Supabase (PostgreSQL)
- **开发语言**: TypeScript
- **部署**: Vercel

## 🚀 快速上手 (使用指引)

### 环境准备

- [Node.js](https://nodejs.org/) (v18.x 或更高版本)
- [pnpm](https://pnpm.io/) (v8.x 或更高版本)

### 安装与启动

1.  **克隆仓库**
    ```bash
    git clone https://github.com/alongor666/insuralytics.git
    cd insuralytics
    ```

2.  **安装依赖**
    ```bash
    pnpm install
    ```

3.  **配置环境变量**
    - 复制 `.env.example` 文件为 `.env.local`。
    - 在 `.env.local` 文件中填入您的 Supabase 数据库连接字符串 (`DATABASE_URL`)。

4.  **启动应用**
    ```bash
    pnpm dev
    ```
    应用将在 `http://localhost:3000` 上运行。

## 👨‍💻 开发指引

### 项目结构

```
/
├── src/
│   ├── app/                # Next.js App Router, 页面和 API 路由
│   │   └── api/kpi/route.ts# 核心 KPI 计算 API
│   ├── components/         # 可复用的 React 组件
│   ├── lib/                # 核心逻辑库
│   │   ├── calculations/   # 后端计算逻辑
│   │   ├── parsers/        # 数据解析
│   │   └── validations/    # 数据验证
│   ├── store/              # Zustand 全局状态管理
│   └── types/              # 全局类型定义
├── prisma/
│   └── schema.prisma       # Prisma 数据模型定义
└── 开发文档/
    ├── 01_features/        # 各功能模块的详细 PRD
    ├── 02_decisions/       # 架构决策记录 (ADR)
    └── 03_technical_design/# 核心技术设计文档
```

### 核心逻辑入口

- **数据模型**: `prisma/schema.prisma`
- **核心计算逻辑**: `src/app/api/kpi/route.ts`
- **前端主页面**: `src/app/page.tsx`

### 完整开发文档

本项目拥有一个全面的、与代码同步更新的“活文档”知识库。所有关于功能需求、架构决策、数据结构和核心算法的深入信息，都集中存放在 `开发文档/` 目录中。

**在开始任何开发工作前，请务必首先阅读 [开发文档/README.md](开发文档/README.md) 以了解整个知识库的结构和使用方法。**

## 🤝 贡献指南

我们欢迎任何形式的贡献！无论是功能建议、代码修复还是文档改进。请遵循以下基本流程：

1.  Fork 本仓库。
2.  创建一个新的分支 (`git checkout -b feature/your-feature-name`)。
3.  提交您的修改 (`git commit -m 'feat: Add some amazing feature'`)。
4.  推送您的分支 (`git push origin feature/your-feature-name`)。
5.  创建一个 Pull Request。

### 代码风格

- 遵循 TypeScript 编码规范。
- 使用 Prettier 格式化代码。
- 所有新功能都必须 accompanied by 单元测试。

### 文档更新

- 所有对功能、架构或数据模型的重大变更都必须更新 `开发文档/` 目录中的相关文档。
- 保持文档与代码的高度同步。

## 从本地推送到 GitHub

> 目标远程仓库：`https://github.com/alongor666/insuralytics.git`

### 首次推送（本地未初始化或无远程）

```bash
# 在项目根目录初始化 Git（如尚未初始化）
git init

# 添加并提交当前代码
git add .
git commit -m "feat: initial commit"

# 统一主分支为 main
git branch -M main

# 添加远程仓库
git remote add origin https://github.com/alongor666/insuralytics.git

# 推送到远程 main 分支，并建立跟踪
git push -u origin main
```

### 常规更新推送（已配置远程）

```bash
# 提交改动
git add -A
git commit -m "chore: update docs and features"

# 先与远程同步（推荐使用 rebase 保持线性历史）
git pull --rebase origin main

# 推送到远程
git push
```

### 远程检查与修正

```bash
# 查看当前远程
git remote -v

# 如果需要，修正远程地址
git remote set-url origin https://github.com/alongor666/insuralytics.git
```

- 若使用 HTTPS 推送，Git 可能会要求输入 GitHub 个人访问令牌（PAT）作为密码，请确保令牌具备 `repo` 权限。
- 若使用 SSH，请先配置本机 SSH Key 并在 GitHub 账号中添加公钥，然后将远程改为 SSH 地址。

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源许可证。