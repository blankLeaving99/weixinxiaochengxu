const storage = require('../../utils/storage')

const LABELS = {
  mbti: { icon: '🔬', name: 'MBTI', color: '#2563eb' },
  love: { icon: '💕', name: '恋爱默契', color: '#ec4899' },
  zodiac: { icon: '⭐', name: '星座', color: '#f59e0b' },
  taste: { icon: '🍜', name: '口味', color: '#10b981' }
}

function summary(test, data) {
  if (!data) return ''
  if (test === 'mbti') return `${data.type || ''} ${data.nick || ''}`
  if (test === 'love') return `${data.a || ''} ❤ ${data.b || ''} · ${data.score || 0}%`
  if (test === 'zodiac') return `${data.z1 || ''} × ${data.z2 || ''} · ${data.score || 0}分`
  if (test === 'taste') return data.name || ''
  return ''
}

Page({
  data: {
    items: [],
    total: 0,
    counts: [],
    isEmpty: true
  },

  onShow() {
    const hist = storage.getHistory()
    if (!hist.length) {
      this.setData({ items: [], total: 0, counts: [], isEmpty: true })
      return
    }
    const counts = {}
    hist.forEach(h => { counts[h.test] = (counts[h.test] || 0) + 1 })

    const items = hist.slice().reverse().map(h => {
      const lbl = LABELS[h.test] || { icon: '📌', name: h.test, color: '#7c3aed' }
      return {
        ts: (h.ts || '').replace('T', ' '),
        icon: lbl.icon,
        name: lbl.name,
        color: lbl.color,
        summary: summary(h.test, h.data)
      }
    })

    const countList = Object.keys(LABELS)
      .filter(k => counts[k])
      .map(k => ({
        icon: LABELS[k].icon,
        name: LABELS[k].name,
        count: counts[k]
      }))

    this.setData({
      items,
      total: hist.length,
      counts: countList,
      isEmpty: false
    })
  }
})
