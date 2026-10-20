<script setup lang="ts">
import type { DuplicateImage } from '~~/shared/gallery-duplicates'

const props = defineProps<{ review: ReturnType<typeof useGalleryDuplicates> }>()
const state = props.review.state
const page = ref(1)
const pageSize = 12
const entries = computed(() => state.mode === 'scan' ? state.pairs : state.candidates)
const pageCount = computed(() => Math.max(1, Math.ceil(entries.value.length / pageSize)))
const candidates = computed(() => state.candidates.slice((page.value - 1) * pageSize, page.value * pageSize))
const pairs = computed(() => state.pairs.slice((page.value - 1) * pageSize, page.value * pageSize))
const selected = computed(() => state.candidates.filter(item => item.keep).length)
watch(() => [state.open, state.busy, entries.value.length], () => { page.value = 1 })
function updateOpen(value: boolean) { if (!value) props.review.cancel() }
function sourceLabel(item: DuplicateImage) { return item.sourceUrl }
</script>

<template>
  <UModal :open="state.open" :dismissible="!state.busy && !state.deleting" :close="!state.busy && !state.deleting"
    :title="state.mode === 'scan' ? '检查画廊重复图片' : '导入前检查'"
    description="按图片内容查重。压缩或缩放后的同图可能被识别，请结合预览确认。"
    :ui="{ content: 'sm:max-w-4xl' }" @update:open="updateOpen">
    <template #body>
      <div class="space-y-5">
        <div v-if="state.busy" class="space-y-3" aria-live="polite">
          <p class="text-sm font-medium">{{ state.phase }}<span v-if="state.total"> · {{ state.progress }} / {{ state.total }}</span></p>
          <UProgress :model-value="state.total ? state.progress : undefined" :max="state.total || 100" />
          <p class="text-sm text-muted">首次检查会读取原图。最近 30 天的指纹会复用；如原地址内容已变化，可强制重新读取。</p>
        </div>
        <UAlert v-if="state.fatal" color="error" title="检查未完成" :description="state.fatal" />
        <UAlert v-if="state.cacheWarning" color="warning" title="操作提示" :description="state.cacheWarning" />

        <template v-if="state.ready && !state.busy">
          <div class="flex flex-wrap items-center gap-2" aria-live="polite">
            <UBadge variant="subtle" color="neutral">已检查 {{ state.catalog.length }} 条画廊记录</UBadge>
            <UBadge v-if="state.mode === 'scan'" :color="state.pairs.length ? 'warning' : 'success'">{{ state.pairs.length }} 项疑似重复</UBadge>
            <UBadge v-else color="primary">准备保留 {{ selected }} / {{ state.candidates.length }} 张</UBadge>
            <UBadge v-if="state.failures.length" color="warning">{{ state.failures.length }} 项读取失败</UBadge>
          </div>

          <div v-if="state.failures.length" class="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
            <p class="font-medium text-warning">存在未检查的图片，当前结果不完整</p>
            <p class="text-sm text-muted">无法读取的图片不能判定为不重复。可重试；导入时也可明确接受不完整结果，再逐项勾选保留。</p>
            <details>
              <summary class="cursor-pointer text-sm">查看失败图片及原因（{{ state.failures.length }}）</summary>
              <ul class="mt-3 max-h-56 space-y-3 overflow-y-auto text-sm">
                <li v-for="item in state.failures" :key="item.key" class="break-all"><p class="font-medium">{{ item.label }}</p><p>{{ item.sourceUrl }}</p><p class="text-muted">{{ item.error }}</p></li>
              </ul>
            </details>
            <UButton size="sm" color="warning" variant="soft" icon="i-lucide-refresh-cw" @click="review.retry">重试失败图片</UButton>
            <UCheckbox v-if="state.mode === 'import'" v-model="state.allowIncomplete" label="我理解检查不完整，继续按勾选结果导入" />
          </div>

          <template v-if="state.mode === 'scan'">
            <UEmpty v-if="!pairs.length" icon="i-lucide-scan-line" :title="state.failures.length ? '已读取的图片中未发现疑似重复' : '未发现疑似重复图片'" description="识别结果受图片内容影响，裁剪、加水印或大幅修改可能无法识别。" />
            <section v-for="pair in pairs" :key="`${pair.left.key}-${pair.right.key}`" class="space-y-3 rounded-lg border border-default p-4">
              <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="font-medium">疑似重复</h3><UBadge color="warning" variant="subtle">{{ pair.exact ? '相同地址' : `视觉距离 ${pair.distance} / 64` }}</UBadge></div>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="item in [pair.right, pair.left]" :key="item.key" class="min-w-0 space-y-2">
                  <img :src="item.imageUrl" :alt="item.label" loading="lazy" class="h-48 w-full rounded bg-muted object-contain" />
                  <p class="text-sm font-medium">{{ item.label }}</p>
                  <p class="truncate text-xs text-muted" :title="sourceLabel(item)">{{ item.sourceUrl }}</p>
                  <p v-if="item.fingerprint" class="text-xs text-muted">{{ item.fingerprint.width }} × {{ item.fingerprint.height }}</p>
                  <UButton color="error" variant="soft" size="sm" icon="i-lucide-trash-2" :disabled="state.deleting" @click="review.removeRecord(item)">删除图片及记录</UButton>
                </div>
              </div>
              <p class="text-xs text-muted">删除会同时移除画廊记录和图床原文件，无法撤销。文件仍有其他画廊、封面或 Hero 引用时将阻止删除。</p>
            </section>
          </template>

          <template v-else>
            <p class="text-sm text-muted">疑似重复和读取失败的图片默认跳过。勾选“保留此图片”可明确导入；批次内重复会标出先前的候选图片。</p>
            <section v-for="item in candidates" :key="item.key" class="space-y-3 rounded-lg border border-default p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2"><h3 class="font-medium">{{ item.label }}</h3><UBadge :color="item.error ? 'error' : item.matches.length ? 'warning' : 'success'" variant="subtle">{{ item.error ? '未检查' : item.matches.length ? '疑似重复' : state.failures.length ? '暂未发现匹配' : '未发现匹配' }}</UBadge></div>
                <UCheckbox v-model="item.keep" :label="`保留此图片（${item.label}）`" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="min-w-0 space-y-2">
                  <img :src="item.imageUrl" :alt="item.label" loading="lazy" class="h-48 w-full rounded bg-muted object-contain" />
                  <p class="truncate text-xs text-muted" :title="item.sourceUrl">{{ item.sourceUrl }}</p>
                  <p v-if="item.fingerprint" class="text-xs text-muted">{{ item.fingerprint.width }} × {{ item.fingerprint.height }}</p>
                  <p v-if="item.error" class="text-sm text-error">{{ item.error }}</p>
                </div>
                <div v-if="item.matches.length" class="min-w-0 space-y-3">
                  <div v-for="match in item.matches.slice(0, 3)" :key="match.right.key" class="space-y-2">
                    <img :src="match.right.imageUrl" :alt="match.right.label" loading="lazy" class="h-48 w-full rounded bg-muted object-contain" />
                    <p class="text-sm font-medium">{{ match.right.label }}</p>
                    <p class="truncate text-xs text-muted" :title="match.right.sourceUrl">{{ match.right.sourceUrl }}</p>
                    <p class="text-xs text-muted">{{ match.exact ? '相同地址' : `视觉距离 ${match.distance} / 64` }}<span v-if="match.right.fingerprint"> · {{ match.right.fingerprint.width }} × {{ match.right.fingerprint.height }}</span></p>
                  </div>
                  <p v-if="item.matches.length > 3" class="text-xs text-muted">另有 {{ item.matches.length - 3 }} 项匹配；导入后可扫描画廊复核。</p>
                </div>
                <div v-else class="flex items-center justify-center rounded bg-muted/50 p-4 text-sm text-muted">{{ item.error ? '读取失败，无法比较' : '没有匹配预览' }}</div>
              </div>
            </section>
          </template>
          <div v-if="pageCount > 1" class="flex items-center justify-center gap-3">
            <UButton color="neutral" variant="soft" :disabled="page <= 1" @click="page--">上一页</UButton><span class="text-sm">{{ page }} / {{ pageCount }}</span><UButton color="neutral" variant="soft" :disabled="page >= pageCount" @click="page++">下一页</UButton>
          </div>
        </template>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-wrap justify-end gap-2">
        <UButton v-if="!state.busy" color="neutral" variant="soft" :disabled="state.deleting" icon="i-lucide-refresh-cw" @click="review.rescan">强制重新读取全部图片</UButton>
        <UButton v-if="state.fatal" color="neutral" variant="soft" @click="review.retry">重试检查</UButton>
        <UButton color="neutral" variant="ghost" :disabled="state.deleting" @click="review.cancel">{{ state.busy ? '取消检查' : '关闭' }}</UButton>
        <UButton v-if="state.mode === 'import'" :disabled="!state.ready || state.busy || !!state.fatal || (!!state.failures.length && !state.allowIncomplete)" @click="review.confirmSelection">确认保留 {{ selected }} 张</UButton>
      </div>
    </template>
  </UModal>
</template>
