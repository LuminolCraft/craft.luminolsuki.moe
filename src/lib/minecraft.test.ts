import { describe, expect, it } from 'vitest'
import { skinAvatar, skinHeadStyle } from './minecraft'

const TEXTURE = 'https://textures.minecraft.net/texture/abc'

describe('skinAvatar：skin 三态 → 头像描述', () => {
  it('图片 URL → 皮肤纹理（texture: true）', () => {
    expect(skinAvatar(TEXTURE, 64)).toEqual({ url: TEXTURE, texture: true })
  })

  it('角色名 → mc-heads 头部图', () => {
    expect(skinAvatar('Notch', 64)).toEqual({
      url: 'https://mc-heads.net/avatar/Notch/64',
      texture: false,
    })
  })

  it('UUID → mc-heads，连字符不被转义', () => {
    expect(skinAvatar('069a79f4-44e9-4726-a5be-fca90e38aaf5', 64)).toEqual({
      url: 'https://mc-heads.net/avatar/069a79f4-44e9-4726-a5be-fca90e38aaf5/64',
      texture: false,
    })
  })

  it('空值 / 纯空白 → null（调用方出首字母）', () => {
    expect(skinAvatar('', 64)).toBeNull()
    expect(skinAvatar('   ', 64)).toBeNull()
    expect(skinAvatar(null, 64)).toBeNull()
    expect(skinAvatar(undefined, 64)).toBeNull()
  })
})

describe('skinHeadStyle：头部正面 + 第二层帽檐双层裁切', () => {
  it('两层同图背景，尺寸按 8 倍、位置按 1 倍与 5 倍换算', () => {
    const style = skinHeadStyle(TEXTURE, 40)

    // 第一层是帽檐（必须叠在脸上），第二层是脸
    expect(style.backgroundImage).toBe(`url("${TEXTURE}"), url("${TEXTURE}")`)
    expect(style.backgroundSize).toBe('320px auto, 320px auto')
    expect(style.backgroundPosition).toBe('-200px -40px, -40px -40px')
    expect(style.backgroundRepeat).toBe('no-repeat, no-repeat')
    // 关闭抗锯齿，保持像素风
    expect(style.imageRendering).toBe('pixelated')
  })

  it('尺寸随显示尺寸等比变化', () => {
    const style = skinHeadStyle(TEXTURE, 24)
    expect(style.backgroundSize).toBe('192px auto, 192px auto')
    expect(style.backgroundPosition).toBe('-120px -24px, -24px -24px')
  })
})
