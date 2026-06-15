const { MBTI_DETAILS } = require('../../utils/data')
const storage = require('../../utils/storage')
const app = getApp()

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

  onShow() {
    const themeColor = app.getThemeColor()
    this.setData({ themeColor })
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor,
      animation: { duration: 300, timingFunc: 'easeIn' }
    })
    const results = storage.getMyResults()
    if (!results.mbti) {
      this.setData({ hasResult: false })
      return
    }

    const mbtiType = results.mbti.type
    const detail = MBTI_DETAILS[mbtiType]

    if (!detail) {
      this.setData({ hasResult: false })
      return
    }

    // 根据MBTI类型选择emoji
    const emojiMap = {
      INTJ: '🏗️', INTP: '🔬', ENTJ: '👑', ENTP: '💡',
      INFJ: '🌟', INFP: '🦋', ENFJ: '🤝', ENFP: '🎭',
      ISTJ: '📋', ISFJ: '🛡️', ESTJ: '💼', ESFJ: '💝',
      ISTP: '🔧', ISFP: '🎨', ESTP: '⚡', ESFP: '🎪'
    }

    this.setData({
      hasResult: true,
      mbtiType,
      nickname: detail.nickname,
      strengths: detail.strengths,
      weaknesses: detail.weaknesses,
      love: detail.love,
      career: detail.career,
      emoji: emojiMap[mbtiType] || '🧠'
    })
  },

  goMbtiTest() {
    wx.navigateTo({ url: '/pages/mbti/mbti' })
  },

  goBack() {
    wx.navigateBack()
  }
})
