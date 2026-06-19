# 人工安装说明

## 前提

- Windows 系统，PowerShell 可用
- 已安装 **Node.js >= 18** 且 `node` 在 `PATH` 中
- 本机已安装 Windows 版 Cursor
- Cursor 可用的官方中文语言包（安装时会检查兼容性，详见 [兼容性说明](compatibility.md)）
- 你已经把这个仓库拉到本地

## 推荐入口

克隆后优先使用仓库根目录的 `cursor-zh-menu.cmd`：

- 菜单项 1：安装汉化（apply）
- 菜单项 2：校验并必要时重建（ensure）
- 菜单项 3：只读诊断（verify）
- 菜单项 4：启动 Cursor
- 菜单项 5：卸载汉化

菜单界面目前为英文，功能与下方 PowerShell 命令一致。

## 安装步骤

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Cursor 安装在非常规路径时：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -InstallDir "你的 Cursor 路径"
```

其他常用参数：`-Force`（强制重建）、`-NoShortcut`（不创建桌面快捷方式）。

脚本会做这些事：

- 查找 Cursor 安装目录
- 检查官方中文语言包
- 备份受管文件
- 生成汉化产物
- 默认启用轻量汉化模式
- 修补启动入口
- 生成桌面快捷方式
- 从 `templates/` 同步根目录 `.cmd` 启动脚本

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
- `cursor-zh-menu.cmd` 菜单项 4

以下快捷启动入口不会在启动前自动执行 `ensure`、校验或修复。
如果你刚更新过 Cursor，或者怀疑安装状态有变化，请先手动运行 `ensure` 或 `doctor.ps1`，再启动。

不要直接双击 `Cursor.exe`，否则可能出现「扩展在磁盘上已被修改」弹窗。

## Cursor 更新后

Cursor 自动更新后，建议：

1. 运行 `.\ensure-cursor-zh.cmd` 或 `doctor.ps1`
2. 确认诊断通过后再启动 Cursor

## 卸载

执行下面任一方式：

- 仓库根目录的 `uninstall-cursor-zh.cmd`
- `cursor-zh-menu.cmd` 菜单项 5
- PowerShell 命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

卸载会完整回滚汉化行为：恢复 `package.json` 与 `nls.messages.json`、删除翻译引导与汉化 bundle、恢复/删除 `argv.json` 和 `locale.json`、清理 CLP 语言包缓存、删除 `state/build-manifest.json` 与 `state/generated/`、删除 install 同步的根目录 wrapper cmd 以及 `state/runtime-toggle.json`。不会删除你的 Cursor 用户数据、历史对话与备份目录，也不会删除仓库自带的 `cursor-zh-menu.cmd`。
