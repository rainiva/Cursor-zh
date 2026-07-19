# 翻译分析

## 文档类型

Cursor 中文增强工具的架构设计规格，面向维护者和实施工程师。文风应准确、克制、可执行。

## 术语约定

- Update-Resilient Translation Safety Net：抗更新翻译安全网
- translation unit：翻译单元
- semantic locator：语义定位器
- runtime fallback：运行时兜底
- surface：界面域
- shard：分片
- update admission：更新准入
- postcondition：后置条件
- quarantine report：隔离报告
- drift：漂移
- degraded：降级
- blocked：阻断
- contract：合约

代码标识、文件路径、命令、状态枚举及数值预算保持原样，不翻译代码块中的接口字段。

## 翻译难点

- `surface` 在本文中不是视觉表面，而是拥有独立作用域和生命周期的界面功能域，统一译为“界面域”。
- `fallback` 强调主路径失败后的确定性替代方案，统一译为“兜底”。
- `admission` 是安装更新能否进入提交阶段的门控机制，统一译为“准入”。
- 保留 `resolved`、`fallback`、`blocked` 等机器可读状态，同时在正文中补充中文含义。

