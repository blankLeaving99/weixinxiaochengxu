const storage = require('../../utils/storage')
const api = require('../../utils/api')
const {
  mbtiCompat, tasteCompat, elementScore, getElementOf
} = require('../../utils/helpers')
const app = getApp()

function scoreColor(s, themeColor) {
  if (s == null) return '#9ca3af'
  if (s >= 80) return '#10b981'
  if (s >= 60) return themeColor || '#7c3aed'
  return '#9ca3af'
}

Page({
  data: {
    myName: '我',
    friendName: '',
    cards: [],
    overall: null,
    overallComment: '',
    themeColor: '#7c3aed'
  },

  async onLoad(options) {
    this._themeCb = () => {
      const themeColor = app.getThemeColor()
      this.setData({ themeColor })
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: themeColor,
        animation: { duration: 300, timingFunc: 'easeIn' }
      })
    }
    app.registerThemeCallback(this._themeCb)

    const themeColor = app.getThemeColor()
    this.setData({ themeColor })
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor,
      animation: { duration: 0, timingFunc: 'easeIn' }
    })

    const friendName = decodeURIComponent(options.name || '')
    const friendId = options.friendId || ''
    const profile = storage.getProfile()
    const myName = profile.name || '我'

    let friendResults = null

    try {
      if (friendId) {
        // 从后端获取好友测试结果
        const res = await api.getFriendResults(friendId)
        if (res.code === 0) {
          friendResults = res.results
        }
      } else {
        // 本地好友
        const friend = storage.getFriends()[friendName]
        if (friend) {
          friendResults = friend.results || {}
        }
      }
    } catch (e) {
      console.error('获取好友数据失败:', e)
    }

    if (!friendResults) {
      wx.showToast({ title: '好友数据不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }

    const my = storage.getMyResults()
    const fr = friendResults
    const cards = []
    const scores = []

    // MBTI
    const myMbti = (my.mbti || {}).type
    const fMbti = (fr.mbti || {}).type
    if (myMbti && fMbti) {
      const s = mbtiCompat(myMbti, fMbti)
      scores.push(s)
      cards.push({
        title: '🔬 MBTI 兼容度',
        score: s,
        scoreColor: scoreColor(s, themeColor),
        detail: `你：${myMbti}（${(my.mbti.nick) || ''}）\nTA：${fMbti}（${(fr.mbti.nick) || ''}）`
      })
    } else {
      cards.push({
        title: '🔬 MBTI 兼容度',
        score: null,
        scoreColor: '#9ca3af',
        detail: '需要双方都完成 MBTI 测试'
      })
    }

    // 星座
    const myZ = (my.zodiac || {}).z1
    const fZ = (fr.zodiac || {}).z1
    if (myZ && fZ) {
      const e1 = getElementOf(myZ)
      const e2 = getElementOf(fZ)
      let s = (e1 && e2) ? elementScore(e1, e2) : 70
      if (myZ === fZ) s = Math.min(99, s + 3)
      scores.push(s)
      cards.push({
        title: '⭐ 星座配对',
        score: s,
        scoreColor: scoreColor(s, themeColor),
        detail: `你：${myZ}（${e1}元素）\nTA：${fZ}（${e2}元素）`
      })
    } else {
      cards.push({
        title: '⭐ 星座配对',
        score: null,
        scoreColor: '#9ca3af',
        detail: '需要双方都完成星座测试'
      })
    }

    // 口味
    const myT = (my.taste || {}).type
    const fT = (fr.taste || {}).type
    if (myT && fT) {
      const s = tasteCompat(myT, fT)
      scores.push(s)
      cards.push({
        title: '🍜 口味兼容度',
        score: s,
        scoreColor: scoreColor(s, themeColor),
        detail: `你：${(my.taste.name) || ''}\nTA：${(fr.taste.name) || ''}`
      })
    } else {
      cards.push({
        title: '🍜 口味兼容度',
        score: null,
        scoreColor: '#9ca3af',
        detail: '需要双方都完成口味测试'
      })
    }

    let overall = null
    let overallComment = ''
    if (scores.length) {
      overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      if (overall >= 85) overallComment = '天造地设的一对！'
      else if (overall >= 70) overallComment = '非常合拍，相处会很愉快～'
      else if (overall >= 55) overallComment = '有一定差异，多沟通会更好'
      else overallComment = '差异较大，但互补也是吸引'
      // 完美匹配成就
      if (overall >= 90 && storage.unlockAchievement('perfect_match')) {
        setTimeout(() => {
          wx.showModal({
            title: '🎉 恭喜解锁新成就！',
            content: '💯 完美匹配：与某位好友综合契合度 ≥ 90',
            showCancel: false,
            confirmText: '太棒了'
          })
        }, 600)
      }
    }

    wx.setNavigationBarTitle({ title: `🔍 与 ${friendName} 对比` })
    this.setData({ myName, friendName, cards, overall, overallComment })
  },

  onUnload() {
    app.unregisterThemeCallback(this._themeCb)
  }
})
