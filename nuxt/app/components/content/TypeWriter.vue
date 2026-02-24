<template>
  <span class="typewriter-mdc" :class="{ 'is-done': isDone }">
    <span class="typewriter-text">{{ visibleText }}</span>
    <span v-if="cursor && !isDone" class="typewriter-cursor" aria-hidden="true">|</span>
    <span v-if="cursor && isDone && loop" class="typewriter-cursor" aria-hidden="true">|</span>
  </span>
</template>

<script setup>
/**
 * TypeWriter 打字机动画组件 - MDC 语法
 *
 * ::type-writer{text="欢迎来到我的博客！" speed="60" cursor loop}
 * ::
 *
 * 也可以展示多行（slot 文本）：
 * ::type-writer{speed="40"}
 * 这段文字会逐字打出来……
 * ::
 */
const props = defineProps({
  /** 要输出的文本，优先于 slot 内容 */
  text: { type: String, default: '' },
  /** 每个字符的打印间隔（ms） */
  speed: { type: [Number, String], default: 60 },
  /** 是否显示光标 */
  cursor: { type: Boolean, default: true },
  /** 打完后是否循环重播 */
  loop: { type: Boolean, default: false },
  /** 开始前等待时间（ms） */
  delay: { type: [Number, String], default: 0 }
})

const slotContainer = ref(null)
const fullText = ref('')
const visibleText = ref('')
const isDone = ref(false)
let timer = null

onMounted(() => {
  // 优先用 prop，其次读取 slot 文本
  fullText.value = props.text || ''
  startTyping()
})

onUnmounted(() => {
  clearTimeout(timer)
})

function startTyping() {
  visibleText.value = ''
  isDone.value = false
  const delay = Number(props.delay) || 0
  timer = setTimeout(typeNext, delay, 0)
}

function typeNext(index) {
  if (index >= fullText.value.length) {
    isDone.value = true
    if (props.loop) {
      timer = setTimeout(startTyping, 1200)
    }
    return
  }
  visibleText.value = fullText.value.slice(0, index + 1)
  const speed = Math.max(10, Number(props.speed) || 60)
  timer = setTimeout(() => typeNext(index + 1), speed)
}
</script>

<style scoped>
.typewriter-mdc {
  display: inline;
  font-family: inherit;
}

.typewriter-cursor {
  display: inline-block;
  color: currentColor;
  font-weight: 300;
  animation: tw-blink 0.75s step-end infinite;
  margin-left: 1px;
}

@keyframes tw-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
</style>
