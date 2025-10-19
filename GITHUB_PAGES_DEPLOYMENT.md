# GitHub Pages 部署指南

## 项目概述

本项目是一个基于 Next.js 14 的保险数据分析平台，已配置为支持 GitHub Pages 静态部署。

## 部署要求

- Node.js 18+ 
- GitHub 仓库
- GitHub Pages 功能已启用

## 自动部署配置

### 1. GitHub Actions 工作流

项目已配置自动部署工作流 `.github/workflows/deploy.yml`，当推送到 `main` 分支时会自动触发部署。

### 2. Next.js 静态导出配置

`next.config.mjs` 已配置为静态导出模式：

```javascript
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/insurance-analytics' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/insurance-analytics/' : '',
}
```

## 部署步骤

### 方法一：自动部署（推荐）

1. 将代码推送到 GitHub 仓库的 `main` 分支
2. GitHub Actions 会自动构建并部署到 GitHub Pages
3. 访问 `https://[用户名].github.io/[仓库名]/` 查看部署结果

### 方法二：手动部署

1. 本地构建静态文件：
   ```bash
   npm run build
   ```

2. 部署到 GitHub Pages：
   ```bash
   npm run deploy
   ```

## GitHub Pages 设置

1. 进入 GitHub 仓库设置页面
2. 找到 "Pages" 选项
3. 选择 "Deploy from a branch"
4. 选择 `gh-pages` 分支作为源
5. 保存设置

## 项目特性

### ✅ 兼容 GitHub Pages 的特性

- **纯前端应用**：使用客户端渲染，无服务端依赖
- **静态资源**：所有数据文件存储在 `public/data/` 目录
- **客户端数据处理**：CSV 解析和数据分析在浏览器中完成
- **响应式设计**：支持各种设备和屏幕尺寸

### 🔧 已优化配置

- **图片优化**：禁用 Next.js 图片优化以支持静态导出
- **路径配置**：正确配置 basePath 和 assetPrefix
- **构建优化**：启用 trailingSlash 以确保路由正常工作

## 故障排除

### 常见问题

1. **页面显示 404**
   - 检查 GitHub Pages 设置是否正确
   - 确认 basePath 配置与仓库名匹配

2. **资源加载失败**
   - 检查 assetPrefix 配置
   - 确认静态资源路径正确

3. **构建失败**
   - 检查 Node.js 版本是否为 18+
   - 运行 `npm install` 确保依赖安装完整

### 本地测试

在部署前可以本地测试静态构建：

```bash
# 构建静态文件
npm run build

# 预览构建结果（可选）
npx serve out
```

## 更新部署

每次代码更新后，只需推送到 `main` 分支，GitHub Actions 会自动重新部署。

## 技术栈

- **框架**：Next.js 14
- **UI 库**：Tailwind CSS + shadcn/ui
- **图表库**：Recharts
- **数据处理**：Papa Parse (CSV)
- **部署**：GitHub Pages + GitHub Actions

## 联系支持

如遇到部署问题，请检查：
1. GitHub Actions 构建日志
2. 浏览器开发者工具控制台
3. GitHub Pages 设置页面状态