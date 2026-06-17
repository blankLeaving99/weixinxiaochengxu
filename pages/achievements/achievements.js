const storage = require('../../utils/storage')
const { ACHIEVEMENTS } = require('../../utils/data')
const app = getApp()

Page({
  data: {
    items: [],
    got: 0,
    total: 0,
    pct: 0,
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
  },

  onShow() {
    const themeColor = app.getThemeColor()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor,
      animation: { duration: 0, timingFunc: 'easeIn' }
    })

    const unlocked = storage.getAchievements()
    let got = 0
    const total = ACHIEVEMENTS.length
    const items = ACHIEVEMENTS.map(a => {
      const [id, icon, title, desc] = a
      const has = !!unlocked[id]
      if (has) got++
      return {
        id,
        icon: has ? icon : '🔒',
        title,
        desc,
        got: has,
        ts: has ? (unlocked[id] || '').split('T')[0] : ''
      }
    })

    // 只调用一次 setData
    this.setData({
      items,
      got,
      total,
      pct: Math.round(got / total * 100),
      themeColor
    })
  }
})
