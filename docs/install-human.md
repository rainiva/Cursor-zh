# 人工安装说明

## 前提

- 你已经安装好 Windows 版 Cursor
- 你的电脑里有 `Node.js`
- 你已经把这个仓库拉到本地

## 安装步骤

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

脚本会做这些事：

- 查找 Cursor 安装目录
- 检查官方中文语言包
- 生成汉化产物
- 默认启用轻量汉化模式
- 修补启动入口
- 生成桌面快捷方式
- 在仓库根目录生成 `.cmd` 启动脚本

## 安装后验证

执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```

重点看：

- 是否找到 Cursor 安装目录
- 语言包是否兼容
- `verify` 是否全绿

## 日常启动

优先用下面任一方式启动：

- 桌面上的 `Cursor 中文版.lnk`
- 仓库根目录的 `start-cursor-zh.cmd`

这两个入口现在都是快速启动路径，只负责直接启动 Cursor，不会在启动前自动执行 `ensure`、校验或修复。
如果你刚更新过 Cursor，或者怀疑安装状态有变化，请先手动运行 `ensure` 或 `doctor.ps1`，再启动。

## 卸载

执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```
