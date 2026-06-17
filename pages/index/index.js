const storage = require('../../utils/storage')
const api = require('../../utils/api')
const app = getApp()

// tabBar 页面列表，需要用 wx.switchTab 跳转
const TAB_BAR_PAGES = new Set([
  '/pages/index/index',
  '/pages/personality/personality',
  '/pages/achievements/achievements',
  '/pages/settings/settings'
])

function navigateTo(page) {
  if (TAB_BAR_PAGES.has(page)) {
    wx.switchTab({ url: page })
  } else {
    wx.navigateTo({ url: page })
  }
}

const BANNERS = [
  { icon: '🔬', title: 'MBTI 职业性格测试', desc: '48题专业版，测出你的16型人格', color: '#2563eb', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', page: '/pages/mbti/mbti' },
  { icon: '💕', title: '恋爱默契大挑战', desc: '12题异步双人答题，测算情侣默契度', color: '#ec4899', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', page: '/pages/love/love' },
  { icon: '⭐', title: '星座配对测试', desc: '12星座元素匹配，输入生日即可分析', color: '#f59e0b', bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', page: '/pages/zodiac/zodiac' },
  { icon: '🧠', title: '性格匹配分析', desc: '查看所有测试完成状态并生成综合性格分析', color: '#7c3aed', bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', page: '/pages/personality/personality' }
]

const TESTS = [
  { key: 'personality', icon: '🧠', title: '性格匹配分析', desc: '查看所有测试完成状态并生成综合性格分析', color: '#7c3aed', page: '/pages/personality/personality', isOverview: true },
  { key: 'mbti', icon: '🔬', title: 'MBTI 职业性格测试', desc: '48 题专业版，测出你的 16 型人格与职业方向', color: '#2563eb', page: '/pages/mbti/mbti' },
  { key: 'love', icon: '💕', title: '恋爱默契大挑战', desc: '12 题异步双人答题，测算情侣默契度', color: '#ec4899', page: '/pages/love/love' },
  { key: 'zodiac', icon: '⭐', title: '星座配对测试', desc: '12 星座元素匹配，输入生日即可分析', color: '#f59e0b', page: '/pages/zodiac/zodiac' },
  { key: 'taste', icon: '🍜', title: '口味匹配测试', desc: '10 题美食人格，发现你的味觉性格', color: '#10b981', page: '/pages/taste/taste' },
  { key: 'eq', icon: '💖', title: '情商测试', desc: '12 题测出你的情绪管理能力', color: '#ec4899', page: '/pages/eq/eq' },
  { key: 'iq', icon: '🧠', title: '智商测试', desc: '15 道逻辑推理题测出你的智商', color: '#6366f1', page: '/pages/iq/iq' },
  { key: 'color', icon: '🎨', title: '色彩性格测试', desc: '通过颜色偏好揭示你的性格密码', color: '#f59e0b', page: '/pages/color/color' },
  { key: 'love_type', icon: '💕', title: '恋爱类型测试', desc: '测测你是什么类型的恋人', color: '#f43f5e', page: '/pages/love_type/love_type' },
  { key: 'career', icon: '💼', title: '职业倾向测试', desc: '发现适合你的职业方向', color: '#3b82f6', page: '/pages/career/career' },
  { key: 'mbti_detail', icon: '📋', title: 'MBTI详细分析', desc: '深入了解你的MBTI人格类型', color: '#8b5cf6', page: '/pages/mbti_detail/mbti_detail' }
]

const TOOLS = [
  { icon: '👥', label: '好友', page: '/pages/friends/friends', bg: '#ede9fe' },
  { icon: '🏆', label: '成就', page: '/pages/achievements/achievements', bg: '#fef3c7' },
  { icon: '📈', label: '档案', page: '/pages/history/history', bg: '#dbeafe' },
  { icon: '📅', label: '每日一题', page: '/pages/daily/daily', bg: '#d1fae5' },
  { icon: '📝', label: '心情日记', page: '/pages/mood/mood', bg: '#fce7f3' },
  { icon: '🎴', label: '分享卡', page: '/pages/share/share', bg: '#fce7f3' },
  { icon: '💬', label: 'AI 解读', page: '/pages/ai/ai', bg: '#e0e7ff' },
  { icon: '🤝', label: '猜 TA', page: '/pages/guess/guess', bg: '#fef9c3' },
  { icon: '🧪', label: '趣味测试', page: '/pages/fun/fun', bg: '#fce7f3' },
  { icon: '🎯', label: '个性化推荐', page: '/pages/recommend/recommend', bg: '#dbeafe' },
  { icon: '⚙️', label: '设置', page: '/pages/settings/settings', bg: '#f3f4f6' }
]

Page({
  data: {
    banners: BANNERS,
    tests: [],
    tools: TOOLS,
    doneCount: 0,
    totalCount: 0,
    achGot: 0,
    achTotal: 22,
    streak: 0,
    level: 1,
    levelIcon: '🌱',
    levelTitle: '新手上路',
    xpCurrent: 0,
    xpNeeded: 100,
    xpProgress: 0,
    totalXp: 0,
    themeColor: '#7c3aed',
    // 挑战通知
    pendingChallenges: [],
    hasPending: false
  },

  onLoad() {
    this._themeCb = (color) => {
      this.setData({ themeColor: color })
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: color, animation: { duration: 300, timingFunc: 'easeIn' } })
      // 重建测试列表中依赖主题色的数据
      const tests = this.data.tests.map(t => {
        if (t.isOverview) return Object.assign({}, t, { statusColor: color })
        return t
      })
      this.setData({ tests })
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

    // 一次性读取所有数据
    const data = storage.load()
    const nonOverview = TESTS.filter(t => !t.isOverview)
    const totalCount = nonOverview.length
    const doneCount = nonOverview.filter(t => data[t.key]).length

    // 批量构建测试列表
    const tests = TESTS.map(t => {
      const result = data[t.key]
      let status, statusColor, btnText, summary = ''
      if (t.isOverview) {
        status = `📊 已完成 ${doneCount}/${totalCount}`
        statusColor = themeColor
        btnText = '查看分析'
      } else if (result) {
        status = '✅ 已完成'
        statusColor = '#10b981'
        btnText = '查看 / 重测'
        summary = this.getSummary(t.key, result)
      } else {
        status = '⭕ 未完成'
        statusColor = '#9ca3af'
        btnText = '开始测试'
      }
      return Object.assign({}, t, {
        status, statusColor, btnText, summary,
        hasSummary: !!summary
      })
    })

    const ach = data._achievements || {}
    const dailyState = data._daily || { streak: 0 }
    const pts = data._points || { xp: 0, level: 1, totalEarned: 0 }
    const levelInfo = storage.getLevelInfo(pts.level)

    // 计算当前等级进度
    let xpInLevel = pts.xp
    for (let i = 1; i < pts.level; i++) {
      xpInLevel -= (100 + (i - 1) * 50)
    }
    const xpNeeded = levelInfo.xpNeeded
    const xpProgress = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))

    // 只调用一次 setData
    this.setData({
      themeColor,
      tests,
      doneCount,
      totalCount,
      achGot: Object.keys(ach).length,
      streak: dailyState.streak || 0,
      level: pts.level,
      levelIcon: levelInfo.icon,
      levelTitle: levelInfo.title,
      xpCurrent: xpInLevel,
      xpNeeded,
      xpProgress,
      totalXp: pts.totalEarned
    })

    // 检查待处理的挑战
    this.checkPendingChallenges()
  },

  async checkPendingChallenges() {
    try {
      const res = await api.getPendingChallenges()
      if (res.code === 0 && res.challenges && res.challenges.length > 0) {
        this.setData({
          pendingChallenges: res.challenges,
          hasPending: true
        })
      } else {
        this.setData({ pendingChallenges: [], hasPending: false })
      }
    } catch (e) {
      // 网络错误时清除通知，避免卡住
      this.setData({ pendingChallenges: [], hasPending: false })
    }
  },

  // 点击挑战通知，跳转到对应测试
  onChallengeTap(e) {
    const challenge = e.currentTarget.dataset.item
    const testKey = challenge.test_key
    const challengeId = challenge.id
    const friendName = challenge.from_nickname

    const testMap = {
      'love': '/pages/love/love',
      'zodiac': '/pages/zodiac/zodiac'
    }
    const page = testMap[testKey]
    if (page) {
      wx.navigateTo({
        url: `${page}?challengeId=${challengeId}&friendName=${encodeURIComponent(friendName)}`
      })
    }
  },

  // 忽略挑战（从通知中移除）
  dismissChallenge(e) {
    const challengeId = e.currentTarget.dataset.id
    const pending = this.data.pendingChallenges.filter(c => c.id !== challengeId)
    this.setData({
      pendingChallenges: pending,
      hasPending: pending.length > 0
    })
  },

  getSummary(key, v) {
    if (key === 'mbti') return `类型：${v.type}  ${v.nick}`
    if (key === 'love') return `${v.a} ❤ ${v.b}  ·  默契 ${v.score}%`
    if (key === 'zodiac') return `${v.z1} × ${v.z2}  ·  ${v.score} 分`
    if (key === 'taste') return `美食人格：${v.name}`
    return ''
  },

  onBannerTap(e) {
    navigateTo(e.currentTarget.dataset.page)
  },

  goToTest(e) {
    navigateTo(e.currentTarget.dataset.page)
  },

  goTool(e) {
    navigateTo(e.currentTarget.dataset.page)
  },

  goAllTests() {
    wx.showToast({ title: '向下滚动查看全部测试', icon: 'none' })
  },

  clearData() {
    wx.showModal({
      title: '确认',
      content: '确定要清除所有测试结果吗？\n（成就、好友、设置等不会被清除，如需完全重置请到「设置」清除全部数据）',
      confirmText: '清除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          storage.clearResults()
          this.refreshData()
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      }
    })
  }
})
