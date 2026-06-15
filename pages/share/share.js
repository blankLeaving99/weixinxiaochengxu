const storage = require('../../utils/storage')

const CARD_TYPES = [
  { key: 'mbti', icon: '🔬', title: 'MBTI 性格', c1: '#7c3aed', c2: '#a78bfa' },
  { key: 'love', icon: '💕', title: '恋爱默契', c1: '#ec4899', c2: '#f472b6' },
  { key: 'zodiac', icon: '⭐', title: '星座配对', c1: '#f59e0b', c2: '#fbbf24' },
  { key: 'taste', icon: '🍜', title: '口味人格', c1: '#10b981', c2: '#34d399' }
]

function wrapText(ctx, text, maxWidth) {
  const lines = []
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

Page({
  data: {
    list: [],
    isEmpty: true,
    showCard: false,
    cardImage: ''
  },

  onShow() {
    const my = storage.getMyResults()
    const list = CARD_TYPES
      .filter(c => my[c.key])
      .map(c => Object.assign({}, c, {
        summary: this.getSummary(c.key, my[c.key])
      }))
    this.setData({
      list,
      isEmpty: list.length === 0,
      showCard: false,
      cardImage: ''
    })
  },

  getSummary(key, data) {
    if (key === 'mbti') return `${data.type} · ${data.nick || ''}`
    if (key === 'love') return `${data.a} ❤ ${data.b} · ${data.score}%`
    if (key === 'zodiac') return `${data.z1} × ${data.z2} · ${data.score}分`
    if (key === 'taste') return data.name || ''
    return ''
  },

  generate(e) {
    const key = e.currentTarget.dataset.key
    const cfg = CARD_TYPES.find(c => c.key === key)
    const data = storage.getMyResults()[key]
    const profile = storage.getProfile()
    if (!data) return

    const query = wx.createSelectorQuery().in(this)
    query.select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          wx.showToast({ title: 'Canvas 未就绪', icon: 'none' })
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const W = 750
        const H = 1125
        canvas.width = W
        canvas.height = H
        this.drawCard(ctx, W, H, cfg, data, profile.name || '我')

        wx.canvasToTempFilePath({
          canvas,
          fileType: 'png',
          quality: 1,
          success: (r) => {
            this.setData({ showCard: true, cardImage: r.tempFilePath })
          },
          fail: (err) => {
            wx.showToast({ title: '生成失败', icon: 'none' })
            console.error(err)
          }
        }, this)
      })
  },

  drawCard(ctx, W, H, cfg, data, profileName) {
    // 渐变背景
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, cfg.c1)
    grad.addColorStop(1, cfg.c2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // 顶部 icon + 标题
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.font = 'bold 100px sans-serif'
    ctx.fillText(cfg.icon, W / 2, 130)
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText(cfg.title, W / 2, 195)

    // 白色卡片
    const pad = 50
    const top = 240
    const bottom = H - 220
    this.roundRect(ctx, pad, top, W - pad * 2, bottom - top, 28)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fill()

    // 主内容
    const cx = W / 2
    let y = top + 80
    ctx.fillStyle = cfg.c1
    ctx.textAlign = 'center'

    if (cfg.key === 'mbti') {
      ctx.font = 'bold 110px sans-serif'
      ctx.fillText(data.type || '', cx, y + 60)
      y += 130
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 40px sans-serif'
      ctx.fillText(data.nick || '', cx, y + 20)
      y += 80
      ctx.fillStyle = '#6b7280'
      ctx.font = '22px sans-serif'
      ctx.fillText('推荐职业方向', cx, y)
      y += 40
      ctx.fillStyle = '#1f2937'
      ctx.font = '24px sans-serif'
      const careers = (data.careers || '').slice(0, 90)
      const wrapped = wrapText(ctx, careers, W - pad * 2 - 80)
      wrapped.forEach(line => {
        ctx.fillText(line, cx, y)
        y += 36
      })
    } else if (cfg.key === 'love') {
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 34px sans-serif'
      ctx.fillText(`${data.a || ''}  ❤  ${data.b || ''}`, cx, y)
      y += 90
      ctx.fillStyle = cfg.c1
      ctx.font = 'bold 160px sans-serif'
      ctx.fillText(`${data.score || 0}%`, cx, y + 40)
      y += 180
      ctx.fillStyle = '#1f2937'
      ctx.font = '26px sans-serif'
      const wrapped = wrapText(ctx, data.comment || '', W - pad * 2 - 80)
      wrapped.forEach(line => {
        ctx.fillText(line, cx, y)
        y += 40
      })
    } else if (cfg.key === 'zodiac') {
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 38px sans-serif'
      ctx.fillText(`${data.z1 || ''}  ×  ${data.z2 || ''}`, cx, y)
      y += 100
      ctx.fillStyle = cfg.c1
      ctx.font = 'bold 120px sans-serif'
      ctx.fillText(`${data.score || 0}分`, cx, y + 40)
      y += 150
      ctx.fillStyle = '#1f2937'
      ctx.font = '24px sans-serif'
      const wrapped = wrapText(ctx, data.comment || '', W - pad * 2 - 80)
      wrapped.forEach(line => {
        ctx.fillText(line, cx, y)
        y += 38
      })
    } else if (cfg.key === 'taste') {
      ctx.fillStyle = cfg.c1
      ctx.font = 'bold 72px sans-serif'
      ctx.fillText(data.name || '', cx, y + 30)
      y += 130
      // 维度条
      const scores = data.scores || {}
      const keys = Object.keys(scores)
      ctx.textAlign = 'left'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillStyle = '#374151'
      const bw = 360
      const lx = pad + 90
      keys.forEach(k => {
        ctx.fillStyle = '#374151'
        ctx.fillText(k, lx - 50, y + 8)
        ctx.fillStyle = '#e5e7eb'
        ctx.fillRect(lx, y - 8, bw, 16)
        ctx.fillStyle = cfg.c1
        ctx.fillRect(lx, y - 8, bw * Math.min(1, scores[k] / 5), 16)
        y += 40
      })
    }

    // 底部署名
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.font = '24px sans-serif'
    ctx.fillText(`— ${profileName} —`, W / 2, H - 130)
    ctx.font = '18px sans-serif'
    ctx.globalAlpha = 0.85
    ctx.fillText('性格测试套件 · PersonalityTestSuite', W / 2, H - 90)
    ctx.globalAlpha = 1
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  },

  saveImage() {
    if (!this.data.cardImage) return
    wx.saveImageToPhotosAlbum({
      filePath: this.data.cardImage,
      success: () => {
        wx.showToast({ title: '已保存到相册 ✓', icon: 'success' })
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('auth deny') >= 0) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在小程序设置中授予相册权限后重试。',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting()
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  closeCard() {
    this.setData({ showCard: false })
  }
})
