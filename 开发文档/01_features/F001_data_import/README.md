# 数据上传与解析模块

> **状态**: 🚧 partial
> **优先级**: P0
> **完整度**: 80%
> **版本**: v2.1.0
> **最后验证**: 2025-10-20

## 功能概述

提供CSV/JSON文件上传、解析、验证和预处理能力,支持批量导入和智能纠错

## 核心能力

- ✅ **文件上传**: 支持拖拽和点击上传,最大200MB
- ✅ **CSV流式解析**: 使用Papa Parse分块处理,避免内存溢出
- ✅ **数据验证**: 基于Zod Schema的26字段验证
- ✅ **智能纠错**: 模糊匹配修正枚举值错误
- 🚧 **批量导入**: 并行处理多文件上传
- 🚧 **错误详情展示**: 友好的错误列表和修复建议

## 实现文件

### 核心文件 (4/4)

- ✅ [`src/components/features/file-upload.tsx`](../../../src/components/features/file-upload.tsx)
- ✅ [`src/lib/parsers/csv-parser.ts`](../../../src/lib/parsers/csv-parser.ts)
- ✅ [`src/lib/validations/insurance-schema.ts`](../../../src/lib/validations/insurance-schema.ts)
- ✅ [`src/hooks/use-file-upload.ts`](../../../src/hooks/use-file-upload.ts)

### 增强功能

- ✅ fuzzy_match
- ⏳ batch_upload
- ⏳ error_handling

## 相关决策

- [ADR-002](../../02_decisions/ADR-002.md)
- [ADR-003](../../02_decisions/ADR-003.md)

## 相关问题

- [ISSUE-001](../../archive/问题记录表.md#issue-001)
- [ISSUE-003](../../archive/问题记录表.md#issue-003)

## 测试覆盖

- [ ] 单元测试
- [ ] 集成测试
- [ ] 端到端测试

## 技术栈

- **CSV解析**: Papa Parse 5.x
- **数据验证**: Zod 4.x
- **模糊匹配**: Levenshtein距离算法

---

*本文档基于代码分析自动生成*
*生成时间: 2025-10-20T16:03:18.875Z*
