<template>
  <div ref="containerRef" class="w-full h-full relative">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { Application, Container, Graphics } from 'pixi.js'

const props = defineProps({
  notes: {
    type: Array,
    default: () => []
  },
  columns: {
    type: Number,
    default: 4
  },
  scrollSpeed: {
    type: Number,
    default: 800
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  audioTime: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['note-hit', 'note-miss', 'key-press'])

// DOM 引用
const containerRef = ref(null)
const canvasRef = ref(null)

// PixiJS 引用
let app = null
let laneContainer = null
let notesContainer = null
let effectsContainer = null

// 音符数据
let noteObjects = []
let holdingNotes = {} // 追踪正在按住的长按音符 { column: noteObj }

// 轨道配置
const LANE_WIDTH = 80 // 每条轨道宽度
const HIT_LINE_OFFSET = 100 // 判定线距底部的距离
const NOTE_HEIGHT = 30 // 音符高度

// 颜色配置
const COLORS = {
  background: 0x1a1a2e,
  lane: 0x16213e,
  laneDivider: 0x0f3460,
  hitLine: 0xe94560,
  note: [0x60a5fa, 0x4ade80, 0xfbbf24, 0xf472b6], // 不同轨道颜色
  noteStroke: [0x3b82f6, 0x22c55e, 0xf59e0b, 0xec4899],
  holdBody: 0x4ade80,
  keyHighlight: 0x00ffff
}

// 初始化 PixiJS
const initPixi = async () => {
  if (!containerRef.value || !canvasRef.value) return

  const { width, height } = containerRef.value.getBoundingClientRect()

  app = new Application()
  await app.init({
    canvas: canvasRef.value,
    width,
    height,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  })

  // 创建图层
  laneContainer = new Container()
  notesContainer = new Container()
  effectsContainer = new Container()

  app.stage.addChild(laneContainer)
  app.stage.addChild(notesContainer)
  app.stage.addChild(effectsContainer)

  // 绘制轨道
  drawLanes()

  // 创建音符对象
  createNotes()

  // 启动渲染循环
  app.ticker.add(gameLoop)

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

// 绘制轨道
const drawLanes = () => {
  if (!laneContainer || !app) return
  laneContainer.removeChildren()

  const { width, height } = app.screen
  const totalLaneWidth = props.columns * LANE_WIDTH
  const startX = (width - totalLaneWidth) / 2
  const hitLineY = height - HIT_LINE_OFFSET

  const graphics = new Graphics()

  // 绘制轨道背景
  graphics.rect(startX, 0, totalLaneWidth, height)
    .fill({ color: COLORS.lane, alpha: 0.8 })

  // 绘制轨道分隔线
  for (let i = 0; i <= props.columns; i++) {
    const x = startX + i * LANE_WIDTH
    graphics.moveTo(x, 0)
      .lineTo(x, height)
      .stroke({ color: COLORS.laneDivider, width: i === 0 || i === props.columns ? 3 : 1 })
  }

  // 绘制判定线
  graphics.moveTo(startX, hitLineY)
    .lineTo(startX + totalLaneWidth, hitLineY)
    .stroke({ color: COLORS.hitLine, width: 4 })

  // 绘制判定区域（轨道底部高亮）
  graphics.rect(startX, hitLineY - 10, totalLaneWidth, 20)
    .fill({ color: COLORS.hitLine, alpha: 0.2 })

  laneContainer.addChild(graphics)
}

// 创建音符对象
const createNotes = () => {
  if (!notesContainer) return
  notesContainer.removeChildren()
  noteObjects = []

  props.notes.forEach((note, index) => {
    const graphics = new Graphics()
    graphics.visible = false
    notesContainer.addChild(graphics)

    noteObjects.push({
      id: index,
      note,
      graphics,
      status: 'active', // active, hit, missed, holding
      holdStarted: false // 长按是否已开始
    })
  })
}

// 绘制单个音符
const drawNote = (noteObj, x, y, width, height, isHold = false, holdLength = 0) => {
  const { graphics, note } = noteObj
  const colorIndex = note.column % COLORS.note.length
  const noteColor = COLORS.note[colorIndex]
  const strokeColor = COLORS.noteStroke[colorIndex]

  graphics.clear()

  if (isHold && holdLength > 0) {
    // 长按音符
    // 绘制长条主体
    graphics.roundRect(x - width / 2, y, width, holdLength, 6)
      .fill({ color: COLORS.holdBody, alpha: 0.7 })
      .stroke({ color: 0x22c55e, width: 2 })

    // 绘制头部
    graphics.roundRect(x - width / 2, y + holdLength - NOTE_HEIGHT, width, NOTE_HEIGHT, 8)
      .fill({ color: noteColor })
      .stroke({ color: strokeColor, width: 3 })
  } else {
    // 普通音符
    graphics.roundRect(x - width / 2, y - NOTE_HEIGHT / 2, width, NOTE_HEIGHT, 8)
      .fill({ color: noteColor })
      .stroke({ color: strokeColor, width: 3 })

    // 中心高光
    graphics.circle(x, y, width / 6)
      .fill({ color: 0xffffff, alpha: 0.5 })
  }
}

// 游戏循环
const gameLoop = () => {
  if (!props.isPlaying || !app) return
  updateNotes()
}

// 更新音符位置
const updateNotes = () => {
  if (!app) return

  const { width, height } = app.screen
  const totalLaneWidth = props.columns * LANE_WIDTH
  const startX = (width - totalLaneWidth) / 2
  const hitLineY = height - HIT_LINE_OFFSET
  const currentTime = props.audioTime

  // 音符出现的时间窗口（毫秒）
  const appearTime = (hitLineY / props.scrollSpeed) * 1000

  noteObjects.forEach((noteObj) => {
    if (noteObj.status === 'hit' || noteObj.status === 'missed') {
      noteObj.graphics.visible = false
      return
    }
    
    // holding 状态的音符继续渲染
    if (noteObj.status !== 'active' && noteObj.status !== 'holding') {
      noteObj.graphics.visible = false
      return
    }

    const { note, graphics } = noteObj
    const timeDiff = note.time - currentTime

    // 计算音符 Y 位置：时间差 * 速度
    // timeDiff > 0 表示音符还没到判定线，应该在上方
    // timeDiff = 0 表示音符正好在判定线
    // timeDiff < 0 表示音符已过判定线
    const y = hitLineY - (timeDiff / 1000) * props.scrollSpeed

    // 判断是否在可见范围内
    if (y < -NOTE_HEIGHT * 2 || y > height + NOTE_HEIGHT) {
      graphics.visible = false
      return
    }

    // 计算 X 位置
    const x = startX + note.column * LANE_WIDTH + LANE_WIDTH / 2
    const noteWidth = LANE_WIDTH * 0.85

    graphics.visible = true

    if (note.endTime) {
      // 长按音符
      const holdTimeDiff = note.endTime - currentTime
      const holdEndY = hitLineY - (holdTimeDiff / 1000) * props.scrollSpeed
      const holdLength = Math.max(NOTE_HEIGHT, y - holdEndY)
      drawNote(noteObj, x, holdEndY, noteWidth, NOTE_HEIGHT, true, holdLength)
    } else {
      // 普通音符
      drawNote(noteObj, x, y, noteWidth, NOTE_HEIGHT)
    }
  })
}

// 处理按键按下
const handleKeyPress = (column) => {
  if (!props.isPlaying) return

  const currentTime = props.audioTime
  const hitWindow = 200 // 判定窗口 ms

  // 查找该列最接近判定线的活跃音符
  let bestMatch = null
  let bestTimeDiff = Infinity

  noteObjects.forEach((noteObj) => {
    if (noteObj.status !== 'active') return
    if (noteObj.note.column !== column) return

    const timeDiff = Math.abs(noteObj.note.time - currentTime)
    if (timeDiff < bestTimeDiff && timeDiff <= hitWindow) {
      bestTimeDiff = timeDiff
      bestMatch = noteObj
    }
  })

  if (bestMatch) {
    // 判定
    let judgement = 'MISS'
    if (bestTimeDiff <= 50) judgement = 'PERFECT'
    else if (bestTimeDiff <= 100) judgement = 'GREAT'
    else if (bestTimeDiff <= 150) judgement = 'GOOD'
    else if (bestTimeDiff <= 200) judgement = 'BAD'

    // 如果是长按音符
    if (bestMatch.note.endTime) {
      bestMatch.status = 'holding'
      bestMatch.holdStarted = true
      holdingNotes[column] = bestMatch
      // 只给头部判定的反馈
      emit('note-hit', { noteId: bestMatch.id, judgement, timeDiff: bestTimeDiff, isHoldStart: true })
    } else {
      // 普通音符直接击中
      bestMatch.status = 'hit'
      emit('note-hit', { noteId: bestMatch.id, judgement, timeDiff: bestTimeDiff })
    }
    
    // 显示击打效果
    showHitEffect(bestMatch.note.column)
  }

  emit('key-press', column)
}

// 处理按键松开
const handleKeyRelease = (column) => {
  if (!props.isPlaying) return
  
  const holdNote = holdingNotes[column]
  if (holdNote) {
    const currentTime = props.audioTime
    const holdEndTime = holdNote.note.endTime
    const timeDiff = Math.abs(holdEndTime - currentTime)
    
    // 判定是否持续到音符结束
    let judgement = 'MISS'
    if (timeDiff <= 50) judgement = 'PERFECT'
    else if (timeDiff <= 100) judgement = 'GREAT'
    else if (timeDiff <= 150) judgement = 'GOOD'
    else if (timeDiff <= 200) judgement = 'BAD'
    
    holdNote.status = 'hit'
    delete holdingNotes[column]
    
    // 发送长按结束的判定
    emit('note-hit', { noteId: holdNote.id, judgement, timeDiff, isHoldEnd: true })
  }
}

// 显示击打效果
const showHitEffect = (column) => {
  if (!effectsContainer || !app) return

  const { width, height } = app.screen
  const totalLaneWidth = props.columns * LANE_WIDTH
  const startX = (width - totalLaneWidth) / 2
  const hitLineY = height - HIT_LINE_OFFSET
  const x = startX + column * LANE_WIDTH + LANE_WIDTH / 2

  const effect = new Graphics()
  effect.circle(x, hitLineY, LANE_WIDTH / 2)
    .fill({ color: COLORS.keyHighlight, alpha: 0.5 })
  effectsContainer.addChild(effect)

  // 渐隐动画
  let alpha = 0.5
  const fadeOut = () => {
    alpha -= 0.05
    effect.alpha = alpha
    if (alpha > 0) {
      requestAnimationFrame(fadeOut)
    } else {
      effectsContainer.removeChild(effect)
      effect.destroy()
    }
  }
  fadeOut()
}

// 自动判定 MISS
const checkMissedNotes = () => {
  const currentTime = props.audioTime
  const missWindow = 200 // 超过判定线 200ms 判定为 MISS

  noteObjects.forEach((noteObj) => {
    if (noteObj.status !== 'active' && noteObj.status !== 'holding') return
    
    // 对于长按音符，检查是否超过结束时间
    if (noteObj.note.endTime) {
      const endTimeDiff = currentTime - noteObj.note.endTime
      if (endTimeDiff > missWindow && noteObj.status === 'holding') {
        // 长按音符超时，自动结束
        noteObj.status = 'hit'
        const column = noteObj.note.column
        if (holdingNotes[column]) {
          delete holdingNotes[column]
        }
        emit('note-hit', { noteId: noteObj.id, judgement: 'PERFECT', timeDiff: 0, isHoldEnd: true, auto: true })
      }
    } else {
      // 普通音符
      const timeDiff = currentTime - noteObj.note.time
      if (timeDiff > missWindow) {
        noteObj.status = 'missed'
        emit('note-miss', { noteId: noteObj.id })
      }
    }
  })
}

// 重置游戏
const reset = () => {
  noteObjects.forEach((noteObj) => {
    noteObj.status = 'active'
    noteObj.holdStarted = false
    noteObj.graphics.visible = false
  })
  holdingNotes = {}
}

// 处理窗口大小变化
const handleResize = () => {
  if (!containerRef.value || !app) return
  const { width, height } = containerRef.value.getBoundingClientRect()
  app.renderer.resize(width, height)
  drawLanes()
}

// 暴露方法给父组件
defineExpose({
  handleKeyPress,
  handleKeyRelease,
  checkMissedNotes,
  reset
})

// 监听 notes 变化
watch(() => props.notes, () => {
  createNotes()
}, { deep: true })

// 监听 isPlaying 变化
watch(() => props.isPlaying, (playing) => {
  if (playing) {
    // 开始时检查 MISS
    const missChecker = setInterval(() => {
      if (!props.isPlaying) {
        clearInterval(missChecker)
        return
      }
      checkMissedNotes()
    }, 100)
  }
})

// 生命周期
onMounted(() => {
  initPixi()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (app) {
    app.destroy(true, { children: true })
    app = null
  }
})
</script>

<style scoped>
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
