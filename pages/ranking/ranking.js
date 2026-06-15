const storage = require('../../utils/storage')
const { overallScore } = require('../../utils/helpers')

function scoreColor(s) {
  if (s == null) return '#9ca3af'
  if (s >= 80) return '#10b981'
  if (s >= 60) return '#7c3aed'
  return '#9ca3af'
}

Page({
  data: {
    list: [],
    total: 0,
    isEmpty: true
  },

  onShow() {
    const my = storage.getMyResults()
    const friends = storage.getFriends()
    const ranking = Object.keys(friends).map(name => {
      const score = overallScore(my, (friends[name] || {}).results || {})
      return { name, score }
    })
    ranking.sort((a, b) => {
      const sa = a.score == null ? -1 : a.score
      const sb = b.score == null ? -1 : b.score
      return sb - sa
    })
    const list = ranking.map((r, i) => ({
      name: r.name,
      score: r.score,
      scoreColor: scoreColor(r.score),
      medal: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`,
      hasScore: r.score != null
    }))
    this.setData({
      list,
      total: ranking.length,
      isEmpty: ranking.length === 0
    })
  }
})
