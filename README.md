<h1 align="center">pi-wechat-assistant</h1>

<p align="center">将微信作为 <a href="https://github.com/earendil-works/pi-coding-agent">pi</a> 会话的安全远程入口。</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/中文-当前-blue" alt="中文"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-switch-lightgrey" alt="Switch to English"></a>
  <a href="https://www.npmjs.com/package/%40jiah-liu%2Fpi-wechat-assistant"><img src="https://img.shields.io/npm/v/%40jiah-liu%2Fpi-wechat-assistant?color=blue" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

> GitHub README 不支持安全的页面内脚本切换语言；语言按钮会打开对应的单语言文档，因此每页只显示一种语言。

## 是什么

这是面向**一个授权微信用户和一个 pi 会话**的扩展。微信消息会被送入当前 pi Agent，最终回复回传微信；电脑端仍可继续使用同一会话。

它不是公共聊天机器人。微信用户可影响本机 Agent、模型和工具配置，因此必须先完成授权。

## 安装

```bash
pi install npm:@jiah-liu/pi-wechat-assistant
# 或
pi install git:github.com/jiah-liu/pi-wechat-assistant
```

开发环境：Node.js >= 20.3。

```bash
npm install
npm run typecheck
npm test
```

## 首次使用

1. 在服务器或本机 pi TUI 中执行：
   ```text
   /wechat login
   /wechat start
   ```
2. 用微信扫描二维码。
3. 让准备使用该会话的微信账号发送一条消息。
4. TUI 会弹出 30 秒授权确认；确认后，该账号成为唯一可控制此会话的微信用户。

没有 TUI 时，可在 `/wechat status` 中查看“已见用户”，再手动授权：

```text
/wechat config user <微信用户ID>
```

未授权的微信消息不会注入 Agent，也不会执行远程命令。

## pi TUI 命令

| 命令 | 说明 |
| --- | --- |
| `/wechat login` | 扫码登录或加载本地凭证 |
| `/wechat login --force` | 清除旧会话并重新扫码 |
| `/wechat start` | 启动微信桥接 |
| `/wechat stop` | 停止桥接并释放锁 |
| `/wechat status` | 查看连接、账号、已见用户和队列状态 |
| `/wechat logout` | 停止并清除凭证、上下文 token |
| `/wechat autostart` | 切换 pi 会话启动时自动连接 |
| `/wechat config` | 查看配置 |
| `/wechat config user <id>` | 设置唯一授权微信用户 |
| `/wechat config image-wait <ms>` | 设置图片批量等待时间，默认 8000ms |
| `/wechat config image-max <MB>` | 设置单个图片或文件上限，默认 50MB |

## 微信端操作

直接发送文字、语音、图片或文件即可对话。内容会带上“微信消息”来源标记送给 Agent；当 Agent 正忙时，后续消息会标为“微信追加消息”。

| 命令 | 说明 |
| --- | --- |
| `/help` | 显示命令帮助 |
| `/status` | 查看模型、上下文、工具数、队列和图片限制 |
| `/task` | 查看当前任务、运行时长和当前步骤 |
| `/pending` | 查看待确认操作及剩余时间 |
| `/start` 或 `开始` | 立即处理当前图片/文件批次 |
| `/stop` | 中止当前 Agent 生成 |
| `/cancel` 或 `取消` | 取消尚未开始的图片/文件批次 |
| `/model` | 查看带编号的模型列表 |
| `/model <名称或编号>` | 请求切换模型（需确认码） |
| `/thinking <level>` | 设置 thinking level |
| `/tools` | 查看活跃工具 |
| `/tools <名称...>` | 请求修改活跃工具（需确认码） |
| `/compact` | 请求压缩上下文（需确认码） |
| `/name <名称>` | 设置 pi 会话名称 |
| `/session` | 查看会话统计与文件位置 |
| `/config` | 查看图片/文件限制 |
| `/login <provider>` | 请求登录指引（需确认码） |
| `/confirm <code>` | 执行待确认操作 |

未知的 `/命令` 不会再被发送给 Agent，而会提示使用 `/help`。

### 微信确认码

模型切换、工具集变更、上下文压缩和登录请求均返回一次性确认码：

```text
⚠️ 即将切换模型到 openai/gpt-5。回复 /confirm A1B2C3 执行（5 分钟内有效）
```

确认码只对当前授权微信用户有效、执行一次即失效；新的待确认请求会替换旧请求。发送 `/pending` 可查看操作与剩余时间。这让无头 Linux 服务器无需为日常远程控制打开 TUI。

## Linux 服务器上的账号登录

微信可以请求 `/login openai` 并用确认码确认；确认后会返回服务器端登录指引。OAuth 是否能完全在手机完成取决于 provider：

- **支持 Device Code 的 provider**：可以在手机浏览器输入设备码并完成授权。
- **仅支持 localhost OAuth 回调的 provider**：仍需在有浏览器的一端完成回调。推荐 SSH 隧道：
  ```bash
  ssh -L <本地端口>:localhost:<服务器端口> user@server
  ```
  然后在本机浏览器打开授权页。

不要把包含 OAuth `state`、PKCE 数据或 token 的链接长期转发到聊天记录中。扩展不会通过微信传递 cookie、回调参数或凭证。

## 消息、图片与文件

- 连续图片默认等待 8 秒，用于合并图片和补充文字；收到文字会立即开始处理。
- 图片和文件会先收到回执，再收到“处理中”与最终 Agent 回复。
- `/cancel` 仅取消尚未注入 Agent 的批次，不能撤销已开始的 Agent 操作。
- 文件保存于项目目录：`.pi-wechat-files/`。文件名会被净化并加随机前缀。
- 单个图片和文件受 `image-max` 限制；下载采用限额流式读取，避免占满内存。
- Agent 可调用 `send_file_to_wechat` 和 `send_image_to_wechat` 发送项目内产物；符号链接、目录及项目外实际路径会被拒绝。

当你在 TUI 输入普通文本时，微信会收到“已切换到电脑端”的提示；之后回复仅在 TUI 显示，直到新的微信输入开始下一轮远程对话。

## 安全模型

- 一个 pi 会话只允许一个微信用户。
- 凭证、上下文 token 和轮询 cursor 保存在 `~/.pi/agent/wechat-assistant/`，目录权限为 `0700`，文件权限为 `0600`。
- 进程间通过原子锁保证同一微信账号不会被多个 pi 实例同时轮询。
- 微信上下文会要求 Agent 在删除、覆盖、提交、推送、外发文件等不可逆操作前先获取明确确认。
- 这不是沙箱：授权微信用户仍可向具备工具权限的 Agent 下达请求。请只授权你自己的账号，并保留 pi 原有的工具权限策略。

## 配置

环境变量：

| 变量 | 默认值 | 说明 |
| --- | ---: | --- |
| `PI_WECHAT_DEBUG` | 未启用 | 设为 `1` 开启调试日志 |
| `PI_WECHAT_DEBUG_FILE` | `~/.pi/agent/wechat-assistant/debug.log` | 调试日志路径 |
| `PI_WECHAT_IMAGE_BATCH_WAIT_MS` | `8000` | 图片批处理等待毫秒数 |
| `PI_WECHAT_IMAGE_MAX_BYTES` | `52428800` | 单个媒体下载上限 |

状态文件：

```text
~/.pi/agent/wechat-assistant/
├── credentials.json
├── config.json
├── context-tokens.json
├── update-cursor.json
└── session.lock
```

`config.json` 示例：

```json
{
  "autoStart": true,
  "allowedUserId": "微信用户ID",
  "imageBatchWaitMs": 8000,
  "imageMaxBytes": 52428800
}
```

## 故障排查

- **没有回复**：在 TUI 执行 `/wechat status`；确认桥接运行、已授权用户正确、会话未过期。
- **会话过期**：执行 `/wechat login --force`。
- **被其他实例占用**：在持锁实例执行 `/wechat stop`，或等待异常进程退出后重新启动。
- **图片/文件失败**：检查 `image-max`、网络和调试日志；文件需在限制以内。
- **OAuth 无法在手机完成**：provider 可能不支持 Device Code；使用服务器 TUI 或 SSH 隧道完成本机回调。

## 许可证

[MIT](LICENSE)
