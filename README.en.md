<h1 align="center">pi-channel-assistant</h1>

<p align="center">An extensible, secure remote entry point for a <a href="https://github.com/earendil-works/pi-coding-agent">pi</a> session; currently supporting WeChat.</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/中文-switch-lightgrey" alt="Switch to Chinese"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-current-blue" alt="English"></a>
  <a href="https://www.npmjs.com/package/%40jiah-liu%2Fpi-channel-assistant"><img src="https://img.shields.io/npm/v/%40jiah-liu%2Fpi-channel-assistant?color=blue" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

> GitHub READMEs cannot safely run in-page language-switching JavaScript. Each language button opens a single-language document, so only one language is shown per page.

## Overview

This pi extension connects **one authorized WeChat user** to **one pi session**. WeChat messages are sent to the active Agent and final replies are returned to WeChat; the same session remains usable from the TUI.

It is not a public chatbot. A WeChat user can influence a local Agent, its model, and its tools, so authorization is required.

## Install

```bash
pi install npm:@jiah-liu/pi-channel-assistant
# or
pi install git:github.com/jiah-liu/pi-wechat-assistant
```

Development requires Node.js >= 20.3:

```bash
npm install
npm run typecheck
npm test
```

## First use

1. In the pi TUI, run:
   ```text
   /wechat login
   /wechat start
   ```
2. Scan the QR code in WeChat.
3. Have the intended WeChat user send one message.
4. The TUI shows a 30-second authorization prompt. Approve it to bind that user to this session.

On a headless server, send a message first, inspect **Known users** via `/wechat status`, then authorize manually:

```text
/wechat config user <WECHAT_USER_ID>
```

Unauthorized messages are never injected into the Agent and cannot run remote commands.

## pi TUI commands

| Command | Description |
| --- | --- |
| `/wechat login` | Scan in or load saved credentials |
| `/wechat login --force` | Clear the old session and scan again |
| `/wechat start` / `/wechat stop` | Start or stop the bridge |
| `/wechat status` | Show connection, account, known users, and queue state |
| `/wechat logout` | Stop and clear credentials/context tokens |
| `/wechat autostart` | Toggle startup connection |
| `/wechat config user <id>` | Set the sole authorized WeChat user |
| `/wechat config image-wait <ms>` | Image batch wait; default 8000ms |
| `/wechat config image-max <MB>` | Per-image/per-file limit; default 50MB |

## WeChat commands

Send text, voice, images, or files for normal Agent interaction. Input is labelled as a WeChat message; while the Agent is busy, new input is labelled as a WeChat follow-up.

| Command | Description |
| --- | --- |
| `/help` | Command help |
| `/status` | Model, context, tools, queue, and media limits |
| `/task` | Current task, elapsed time, and active step |
| `/pending` | Pending confirmation and time remaining |
| `/start` or `开始` | Start the current image/file batch immediately |
| `/stop` | Abort the active Agent run |
| `/cancel` or `取消` | Discard an image/file batch not yet started |
| `/model` / `/model <name-or-number>` | List numbered models / request a model change |
| `/thinking <level>` | Set thinking level |
| `/tools` / `/tools <names>` | List tools / request an active-tool change |
| `/compact` | Request context compaction |
| `/name <name>` | Set the session name |
| `/session` | Session details and statistics |
| `/config` | Media configuration |
| `/login <provider>` | Request login instructions |
| `/confirm <code>` | Execute a pending operation |

Unknown slash commands are not passed to the Agent; they return a `/help` hint instead.

### Confirmation codes

Model changes, tool changes, compaction, and login requests return a one-time code:

```text
⚠️ About to switch model to openai/gpt-5. Reply /confirm A1B2C3 to execute (valid for 5 minutes)
```

A code works only for the authorized WeChat user, expires after five minutes, is consumed after use, and a newer request replaces an older one. Use `/pending` to inspect it. This supports headless Linux servers without requiring a TUI confirmation for routine remote control.

## Login on a Linux server

`/login openai` can be requested and confirmed from WeChat; it then returns the server-side login instruction. Completing OAuth on a phone depends on the provider:

- **Device Code support:** complete the authorization from a mobile browser.
- **localhost-only OAuth callbacks:** complete the callback from a browser that can reach the server callback, commonly through an SSH tunnel:
  ```bash
  ssh -L <local-port>:localhost:<server-port> user@server
  ```

Do not retain or forward OAuth URLs containing `state`, PKCE data, or tokens in chat history. This extension never relays cookies, callback parameters, or credentials through WeChat.

## Media behaviour

- Images wait up to eight seconds for batching; a text supplement starts processing immediately.
- Media receives an acknowledgement, a processing update, and the final Agent response.
- `/cancel` affects only work not yet injected into the Agent.
- Received files are saved in `.pi-wechat-files/` under the project, with sanitized, randomized names.
- Images and files use bounded streaming downloads to protect memory and disk.
- `send_file_to_wechat` and `send_image_to_wechat` only allow ordinary files whose real paths remain inside the project; symlinks and directories are rejected.

Typing ordinary text in the TUI notifies WeChat that the session has moved to the computer; replies then remain in the TUI until the next WeChat turn.

## Security

- One pi session permits one WeChat user.
- Credentials, context tokens, and update cursor live in `~/.pi/agent/wechat-assistant/`, with directory mode `0700` and file mode `0600`.
- An atomic lock prevents two pi instances from polling the same account.
- The WeChat-specific Agent prompt requires explicit confirmation before destructive, irreversible, or external-output actions.
- This is not a sandbox. Only authorize your own WeChat account and retain pi's normal tool-permission policy.

## Configuration

| Variable | Default | Description |
| --- | ---: | --- |
| `PI_WECHAT_DEBUG` | disabled | Set to `1` for debug logs |
| `PI_WECHAT_DEBUG_FILE` | `~/.pi/agent/wechat-assistant/debug.log` | Debug log path |
| `PI_WECHAT_IMAGE_BATCH_WAIT_MS` | `8000` | Image batch delay in milliseconds |
| `PI_WECHAT_IMAGE_MAX_BYTES` | `52428800` | Per-media download limit |

```text
~/.pi/agent/wechat-assistant/
├── credentials.json
├── config.json
├── context-tokens.json
├── update-cursor.json
└── session.lock
```

```json
{
  "autoStart": true,
  "allowedUserId": "WECHAT_USER_ID",
  "imageBatchWaitMs": 8000,
  "imageMaxBytes": 52428800
}
```

## Troubleshooting

- **No reply:** run `/wechat status`; verify bridge state, authorized user, and session validity.
- **Expired session:** run `/wechat login --force`.
- **Account locked by another instance:** stop that instance with `/wechat stop`.
- **Media failure:** check `image-max`, connectivity, and debug logs.
- **OAuth cannot finish on a phone:** use a Device Code provider or finish the localhost callback through the TUI/SSH tunnel.

## License

[MIT](LICENSE)
