const storage = require('../../utils/storage')
const api = require('../../utils/api')
const { overallScore } = require('../../utils/helpers')
const app = getApp()

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
    isEmpty: true,
    joinRanking: false,
    themeColor: '#7c3aed'
  },

  onLoad() {
    this._themeCb = (color) => {
      this.setData({ themeColor: color })
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: color, animation: { duration: 300, timingFunc: 'easeIn' } })
    }
    app.registerThemeCallback(this._themeCb)
  },

  onUnload() {
    app.unregisterThemeCallback(this._themeCb)
    if (this._pollTimer) clearInterval(this._pollTimer)
  },

  async onShow() {
    const themeColor = app.getThemeColor()
    this.setData({ themeColor })
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor,
      animation: { duration: 0, timingFunc: 'easeIn' }
    })

    await this.loadRanking()
  },

  async loadRanking() {
    try {
      // 从服务器获取好友列表
      const friendsRes = await api.getFriends()
      if (friendsRes.code !== 0) return

      const my = storage.getMyResults()
      const friends = friendsRes.friends || []

      // 获取每个好友的测试结果并计算匹配度
      const ranking = []
      for (const f of friends) {
        try {
          const res = await api.getFriendResults(f.friend_id)
          if (res.code === 0 && res.results) {
            const score = overallScore(my, res.results)
            ranking.push({
              id: f.friend_id,
              name: f.nickname || '未知',
              score,
              avatar: f.avatar || ''
            })
          }
        } catch (e) {}
      }

      // 排序
      ranking.sort((a, b) => {
        const sa = a.score == null ? -1 : a.score
        const sb = b.score == null ? -1 : b.score
        return sb - sa
      })

      const list = ranking.map((r, i) => ({
        id: r.id,
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
    } catch (e) {
      console.error('加载排行榜失败:', e)
    }
  },

  // 切换参与排行榜
  async toggleRanking() {
    const newVal = !this.data.joinRanking
    this.setData({ joinRanking: newVal })
    try {
      await api.updateDiscoverable(newVal)
      wx.showToast({
        title: newVal ? '已参与排行榜' : '已退出排行榜',
        icon: 'none'
      })
    } catch (e) {
      this.setData({ joinRanking: !newVal })
    }
  },

  goFriends() {
    wx.navigateTo({ url: '/pages/friends/friends' })
  }
})
