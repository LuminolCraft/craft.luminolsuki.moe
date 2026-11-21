import { describe, expect, it } from 'vitest'
import { inferSkinType, skinAvatar, skinHeadStyle } from './minecraft'

const TEXTURE = 'https://textures.minecraft.net/texture/abc'
const UUID_HYPHEN = '069a79f4-44e9-4726-a5be-fca90e38aaf5'
const UUID_HEX = '069a79f444e94726a5befca90e38aaf5'

describe('inferSkinType：与后端同一套判定', () => {
  it('URL 优先', () => {
    expect(inferSkinType(TEXTURE)).toBe('url')
  })

  it('36 位带连字符 UUID', () => {
    expect(inferSkinType(UUID_HYPHEN)).toBe('uuid')
  })

  it('32 位无连字符 UUID', () => {
    expect(inferSkinType(UUID_HEX)).toBe('uuid')
  })

  it('其余按角色名', () => {
    expect(inferSkinType('Notch')).toBe('name')
  })
})

describe('skinAvatar：type 驱动', () => {
  it('type=url → 皮肤纹理', () => {
    expect(skinAvatar(TEXTURE, 'url', 64)).toEqual({ url: TEXTURE, texture: true })
  })

  it('type=name → mc-heads', () => {
    expect(skinAvatar('Notch', 'name', 64)).toEqual({
      url: 'https://mc-heads.net/avatar/Notch/64',
      texture: false,
    })
  })

  it('type=uuid → mc-heads，连字符不被转义', () => {
    expect(skinAvatar(UUID_HYPHEN, 'uuid', 64)).toEqual({
      url: `https://mc-heads.net/avatar/${UUID_HYPHEN}/64`,
      texture: false,
    })
  })

  it('type 缺失（旧部署）按值兜底', () => {
    expect(skinAvatar(TEXTURE, undefined, 64)).toEqual({ url: TEXTURE, texture: true })
    expect(skinAvatar(UUID_HEX, undefined, 64)).toEqual({
      url: `https://mc-heads.net/avatar/${UUID_HEX}/64`,
      texture: false,
    })
  })

  it('未知 type（null）→ 不出图，不猜', () => {
    expect(skinAvatar('Notch', null, 64)).toBeNull()
  })

  it('url 类型非 http(s) → null', () => {
    expect(skinAvatar('ftp://example.com/skin.png', 'url', 64)).toBeNull()
    expect(skinAvatar('javascript:alert(1)', 'url', 64)).toBeNull()
    expect(skinAvatar('data:image/png;base64,AAAA', 'url', 64)).toBeNull()
  })

  it('空值 / 纯空白 → null', () => {
    expect(skinAvatar('', 'name', 64)).toBeNull()
    expect(skinAvatar('   ', 'name', 64)).toBeNull()
    expect(skinAvatar(null, 'name', 64)).toBeNull()
    expect(skinAvatar(undefined, 'name', 64)).toBeNull()
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

  it('转义引号与反斜杠，避免注入额外背景层', () => {
    const style = skinHeadStyle('https://x/a"b\\c.png', 8)

    expect(style.backgroundImage).toContain('%22')
    expect(style.backgroundImage).toContain('%5C')
    expect(style.backgroundImage).not.toContain('a"b')
  })

  it('尺寸随显示尺寸等比变化', () => {
    const style = skinHeadStyle(TEXTURE, 24)
    expect(style.backgroundSize).toBe('192px auto, 192px auto')
    expect(style.backgroundPosition).toBe('-120px -24px, -24px -24px')
  })
})
