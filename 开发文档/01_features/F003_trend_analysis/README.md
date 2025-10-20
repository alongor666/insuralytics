# 趋势分析图表模块

> **状态**: 🚧 partial
> **优先级**: P0
> **完整度**: 70%
> **版本**: v1.3.0
> **最后验证**: 2025-10-20

## 功能概述

52周时间序列趋势图,支持异常检测、趋势拟合和区间选择

## 核心能力

- ✅ **趋势图表**: Recharts三线图(签单/满期/赔付率)
- ✅ **异常检测**: Z-Score/IQR/MAD三种算法
- ✅ **趋势拟合**: 线性回归/移动平均/指数平滑
- ✅ **区间选择**: Brush组件支持时间范围筛选
- ✅ **图例联动**: 点击图例显隐系列,悬浮高亮

## 实现文件

### 核心文件 (3/3)

- ✅ [`src/components/features/trend-chart.tsx`](../../../src/components/features/trend-chart.tsx)
- ✅ [`src/lib/analytics/anomaly-detection.ts`](../../../src/lib/analytics/anomaly-detection.ts)
- ✅ [`src/lib/analytics/trend-fitting.ts`](../../../src/lib/analytics/trend-fitting.ts)

### 增强功能

- ⏳ anomaly_detection
- ⏳ trend_fitting

## 相关决策

- [ADR-004](../../02_decisions/ADR-004.md)

## 测试覆盖

- [ ] 单元测试
- [ ] 集成测试
- [ ] 端到端测试

## 技术栈

- **图表库**: Recharts 3.x
- **算法**: Z-Score, IQR, MAD, Linear Regression

---

*本文档基于代码分析自动生成*
*生成时间: 2025-10-20T16:03:18.876Z*
