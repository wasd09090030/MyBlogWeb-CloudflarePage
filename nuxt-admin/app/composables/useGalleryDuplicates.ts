import { fingerprintBlob } from '~/features/gallery-duplicates/fingerprint'
import { compareImages, exactDuplicateGroups, fingerprintKey, FINGERPRINT_VERSION, reviewCandidates,
  type DuplicateCandidate, type DuplicateImage, type DuplicateMatch, type ExactDuplicateGroup, type GalleryDuplicateCatalog, type ImageFingerprint } from '~~/shared/gallery-duplicates'

export function useGalleryDuplicates(onRemoved: () => Promise<unknown>) {
  const api = useAdminApi()
  const state = reactive({
    open: false, mode: 'scan' as 'scan' | 'import', busy: false, deleting: false, purging: false,
    progress: 0, total: 0, phase: '', fatal: '', cacheWarning: '', notice: '',
    ready: false, allowIncomplete: false,
    catalog: [] as DuplicateImage[], incoming: [] as DuplicateImage[],
    candidates: [] as DuplicateCandidate[], pairs: [] as DuplicateMatch[], groups: [] as ExactDuplicateGroup[], failures: [] as DuplicateImage[]
  })
  let generation = 0
  let controller: AbortController | undefined
  let resolveCheck: ((value: string[] | null) => void) | undefined
  let inputUrls: string[] = []
  let excludedId: number | undefined
  let forceRefresh = false
  const successful = new Map<string, ImageFingerprint>()

  function errorMessage(error: unknown) {
    const value = error as { data?: { data?: { message?: string }; statusMessage?: string }; message?: string; statusCode?: number }
    if (value.statusCode === 401) return '登录已过期，请重新登录后重试'
    return value.data?.data?.message || value.data?.statusMessage || value.message || '图片读取失败'
  }

  async function rebuild() {
    const current = generation
    state.failures = [...state.catalog, ...state.incoming].filter(item => item.error)
    const candidates: DuplicateCandidate[] = []
    const pairs: DuplicateMatch[] = []
    if (state.mode === 'import') {
      const incomplete = state.catalog.some(item => item.error)
      for (let index = 0; index < state.incoming.length; index++) {
        const [item] = reviewCandidates([state.incoming[index]!], [...state.catalog, ...state.incoming.slice(0, index)])
        // Incomplete existing coverage means even unmatched candidates need an explicit choice.
        if (incomplete) item!.keep = false
        candidates.push(item!)
        if (index % 10 === 0) await new Promise(resolve => setTimeout(resolve, 0))
        if (current !== generation) return
      }
    } else {
      for (let index = 0; index < state.catalog.length; index++) {
        const left = state.catalog[index]!
        for (let previous = 0; previous < index; previous++) {
          const match = compareImages(left, state.catalog[previous]!)
          if (match) { pairs.push(match); break }
        }
        if (index % 25 === 0) await new Promise(resolve => setTimeout(resolve, 0))
        if (current !== generation) return
      }
    }
    state.candidates = candidates
    state.pairs = pairs
    state.groups = state.mode === 'scan' ? exactDuplicateGroups(state.catalog) : []
  }

  async function run(force = false) {
    if (state.busy || state.deleting) return
    const current = ++generation
    controller = new AbortController()
    const signal = controller.signal
    state.busy = true
    state.ready = false
    state.fatal = ''
    state.cacheWarning = ''
    state.notice = ''
    state.allowIncomplete = false
    state.progress = 0
    state.total = 0
    state.phase = '读取完整画廊目录'
    state.pairs = []
    state.groups = []
    state.candidates = []
    state.failures = []
    if (force) { successful.clear(); forceRefresh = true }
    try {
      const catalog: DuplicateImage[] = []
      let cursor = 0
      let snapshot: number | undefined
      do {
        const page = await api.get<GalleryDuplicateCatalog>(`gallery/duplicates/catalog?cursor=${cursor}${snapshot === undefined ? '' : `&snapshot=${snapshot}`}`, { cache: false })
        if (current !== generation) return
        snapshot = page.snapshot
        catalog.push(...page.items.filter(item => item.id !== excludedId).map(item => ({
          key: `gallery-${item.id}`, id: item.id, imageUrl: item.imageUrl, sourceUrl: item.sourceUrl,
          sourceKey: fingerprintKey(item.sourceUrl), createdAt: item.createdAt,
          label: `画廊 #${item.id}${item.isActive ? '' : ' · 已隐藏'}${item.createdAt ? ` · ${item.createdAt.slice(0, 10)}` : ''}`
        })))
        if (page.nextCursor === null) break
        if (page.nextCursor <= cursor) throw new Error('画廊分页游标无效，请重试')
        cursor = page.nextCursor
      } while (true)
      const incoming: DuplicateImage[] = inputUrls.map((sourceUrl, index) => ({ key: `incoming-${index}`, sourceUrl, sourceKey: fingerprintKey(sourceUrl), imageUrl: sourceUrl, label: `待导入 #${index + 1}` }))
      const urls = [...new Set([...catalog, ...incoming].map(item => fingerprintKey(item.sourceUrl)))]
      state.total = urls.length
      state.phase = '读取图片并计算视觉指纹'
      if (!forceRefresh) {
        for (let i = 0; i < urls.length; i += 50) {
          const result = await api.post<{ fingerprints: Array<ImageFingerprint & { imageUrl: string }> }>('gallery/duplicates/lookup', { imageUrls: urls.slice(i, i + 50) })
          if (current !== generation) return
          for (const value of result.fingerprints) successful.set(value.imageUrl, value)
        }
      }
      const failures = new Map<string, string>()
      const fresh: Array<ImageFingerprint & { imageUrl: string }> = []
      let next = 0
      const worker = async () => {
        while (next < urls.length && current === generation) {
          const url = urls[next++]!
          if (!successful.has(url)) {
            try {
              const blob = await api.postBlob('gallery/duplicates/source', { imageUrl: url }, signal)
              if (current !== generation) return
              const fingerprint = await fingerprintBlob(blob)
              if (current !== generation) return
              successful.set(url, fingerprint)
              fresh.push({ imageUrl: url, ...fingerprint })
            } catch (error) {
              if (current !== generation) return
              failures.set(url, errorMessage(error))
            }
          }
          state.progress++
          // Yield between synchronous pixel calculations, including cache-heavy scans.
          if (state.progress % 25 === 0) await new Promise(resolve => setTimeout(resolve, 0))
        }
      }
      await Promise.all([worker(), worker()])
      if (current !== generation) return
      for (let i = 0; i < fresh.length; i += 50) {
        try {
          await api.post('gallery/duplicates/fingerprints', { algorithm: FINGERPRINT_VERSION, fingerprints: fresh.slice(i, i + 50) })
        } catch {
          state.cacheWarning = '部分指纹未能保存，本次比较仍有效，下次可能需要重新读取图片。'
        }
        if (current !== generation) return
      }
      for (const item of [...catalog, ...incoming]) {
        const key = fingerprintKey(item.sourceUrl)
        item.fingerprint = successful.get(key)
        item.error = failures.get(key)
      }
      state.catalog = catalog
      state.incoming = incoming
      state.phase = '比较图片内容'
      await new Promise(resolve => setTimeout(resolve, 0))
      if (current !== generation) return
      await rebuild()
      if (current !== generation) return
      state.ready = true
      state.phase = '检查完成'
    } catch (error) {
      if (current === generation) state.fatal = errorMessage(error)
    } finally {
      if (current === generation) state.busy = false
    }
  }

  function cancel() {
    if (state.deleting || state.purging) return
    generation++
    controller?.abort()
    state.busy = false
    state.open = false
    resolveCheck?.(null)
    resolveCheck = undefined
  }

  function start(mode: 'scan' | 'import', urls: string[], exclude?: number) {
    cancel()
    successful.clear()
    forceRefresh = false
    inputUrls = urls
    excludedId = exclude
    state.mode = mode
    state.ready = false
    state.open = true
    void run()
  }

  function check(urls: string[], exclude?: number): Promise<string[] | null> {
    const result = new Promise<string[] | null>(resolve => {
      cancel()
      resolveCheck = resolve
    })
    successful.clear()
    forceRefresh = false
    inputUrls = urls
    excludedId = exclude
    state.mode = 'import'
    state.open = true
    state.ready = false
    void run()
    return result
  }

  function confirmSelection() {
    if (!state.ready || state.busy || state.fatal || (state.failures.length && !state.allowIncomplete)) return
    const selected = state.candidates.filter(item => item.keep).map(item => item.sourceUrl)
    resolveCheck?.(selected)
    resolveCheck = undefined
    state.open = false
  }

  async function removeRecord(item: DuplicateImage) {
    if (!item.id || state.deleting || state.purging || !window.confirm(`删除画廊图片 #${item.id}？将同时删除图床原文件，此操作无法撤销。`)) return
    state.deleting = true
    state.cacheWarning = ''
    state.notice = ''
    try {
      await api.del(`gallery/${item.id}`)
      successful.delete(fingerprintKey(item.sourceUrl))
      state.catalog = state.catalog.filter(value => value.id !== item.id)
      await rebuild()
      await onRemoved()
    } catch (error) {
      state.cacheWarning = `删除失败：${errorMessage(error)}`
    } finally { state.deleting = false }
  }

  type PurgeResult = {
    deleted: number
    mediaDeleted: number
    recordsDeleted: number
    skipped: Array<{ id: number; reason: string }>
    failed: Array<{ id: number; message: string }>
  }

  /** Removes later copies of exact duplicates; the oldest record of every group survives. */
  async function purge() {
    if (state.busy || state.deleting || state.purging || !state.ready) return
    const groups = state.groups.filter(group => group.keep.id && group.remove.length)
    const total = groups.reduce((sum, group) => sum + group.remove.length, 0)
    if (!total) return
    const preview = groups.slice(0, 5)
      .map(group => `保留 #${group.keep.id}，删除 ${group.remove.map(item => `#${item.id}`).join('、')}`).join('；')
    const confirmed = window.confirm([
      `将删除 ${total} 张完全相同的重复图片，共 ${groups.length} 组，每组只保留创建时间最早的一张。`,
      `${preview}${groups.length > 5 ? ' …' : ''}`,
      '重复图片的图床文件会一并删除；被保留记录、文章封面或 Hero 共用的文件只移除画廊记录。此操作无法撤销。'
    ].join('\n'))
    if (!confirmed) return
    state.purging = true
    state.cacheWarning = ''
    state.notice = ''
    const removed = new Set<number>()
    const problems: string[] = []
    let mediaDeleted = 0, recordsDeleted = 0
    try {
      // Free plan: 50 subrequests per invocation and one fetch per media file.
      const requests: Array<{ keepId: number; deleteIds: number[] }> = []
      for (const group of groups) {
        let chunk: number[] = []
        for (const item of group.remove) {
          chunk.push(item.id!)
          if (chunk.length === 20) { requests.push({ keepId: group.keep.id!, deleteIds: chunk }); chunk = [] }
        }
        if (chunk.length) requests.push({ keepId: group.keep.id!, deleteIds: chunk })
      }
      for (const request of requests) {
        const result = await api.post<PurgeResult>('gallery/duplicates/purge', { groups: [request] })
        mediaDeleted += result.mediaDeleted
        recordsDeleted += result.recordsDeleted
        for (const entry of result.skipped) problems.push(`#${entry.id} 未删除：${entry.reason}`)
        for (const entry of result.failed) problems.push(`#${entry.id} 失败：${entry.message}`)
        const unresolved = new Set([...result.skipped, ...result.failed].map(entry => entry.id))
        for (const id of request.deleteIds) if (!unresolved.has(id)) removed.add(id)
      }
      state.catalog = state.catalog.filter(item => !item.id || !removed.has(item.id))
      await rebuild()
      await onRemoved()
      state.notice = `已删除 ${mediaDeleted + recordsDeleted} 条重复记录：图床文件 ${mediaDeleted} 个，仅记录 ${recordsDeleted} 条。`
        + (problems.length ? ` ${problems.length} 项未完成，例如 ${problems.slice(0, 3).join('；')}。` : '')
    } catch (error) {
      state.cacheWarning = `批量删除失败：${errorMessage(error)}`
      if (removed.size) { state.catalog = state.catalog.filter(item => !item.id || !removed.has(item.id)); await rebuild() }
    } finally { state.purging = false }
  }

  onBeforeUnmount(cancel)
  return { state, check, scan: () => start('scan', []), retry: () => run(), rescan: () => run(true), cancel, confirmSelection, removeRecord, purge }
}
