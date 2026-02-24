import { Mesh, PlaneGeometry, Texture, MeshGeometry, NineSliceSprite } from 'pixi.js'

// 纹理切片参数（参考 paletteworks-editor）
const TEXTURE_WIDTH = 354
const TEXTURE_HEIGHT = 186
const SIDE_WIDTH = 53    // 透明边距宽度
const SIDE_HEIGHT = 53   // 透明边距高度
const SLICE_X = 91       // 左/右边缘宽度
const SLICE_T = 72       // 顶部边缘高度
const SLICE_B = 80       // 底部边缘高度

// 计算比例
const SIDE_RATIO_X = SIDE_WIDTH / TEXTURE_WIDTH
const SIDE_RATIO_Y = SIDE_HEIGHT / TEXTURE_HEIGHT

/**
 * 使用 NineSliceSprite 创建音符（支持 9-slice 缩放）
 * @param texture 纹理
 * @param targetWidth 目标可见宽度（不包含透明边）
 * @param targetHeight 目标可见高度（不包含透明边）
 * @returns NineSliceSprite 实例
 */
export function createNineSliceNote(
  texture: Texture,
  targetWidth: number,
  targetHeight: number
): NineSliceSprite {
  // 计算透明边距在目标尺寸下的大小
  const sideX = targetWidth * SIDE_RATIO_X
  const sideY = targetHeight * SIDE_RATIO_Y
  
  // 实际渲染宽度/高度需要包含透明边距
  const actualWidth = targetWidth + 2 * sideX
  const actualHeight = targetHeight + 2 * sideY
  
  const sprite = new NineSliceSprite({
    texture,
    leftWidth: SLICE_X,
    topHeight: SLICE_T,
    rightWidth: SLICE_X,
    bottomHeight: SLICE_B
  })

  sprite.width = actualWidth
  sprite.height = actualHeight
  sprite.anchor.set(0.5)

  return sprite
}

/**
 * 创建音符 Mesh（基于 MeshGeometry）
 * @param texture 纹理
 * @param width 宽度
 * @param height 高度
 * @returns Mesh 实例
 */
export function createNoteMesh(texture: Texture, width: number, height: number): Mesh {
  // 使用简单的 MeshGeometry 创建矩形，完全填充指定宽高
  const halfW = width / 2
  const halfH = height / 2

  const geometry = new MeshGeometry({
    positions: new Float32Array([
      -halfW, -halfH, // 左上
      halfW, -halfH,  // 右上
      halfW, halfH,   // 右下
      -halfW, halfH   // 左下
    ]),
    uvs: new Float32Array([
      0, 0,  // 左上
      1, 0,  // 右上
      1, 1,  // 右下
      0, 1   // 左下
    ]),
    indices: new Uint32Array([
      0, 1, 2,  // 第一个三角形
      0, 2, 3   // 第二个三角形
    ])
  })

  const mesh = new Mesh({
    geometry,
    texture
  })

  // 不需要设置 pivot，因为顶点已经以中心为原点
  return mesh
}

/**
 * 创建长条音符路径 Mesh（使用 MeshGeometry）
 * @param texture 路径纹理
 * @param x 中心 X 坐标（忽略，为了兼容性保留）
 * @param yStart 起始 Y 坐标（头部）
 * @param yEnd 结束 Y 坐标（尾部）
 * @param width 宽度
 * @returns Mesh 实例
 */
export function createHoldPath(
  texture: Texture,
  x: number,
  yStart: number,
  yEnd: number,
  width: number
): Mesh {
  const height = Math.abs(yEnd - yStart)
  const halfW = width / 2
  const halfH = height / 2

  // 创建一个简单的矩形来表示长条主体
  const geometry = new MeshGeometry({
    positions: new Float32Array([
      -halfW, -halfH, // 左上
      halfW, -halfH,  // 右上
      halfW, halfH,   // 右下
      -halfW, halfH   // 左下
    ]),
    uvs: new Float32Array([
      0, 0,   // 左上
      1, 0,   // 右上
      1, 1,   // 右下
      0, 1    // 左下
    ]),
    indices: new Uint32Array([
      0, 1, 2,
      0, 2, 3
    ])
  })

  const mesh = new Mesh({
    geometry,
    texture
  })

  // 设置位置为中点
  const centerY = (yStart + yEnd) / 2
  mesh.position.set(x, centerY)

  return mesh
}

/**
 * 简单的音符 Mesh 创建函数（使用自定义 MeshGeometry）
 * 可以直接控制顶点和 UV 坐标
 */
export function createSimpleNoteMesh(
  texture: Texture,
  width: number,
  height: number
): Mesh {
  // 创建一个简单的矩形 mesh
  const halfW = width / 2
  const halfH = height / 2

  const geometry = new MeshGeometry({
    positions: new Float32Array([
      -halfW, -halfH, // 左上
      halfW, -halfH,  // 右上
      halfW, halfH,   // 右下
      -halfW, halfH   // 左下
    ]),
    uvs: new Float32Array([
      0, 0,  // 左上
      1, 0,  // 右上
      1, 1,  // 右下
      0, 1   // 左下
    ]),
    indices: new Uint32Array([
      0, 1, 2,  // 第一个三角形
      0, 2, 3   // 第二个三角形
    ])
  })

  const mesh = new Mesh({
    geometry,
    texture
  })

  return mesh
}

/**
 * 更新 Mesh 的尺寸
 * @param mesh Mesh 实例
 * @param width 新宽度
 * @param height 新高度
 */
export function updateMeshSize(mesh: Mesh, width: number, height: number) {
  mesh.width = width
  mesh.height = height
}
