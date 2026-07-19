# 内容分析

## 内容摘要

本文是 Cursor 抗更新翻译安全网的可执行实施计划。核心路线是：先建立稳定翻译身份和更新证据，再引入确定性语义定位，随后实现预构建/提交事务，最后拆分按界面域加载的运行时兜底，并以隔离报告、性能预算和真实生命周期验收收口。

## 术语表

| English | 中文 |
|---|---|
| translation unit | 翻译单元 |
| update capability profile | 更新能力配置 |
| semantic locator | 语义定位器 |
| postcondition | 后置条件 |
| prepared build | 预构建产物 |
| update admission | 更新准入 |
| runtime fallback | 运行时兜底 |
| surface shard | 界面域分片 |
| quarantine report | 隔离报告 |
| drift | 漂移 |
| blocking contract | 阻断级合约 |

`translationId`、函数名、字段名、状态枚举、命令、路径、测试代码和性能数值保持原样。

## 语气与风格

采用准确、克制、可执行的中文工程计划风格。保留严格 RED/GREEN、文件边界、接口、预期失败、提交边界和验收门禁。

## 翻译难点

- `surface` 统一译为“界面域”，不译为视觉意义上的“表面”。
- `fallback` 统一译为“兜底”，强调确定性替代路径。
- `prepared build` 统一译为“预构建产物”，与正式写入安装目录区分。
- 所有代码块必须逐字保留，避免中英文版本接口漂移。

