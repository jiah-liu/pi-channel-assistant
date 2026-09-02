import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'

vi.mock('node:os', () => ({ homedir: () => '/tmp/pi-wechat-assistant-auth-test' }))

import { acquireLock, getStateDir, releaseLock } from '../src/auth.js'

const lockPath = `${getStateDir()}/session.lock`

beforeEach(async () => {
  await rm(getStateDir(), { recursive: true, force: true })
})

afterEach(async () => {
  await rm(getStateDir(), { recursive: true, force: true })
})

describe('微信会话锁', () => {
  it('释放后可由新会话获取', async () => {
    expect((await acquireLock('first')).success).toBe(true)
    await releaseLock('first')
    expect((await acquireLock('second')).success).toBe(true)
  })

  it('清理已退出进程留下的锁', async () => {
    await mkdir(getStateDir(), { recursive: true })
    await writeFile(lockPath, JSON.stringify({ pid: 1_999_999_999, sessionId: 'stale', timestamp: 0 }))
    expect((await acquireLock('new')).success).toBe(true)
  })
})
