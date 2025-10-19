/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // GitHub Pages 部署时的基础路径（如果仓库名不是用户名.github.io）
  basePath: process.env.NODE_ENV === 'production' ? '/insuralytics' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/insuralytics/' : '',
};

export default nextConfig;
