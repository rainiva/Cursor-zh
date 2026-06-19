# 兼容性说明

## 当前已验证

| 项目 | 版本 |
|---|---|
| Cursor | `3.8.11` |
| VS Code 内核 | `1.105.1` |
| 官方中文语言包 | `1.105.0` |
| 平台 | Windows |

## 维护策略

- 每次 Cursor 大版本更新后，先本地验证，再更新这里
- 这里只承诺“已验证版本可用”
- 不承诺所有未来版本自动兼容

## 已知边界

- 只支持 Windows Cursor
- 默认运行模式为 `performance`（轻量），不再默认开启 Marketplace 第三方描述在线翻译
- `performance` 模式保留静态汉化与作用域内 DOM 监听，不做持续性全局轮询，也不安排延迟补扫
- 需要更强补扫时可使用 `compatibility` 模式（`apply --runtime-mode compatibility`）
- 品牌名、模型名、技能 ID、命令 ID、技术缩写默认保留原文
