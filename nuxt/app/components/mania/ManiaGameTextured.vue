<template>
  <div ref="containerRef" class="w-full h-full relative">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { Application, Container, Graphics, Assets, } from 'pixi.js'
import { createNoteMesh, createHoldPath, createSimpleNoteMesh, createNineSliceNote } from './NotePlane'

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

// 纹理资源
let textures = {}
let texturesLoaded = false

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
  keyHighlight: 0x00ffff
}

// 加载纹理资源
const loadTextures = async () => {
  try {
    console.log('开始加载纹理资源...')
    
    // 加载音符纹理
    const noteTextureFiles = {
      tap: '/assets/textures/noteN.png',
      critical: '/assets/textures/noteC.png',
      slide: '/assets/textures/noteL.png',
      flick: '/assets/textures/noteF.png'
    }

    // 加载路径纹理
    const pathTextureFiles = {
      path: '/assets/textures/path.png',
      pathCritical: '/assets/textures/path_critical.png'
    }

    // 使用 Assets API 加载所有纹理
    const allTextures = { ...noteTextureFiles, ...pathTextureFiles }
    const loadPromises = Object.entries(allTextures).map(([key, path]) =>
      Assets.load(path)
        .then(texture => {
          textures[key] = texture
          console.log(`✓ 已加载: ${key}`)
          return texture
        })
        .catch(err => {
          console.warn(`⚠ 加载失败: ${key} (${path})`, err)
          return null
        })
    )

    await Promise.all(loadPromises)

    // 验证关键纹理是否加载成功
    if (!textures.tap || !textures.path) {
      console.warn('⚠ 关键纹理缺失，将使用纯色绘制')
      texturesLoaded = false
      return
    }

    texturesLoaded = true
    console.log('✓ 所有纹理加载完成')
  } catch (err) {
    console.error('纹理加载失败:', err)
    texturesLoaded = false
  }
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

  // 加载纹理
  await loadTextures()

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
    // 为每个音符创建容器
    const container = new Container()
    container.visible = false
    notesContainer.addChild(container)

    noteObjects.push({
      id: index,
      note,
      container,
      sprite: null, // 头部 sprite
      tailSprite: null, // 尾部 sprite（长按音符）
      holdPath: null, // 长按路径
      status: 'active', // active, hit, missed, holding
      holdStarted: false // 长按是否已开始
    })
  })
}

// 绘制单个音符（使用纹理）
const drawNote = (noteObj, x, y, width, height, isHold = false, holdEndY = 0) => {
  const { container, note } = noteObj

  // 清空之前的绘制
  container.removeChildren()
  if (noteObj.sprite) {
    noteObj.sprite.destroy()
    noteObj.sprite = null
  }
  if (noteObj.tailSprite) {
    noteObj.tailSprite.destroy()
    noteObj.tailSprite = null
  }
  if (noteObj.holdPath) {
    noteObj.holdPath.destroy()
    noteObj.holdPath = null
  }

  if (isHold && holdEndY !== 0) {
    // 长按音符 - 使用 NineSliceSprite 实现 9-slice 缩放
    if (texturesLoaded && textures.path && textures.slide) {
      // 绘制长按路径（使用单 lane 宽度）
      const holdPath = createHoldPath(
        textures.path,
        x,
        y,
        holdEndY,
        LANE_WIDTH // 使用完整轨道宽度
      )
      holdPath.alpha = 0.7
      container.addChild(holdPath)
      noteObj.holdPath = holdPath

      // 绘制头部音符（使用 NineSliceSprite）
      try {
        const headSprite = createNineSliceNote(textures.slide, LANE_WIDTH, height)
        headSprite.position.set(x, y)
        container.addChild(headSprite)
        noteObj.sprite = headSprite
      } catch (err) {
        console.error('绘制长按音符头部失败:', err)
        drawNoteFallback(container, x, y, width, height, true)
      }
      
      // 绘制尾部音符（使用 NineSliceSprite）
      try {
        const tailSprite = createNineSliceNote(textures.slide, LANE_WIDTH, height)
        tailSprite.position.set(x, holdEndY)
        tailSprite.alpha = 0.9
        container.addChild(tailSprite)
        noteObj.tailSprite = tailSprite
      } catch (err) {
        console.error('绘制长按音符尾部失败:', err)
      }
    } else {
      drawNoteFallback(container, x, y, width, height, true, holdEndY)
    }
  } else {
    // 普通音符 - 使用 NineSliceSprite
    if (texturesLoaded && textures.tap) {
      try {
        const sprite = createNineSliceNote(textures.tap, LANE_WIDTH, height)
        sprite.position.set(x, y)
        container.addChild(sprite)
        noteObj.sprite = sprite
      } catch (err) {
        console.error('绘制普通音符失败:', err)
        drawNoteFallback(container, x, y, width, height, false)
      }
    } else {
      drawNoteFallback(container, x, y, width, height, false)
    }
  }
}

// 回退绘制方法（使用纯色 Graphics）
const drawNoteFallback = (container, x, y, width, height, isHold = false, holdEndY = 0) => {
  const graphics = new Graphics()
  
  // 简单的渐变色方案
  const noteColor = 0x60a5fa
  const strokeColor = 0x3b82f6
  const holdColor = 0x4ade80

  if (isHold && holdEndY !== 0) {
    // 长按音符主体
    const holdLength = Math.abs(y - holdEndY)
    graphics.roundRect(x - width / 2, Math.min(y, holdEndY), width, holdLength, 6)
      .fill({ color: holdColor, alpha: 0.7 })
      .stroke({ color: 0x22c55e, width: 2 })

    // 头部音符
    graphics.roundRect(x - width / 2, y - height / 2, width, height, 8)
      .fill({ color: noteColor })
      .stroke({ color: strokeColor, width: 3 })
    
    // 尾部音符
    graphics.roundRect(x - width / 2, holdEndY - height / 2, width, height, 8)
      .fill({ color: noteColor, alpha: 0.9 })
      .stroke({ color: strokeColor, width: 3 })
  } else {
    // 普通音符
    graphics.roundRect(x - width / 2, y - height / 2, width, height, 8)
      .fill({ color: noteColor })
      .stroke({ color: strokeColor, width: 3 })

    // 中心高光
    graphics.circle(x, y, width / 6)
      .fill({ color: 0xffffff, alpha: 0.5 })
  }

  container.addChild(graphics)
}

// 游戏循环
const gameLoop = () => {
  if (!props.isPlaying || !app) return
  updateNotes()
  checkMissedNotes()
}

// 更新音符位置
const updateNotes = () => {
  if (!app) return

  const { width, height } = app.screen
  const totalLaneWidth = props.columns * LANE_WIDTH
  const startX = (width - totalLaneWidth) / 2
  const hitLineY = height - HIT_LINE_OFFSET
  const currentTime = props.audioTime

  noteObjects.forEach((noteObj) => {
    if (noteObj.status === 'hit' || noteObj.status === 'missed') {
      noteObj.container.visible = false
      return
    }
    
    if (noteObj.status !== 'active' && noteObj.status !== 'holding') {
      noteObj.container.visible = false
      return
    }

    const { note, container } = noteObj
    const timeDiff = note.time - currentTime

    // 计算 X 位置
    const x = startX + note.column * LANE_WIDTH + LANE_WIDTH / 2
    const noteWidth = LANE_WIDTH // 使用完整轨道宽度

    if (note.endTime) {
      // 长按音符
      const holdTimeDiff = note.endTime - currentTime
      
      // 如果正在按住（holding状态）
      if (noteObj.status === 'holding') {
        // 检查是否已经到达结束时间
        if (holdTimeDiff <= -50) {
          // 长按已结束，自动判定
          noteObj.status = 'hit'
          emit('note-hit', { 
            noteId: noteObj.id, 
            judgement: 'PERFECT', 
            timeDiff: 0, 
            isHoldEnd: true 
          })
          delete holdingNotes[note.column]
          container.visible = false
          return
        }
        
        // 头部固定在判定线，尾部根据时间移动
        const holdEndY = hitLineY - (holdTimeDiff / 1000) * props.scrollSpeed
        
        // 长条仍在可见范围内
        if (holdEndY > -NOTE_HEIGHT) {
          container.visible = true
          drawNote(noteObj, x, hitLineY, noteWidth, NOTE_HEIGHT, true, holdEndY)
        } else {
          // 尾部已经消失，自动完成
          noteObj.status = 'hit'
          emit('note-hit', { 
            noteId: noteObj.id, 
            judgement: 'PERFECT', 
            timeDiff: 0, 
            isHoldEnd: true 
          })
          delete holdingNotes[note.column]
          container.visible = false
        }
      } else {
        // 未按住时，正常显示完整长条
        const y = hitLineY - (timeDiff / 1000) * props.scrollSpeed
        const holdEndY = hitLineY - (holdTimeDiff / 1000) * props.scrollSpeed
        
        // 判断是否在可见范围内
        if (y < -NOTE_HEIGHT * 2 || holdEndY > height + NOTE_HEIGHT) {
          container.visible = false
          return
        }
        
        container.visible = true
        drawNote(noteObj, x, y, noteWidth, NOTE_HEIGHT, true, holdEndY)
      }
    } else {
      // 普通音符
      const y = hitLineY - (timeDiff / 1000) * props.scrollSpeed
      
      // 判断是否在可见范围内
      if (y < -NOTE_HEIGHT * 2 || y > height + NOTE_HEIGHT) {
        container.visible = false
        return
      }
      
      container.visible = true
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
      emit('note-hit', { noteId: bestMatch.id, judgement, timeDiff: bestTimeDiff, isHoldStart: true })
    } else {
      bestMatch.status = 'hit'
      emit('note-hit', { noteId: bestMatch.id, judgement, timeDiff: bestTimeDiff })
    }
    
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
    
    let judgement = 'MISS'
    if (timeDiff <= 50) judgement = 'PERFECT'
    else if (timeDiff <= 100) judgement = 'GREAT'
    else if (timeDiff <= 150) judgement = 'GOOD'
    else if (timeDiff <= 200) judgement = 'BAD'

    holdNote.status = 'hit'
    emit('note-hit', { noteId: holdNote.id, judgement, timeDiff, isHoldEnd: true })
    
    delete holdingNotes[column]
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
  effect.circle(x, hitLineY, LANE_WIDTH * 0.4)
    .fill({ color: COLORS.keyHighlight, alpha: 0.6 })

  effectsContainer.addChild(effect)

  // 动画效果
  let alpha = 0.6
  const fadeOut = () => {
    alpha -= 0.05
    effect.alpha = alpha
    if (alpha <= 0) {
      effectsContainer.removeChild(effect)
      effect.destroy()
    } else {
      requestAnimationFrame(fadeOut)
    }
  }
  fadeOut()
}

// 检查未命中的音符
const checkMissedNotes = () => {
  if (!props.isPlaying) return

  const currentTime = props.audioTime
  const missWindow = 200

  noteObjects.forEach((noteObj) => {
    if (noteObj.status !== 'active') return

    const timeDiff = currentTime - noteObj.note.time
    if (timeDiff > missWindow) {
      noteObj.status = 'missed'
      emit('note-miss', { noteId: noteObj.id })
    }
  })

  // 检查未完成的长按（注意：holding 状态的长按在 updateNotes 中已经自动处理）
  // 这里只需要检查那些没有被按住的长按音符
  Object.entries(holdingNotes).forEach(([column, holdNote]) => {
    // 跳过已经 hit 的音符（已在 updateNotes 中处理）
    if (holdNote.status === 'hit') {
      delete holdingNotes[parseInt(column)]
      return
    }
    
    const timeDiff = currentTime - holdNote.note.endTime
    if (timeDiff > missWindow) {
      holdNote.status = 'missed'
      emit('note-miss', { noteId: holdNote.id })
      delete holdingNotes[parseInt(column)]
    }
  })
}

// 重置游戏
const reset = () => {
  noteObjects.forEach((noteObj) => {
    noteObj.status = 'active'
    noteObj.holdStarted = false
    noteObj.container.visible = false
  })
  holdingNotes = {}
  
  if (effectsContainer) {
    effectsContainer.removeChildren()
  }
}

// 窗口大小调整
const handleResize = () => {
  if (!app || !containerRef.value) return
  const { width, height } = containerRef.value.getBoundingClientRect()
  app.renderer.resize(width, height)
  drawLanes()
}

// 生命周期
onMounted(() => {
  initPixi()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (app) {
    app.destroy(true, { children: true, texture: true, baseTexture: true })
  }
})

// 监听属性变化
watch(() => props.notes, () => {
  if (notesContainer) {
    createNotes()
  }
})

watch(() => props.columns, () => {
  if (laneContainer) {
    drawLanes()
  }
  if (notesContainer) {
    createNotes()
  }
})

// 暴露方法给父组件
defineExpose({
  handleKeyPress,
  handleKeyRelease,
  checkMissedNotes,
  reset
})
</script>

<style scoped>
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
