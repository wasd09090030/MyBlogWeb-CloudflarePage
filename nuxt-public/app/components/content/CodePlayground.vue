<template>
  <n-card
    class="code-playground-mdc my-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
    :bordered="false"
    content-style="padding: 0;"
    header-style="padding: 0;"
  >
    <!-- 隐藏的原始内容容器 -->
    <div ref="slotContainer" style="display: none;">
      <slot />
    </div>

    <!-- 头部 -->
    <template #header>
      <div class="playground-header flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <n-space align="center" size="small">
          <Icon name="code-slash" size="md" class="text-gray-600 dark:text-gray-400" />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ title }}</span>
          <n-tag size="tiny" :bordered="false" class="lang-tag">{{ lang }}</n-tag>
        </n-space>
        <n-space align="center" size="small">
          <!-- 仅 JS/TS 且声明 runnable 时显示运行按钮 -->
          <n-button
            v-if="isRunnable"
            type="success"
            size="small"
            :loading="isRunning"
            @click="runCode"
          >
            <template #icon>
              <Icon name="play" size="sm" />
            </template>
            {{ isRunning ? '运行中…' : '运行' }}
          </n-button>
          <n-button size="small" :type="copied ? 'success' : 'default'" @click="copyCode">
            <template #icon>
              <Icon :name="copied ? 'check' : 'copy'" size="sm" />
            </template>
            {{ copied ? '已复制' : '复制' }}
          </n-button>
        </n-space>
      </div>
    </template>

    <!-- 代码区域：无高度限制，完整展示 -->
    <div class="playground-body">
      <div v-if="highlightedHtml" class="shiki-wrapper" v-html="highlightedHtml"></div>
      <div v-else class="p-4">
        <pre class="text-sm overflow-x-auto"><code class="text-gray-100">{{ displayCode }}</code></pre>
      </div>

      <!-- 输出区域 -->
      <Transition name="output-slide">
        <div
          v-if="output !== null"
          class="output-panel border-t border-gray-200 dark:border-gray-700"
        >
          <div class="output-header flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900">
            <n-space align="center" size="small">
              <Icon name="chevron-right" size="sm" class="text-green-500" />
              <span class="text-xs font-semibold text-gray-600 dark:text-gray-400">输出结果</span>
            </n-space>
            <n-button text size="tiny" class="text-gray-400" @click="output = null">
              <Icon name="x-mark" size="sm" />
            </n-button>
          </div>
          <pre class="output-content text-sm text-gray-200 dark:text-gray-200 whitespace-pre-wrap px-4 py-3 dark:bg-gray-950">{{ output }}</pre>
        </div>
      </Transition>
    </div>
  </n-card>
</template>

<script setup>
import { codeToHtml } from 'shiki'

/**
 * CodePlayground 代码演示组件 - MDC 语法
 *
 * ::code-playground{lang="javascript" title="示例" runnable}
 * console.log('Hello!')
 * ::
 *
 * 非 JS 语言不会出现运行按钮；运行在 Worker 沙箱中执行，避免污染主线程。
 */

const props = defineProps({
  lang: { type: String, default: 'javascript' },
  title: { type: String, default: 'Code Playground' },
  runnable: { type: Boolean, default: false }
})

const JS_LANGS = new Set(['javascript', 'js', 'javascript', 'node'])

// 只有语言是 JS 且显式声明 runnable 时才展示运行按钮
const isRunnable = computed(() => props.runnable && JS_LANGS.has(props.lang.toLowerCase()))

const slotContainer = ref(null)
const output = ref(null)        // null = 未运行 / 隐藏；string = 结果
const displayCode = ref('')
const highlightedHtml = ref('')
const copied = ref(false)
const isRunning = ref(false)

// 从隐藏 slot 读取代码
onMounted(() => {
  if (slotContainer.value) {
    displayCode.value = slotContainer.value.textContent?.trim() || ''
  }
})

// Shiki 代码高亮
watch(displayCode, async (newCode) => {
  if (!newCode) { highlightedHtml.value = ''; return }
  try {
    highlightedHtml.value = await codeToHtml(newCode, {
      lang: props.lang,
      theme: 'material-theme-darker'
    })
  } catch {
    highlightedHtml.value = ''
  }
}, { immediate: true })

// ——— 复制（带 2s 反馈）———
const copyCode = async () => {
  if (copied.value) return
  try {
    await navigator.clipboard.writeText(displayCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// ——— Worker 沙箱运行 JS ———
const WORKER_SRC = `
self.onmessage = function(e) {
  const code = e.data;
  const logs = [];
  const _log = function() {
    const args = Array.prototype.slice.call(arguments);
    logs.push(args.map(function(a) {
      return (typeof a === 'object' && a !== null) ? JSON.stringify(a, null, 2) : String(a);
    }).join(' '));
  };
  try {
    const fn = new Function(
      'console',
      code
    );
    const result = fn({ log: _log, warn: _log, error: _log, info: _log });
    let out = logs.join('\\n');
    if (!out && result !== undefined) out = String(result);
    if (!out) out = '✓ 代码执行成功（无输出）';
    self.postMessage({ ok: true, output: out });
  } catch(err) {
    self.postMessage({ ok: false, output: '❌ 错误: ' + err.message });
  }
};
`

const runCode = async () => {
  if (isRunning.value) return
  isRunning.value = true
  output.value = null

  try {
    const blob = new Blob([WORKER_SRC], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    const worker = new Worker(url)

    const result = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        worker.terminate()
        resolve({ ok: false, output: '⏱ 超时：代码执行超过 5 秒被终止' })
      }, 5000)

      worker.onmessage = (e) => {
        clearTimeout(timer)
        worker.terminate()
        resolve(e.data)
      }

      worker.onerror = (e) => {
        clearTimeout(timer)
        worker.terminate()
        resolve({ ok: false, output: `❌ Worker 错误: ${e.message}` })
      }

      worker.postMessage(displayCode.value)
    })

    URL.revokeObjectURL(url)
    output.value = result.output
  } catch (err) {
    output.value = `❌ 无法启动沙箱: ${err.message}`
  } finally {
    isRunning.value = false
  }
}
</script>

<style scoped>
.code-playground-mdc pre {
  margin: 0;
}

.lang-tag {
  font-family: 'Consolas', monospace;
  font-size: 0.7rem;
  opacity: 0.7;
}

/* Shiki 生成的 HTML 样式 */
.shiki-wrapper {
  padding: 1rem;
}

.shiki-wrapper :deep(pre) {
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow-x: auto;
}

.shiki-wrapper :deep(code) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  display: block;
  background: transparent !important;
}

/* 代码区域不限制高度，完整展示所有行 */
.playground-body {
  background: var(--code-playground-bg, #1e1e1e);
}

.output-content {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
  margin: 0;
}

/* 输出面板展开动画 */
.output-slide-enter-active,
.output-slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.output-slide-enter-from,
.output-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.output-slide-enter-to,
.output-slide-leave-from {
  max-height: 600px;
  opacity: 1;
}
</style>
