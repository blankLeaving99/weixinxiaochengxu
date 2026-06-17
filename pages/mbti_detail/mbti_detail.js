const { MBTI_DETAILS, CAREER_MAP } = require('../../utils/data')
const storage = require('../../utils/storage')
const app = getApp()

// 根据MBTI类型选择emoji
const EMOJI_MAP = {
  INTJ: '🏗️', INTP: '🔬', ENTJ: '👑', ENTP: '💡',
  INFJ: '🌟', INFP: '🦋', ENFJ: '🤝', ENFP: '🎭',
  ISTJ: '📋', ISFJ: '🛡️', ESTJ: '💼', ESFJ: '💝',
  ISTP: '🔧', ISFP: '🎨', ESTP: '⚡', ESFP: '🎪'
}

Page({
  data: {
    hasResult: false,
    mbtiType: '',
    nickname: '',
    strengths: [],
    weaknesses: [],
    love: '',
    career: '',
    emoji: '',
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
    this.setData({ themeColor })
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor,
      animation: { duration: 0, timingFunc: 'easeIn' }
    })

    // 强制清除缓存重新读取
    storage.clearCache()
    const results = storage.getMyResults()

    if (!results.mbti || !results.mbti.type) {
      this.setData({ hasResult: false })
      return
    }

    const mbtiType = results.mbti.type
    const detail = MBTI_DETAILS[mbtiType]

    if (!detail) {
      // 兜底：即使 MBTI_DETAILS 中没有，也用 CAREER_MAP 显示基本信息
      const careerInfo = CAREER_MAP[mbtiType]
      if (careerInfo) {
        this.setData({
          hasResult: true,
          mbtiType,
          nickname: careerInfo[0],
          strengths: ['待补充详细分析'],
          weaknesses: ['待补充详细分析'],
          love: '请重新测试以获取详细分析',
          career: careerInfo[1] || '',
          emoji: EMOJI_MAP[mbtiType] || '🧠'
        })
      } else {
        this.setData({ hasResult: false })
      }
      return
    }

    this.setData({
      hasResult: true,
      mbtiType,
      nickname: detail.nickname,
      strengths: detail.strengths,
      weaknesses: detail.weaknesses,
      love: detail.love,
      career: detail.career,
      emoji: EMOJI_MAP[mbtiType] || '🧠'
    })
  },

  goMbtiTest() {
    wx.navigateTo({ url: '/pages/mbti/mbti' })
  },

  goBack() {
    wx.navigateBack()
  }
})
