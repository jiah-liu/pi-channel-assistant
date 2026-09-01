// ============================================================================
// 媒体处理：图片/文件下载、解密、保存
// ============================================================================

import { randomUUID } from 'node:crypto'
import { createDecipheriv } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { debugLog, redactUrl } from './logger.js'
import { withTimeout } from './utils.js'
import { CDN_BASE } from './constants.js'

// --- AES 解密 ---

function aesDecryptECB(encrypted: Buffer, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== 16) {
    throw new Error(`Invalid AES key length: ${key.length}, expected 16`)
  }
  const decipher = createDecipheriv('aes-128-ecb', key, null)
  decipher.setAutoPadding(false)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  const padLen = decrypted[decrypted.length - 1]
  if (padLen < 1 || padLen > 16) return decrypted
  const padding = decrypted.subarray(decrypted.length - padLen)
  if (!padding.every(byte => byte === padLen)) return decrypted
  return decrypted.subarray(0, decrypted.length - padLen)
}

async function readResponseLimited(response: Response, maxBytes: number): Promise<Buffer | null> {
  const contentLength = Number(response.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null
  if (!response.body) return Buffer.alloc(0)

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks)
  } finally {
    reader.releaseLock()
  }
}

// --- 图片 ---

export interface ImageData {
  data: string  // base64
  mediaType: string
}

export async function fetchImageAsBase64(
  url: string,
  aesKey: string | undefined,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<ImageData | null> {
  try {
    debugLog(`下载图片: ${redactUrl(url)}, aesKey=${aesKey ? 'provided' : 'none'}, max=${maxBytes}`)
    const response = await fetch(url, { signal: withTimeout(signal, 30_000) })
    if (!response.ok) {
      debugLog(`图片下载失败: HTTP ${response.status}`)
      return null
    }
    const rawContentType = response.headers.get('content-type') ?? ''
    const contentType = rawContentType.toLowerCase().startsWith('image/') ? rawContentType : 'image/jpeg'
    if (rawContentType && !rawContentType.toLowerCase().startsWith('image/') && !aesKey) {
      debugLog(`图片下载失败: 非图片 content-type=${rawContentType}`)
      return null
    }
    const buffer = await readResponseLimited(response, maxBytes)
    if (!buffer) {
      debugLog(`图片下载失败: 超过限制 ${maxBytes}`)
      return null
    }
    debugLog(`图片下载成功: ${buffer.byteLength} bytes, type=${contentType}`)
    const imageBuffer = aesKey ? aesDecryptECB(buffer, aesKey) : buffer
    if (aesKey) debugLog(`图片解密成功: ${imageBuffer.length} bytes`)
    return { data: imageBuffer.toString('base64'), mediaType: contentType }
  } catch (err) {
    debugLog(`图片下载异常: ${err}`)
    return null
  }
}

// --- 文件 ---

export async function fetchFile(
  encryptParam: string,
  aesKey: string | undefined,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<Buffer | null> {
  try {
    const url = `${CDN_BASE}/download?encrypted_query_param=${encodeURIComponent(encryptParam)}`
    debugLog(`下载文件: ${redactUrl(url)}`)
    const response = await fetch(url, { signal: withTimeout(signal, 60_000) })
    if (!response.ok) {
      debugLog(`文件下载失败: HTTP ${response.status}`)
      return null
    }
    const buffer = await readResponseLimited(response, maxBytes)
    if (!buffer) {
      debugLog(`文件下载失败: 超过限制 ${maxBytes}`)
      return null
    }
    debugLog(`文件下载成功: ${buffer.byteLength} bytes`)
    if (aesKey) {
      const hexKey = Buffer.from(aesKey, 'base64').toString('utf-8')
      const decrypted = aesDecryptECB(buffer, hexKey)
      debugLog(`文件解密成功: ${decrypted.length} bytes`)
      return decrypted
    }
    return buffer
  } catch (err) {
    debugLog(`文件下载异常: ${err}`)
    return null
  }
}

// --- 文件保存到磁盘 ---

export async function saveFileToDisk(
  buffer: Buffer,
  fileName: string,
  wechatFilesDir: string,
): Promise<string | null> {
  try {
    await fs.mkdir(wechatFilesDir, { recursive: true })
    const safeName = fileName.replace(/[^\w.\-\u4e00-\u9fff]/g, '_')
    const uniqueName = `${Date.now().toString(36)}_${randomUUID().slice(0, 8)}_${safeName}`
    const filePath = path.join(wechatFilesDir, uniqueName)
    await fs.writeFile(filePath, buffer)
    return filePath
  } catch (err) {
    debugLog(`文件保存失败: ${err}`)
    return null
  }
}
