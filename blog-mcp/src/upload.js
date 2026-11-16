/**
 * 上传前的本地校验。
 *
 * 为什么必须在这里拒绝：模型被提示注入后可以把任意本地文件上传成一个公开
 * URL，这是整个客户端最现实的一条外泄路径。所有拒绝都要发生在读取文件内容
 * 之前 —— 只有本函数返回之后，调用方才允许调用 `openAsBlob`。
 */
import { statSync } from 'node:fs'
import { delimiter, extname, isAbsolute, resolve, sep } from 'node:path'

// 与服务端 `MAX_UPLOAD_BYTES` 保持一致
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']

/**
 * 按路径段判断包含关系，避免 `/root` 误匹配 `/root-other`。
 * @param {string} filePath 已 resolve 的绝对路径
 * @param {string[]} roots 已 resolve 的允许根目录
 * @returns {boolean}
 */
function withinRoots(filePath, roots) {
  return roots.some((root) => {
    if (filePath === root) return true
    const prefix = root.endsWith(sep) ? root : `${root}${sep}`
    return filePath.startsWith(prefix)
  })
}

/**
 * 校验待上传的本地图片路径，返回可交给 `openAsBlob` 的绝对路径。
 *
 * @param {string} filePath 用户/模型给出的路径
 * @param {NodeJS.ProcessEnv} [env] 默认 process.env，测试可注入
 * @returns {string} 绝对路径
 * @throws {Error} 中文原因：非绝对路径、扩展名不允许、不在允许根目录、不存在、超过 50 MB
 */
export function validateUploadPath(filePath, env = process.env) {
  const requested = String(filePath ?? '').trim()
  if (!requested) throw new Error('上传路径不能为空')
  if (!isAbsolute(requested)) throw new Error(`上传路径必须是绝对路径: ${requested}`)

  const absolutePath = resolve(requested)
  const extension = extname(absolutePath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error(`只允许上传图片，扩展名须为 .jpg/.jpeg/.png/.webp/.gif/.avif: ${absolutePath}`)
  }

  // 白名单可选用途：把模型能碰到的文件限制在指定目录下
  const roots = String(env.BLOG_MCP_UPLOAD_ROOTS ?? '')
    .split(delimiter)
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => resolve(value))
  if (roots.length > 0 && !withinRoots(absolutePath, roots)) {
    throw new Error(`上传路径不在 BLOG_MCP_UPLOAD_ROOTS 允许范围内: ${absolutePath}`)
  }

  let stats
  try {
    stats = statSync(absolutePath)
  } catch {
    throw new Error(`文件不存在: ${absolutePath}`)
  }
  if (!stats.isFile()) throw new Error(`不是普通文件: ${absolutePath}`)
  if (stats.size > MAX_UPLOAD_BYTES) throw new Error(`文件超过 50 MB 上限: ${absolutePath}`)

  return absolutePath
}
