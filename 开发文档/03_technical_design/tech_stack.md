# 技术栈与开发环境

本文档概述了车险分析平台所采用的技术栈、关键库以及本地开发环境的配置指南。

## 核心技术栈

- **前端**: Next.js (React 框架)
  - **UI 库**: shadcn/ui (基于 Radix UI 和 Tailwind CSS)
  - **图表**: Recharts
  - **状态管理**: Zustand
  - **数据请求**: 原生 `fetch` API

- **后端**: Node.js
  - **核心框架**: 无特定框架，使用原生 Node.js API
  - **数据库 ORM**: Prisma

- **数据库**: Supabase (PostgreSQL)

- **部署**: Vercel

- **开发语言**: TypeScript

## 关键第三方库

- **`papaparse`**: 用于在前端解析 CSV 文件，实现客户端数据预览与初步验证。
- **`zod`**: 用于定义数据结构（Schema）并执行严格的数据验证，确保进入系统的数据符合预设格式。
- **`date-fns`**: 提供可靠的日期处理功能，用于处理 `snapshot_date` 等时间序列数据。

## 本地开发环境

### 环境设置

1.  **安装 Node.js**: 确保已安装 Node.js 18.x 或更高版本。
2.  **安装 pnpm**: 使用 `npm install -g pnpm` 安装 pnpm 包管理器。
3.  **安装依赖**: 在项目根目录下运行 `pnpm install`。
4.  **配置环境变量**: 
    - 复制 `.env.example` 文件为 `.env.local`。
    - 填入 Supabase 数据库连接字符串 (`DATABASE_URL`) 和 Prisma 加速器地址 (`DATABASE_URL_WITH_ACCELERATE`)。

### 常用命令

- **启动开发服务器**: `pnpm dev`
- **生成 Prisma Client**: `pnpm prisma generate`
- **启动 Prisma Studio**: `pnpm prisma studio` (用于本地查看和编辑数据库)

### 本地验证流程

1.  **准备测试数据**: 将待上传的 CSV 文件放置在 `public/` 目录下。
2.  **执行上传**: 在应用前端页面选择文件并点击上传。
3.  **观察输出**: 在浏览器开发者工具的控制台和运行 `pnpm dev` 的终端中查看详细的验证日志和错误信息。