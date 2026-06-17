const storage = require('../../utils/storage')
const api = require('../../utils/api')

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

  async onShow() {
    const hist = storage.getHistory()

    // 从服务器加载挑战历史
    let challengeItems = []
    try {
      const res = await api.getChallenges()
      if (res.code === 0 && res.challenges) {
        challengeItems = res.challenges
          .filter(c => c.status === 'completed' && c.result)
          .map(c => {
            let result = {}
            try { result = typeof c.result === 'string' ? JSON.parse(c.result) : (c.result || {}) } catch (e) {}
            return {
              ts: (c.updated_at || '').replace('T', ' ').substring(0, 19),
              icon: '💕',
              name: '恋爱挑战',
              color: '#ec4899',
              summary: `${c.from_nickname} ❤ ${c.to_nickname} · ${result.score || 0}%`
            }
          })
      }
    } catch (e) {}

    // 合并本地历史和挑战历史
    const localItems = hist.map(h => {
      const lbl = LABELS[h.test] || { icon: '📌', name: h.test, color: '#7c3aed' }
      return {
        ts: (h.ts || '').replace('T', ' '),
        icon: lbl.icon,
        name: lbl.name,
        color: lbl.color,
        summary: summary(h.test, h.data)
      }
    })

    const allItems = [...localItems, ...challengeItems]
      .sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))

    // 统计
    const counts = {}
    hist.forEach(h => { counts[h.test] = (counts[h.test] || 0) + 1 })
    if (challengeItems.length > 0) {
      counts['challenge'] = challengeItems.length
    }

    const countList = [
      ...Object.keys(LABELS)
        .filter(k => counts[k])
        .map(k => ({
          icon: LABELS[k].icon,
          name: LABELS[k].name,
          count: counts[k]
        })),
      ...(counts['challenge'] ? [{ icon: '💕', name: '恋爱挑战', count: counts['challenge'] }] : [])
    ]

    if (allItems.length === 0) {
      this.setData({ items: [], total: 0, counts: [], isEmpty: true })
      return
    }

    this.setData({
      items: allItems,
      total: allItems.length,
      counts: countList,
      isEmpty: false
    })
  }
})
