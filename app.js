const storage = require('./utils/storage')
const api = require('./utils/api')

const THEME_COLORS = {
  purple: '#7c3aed',
  blue: '#2563eb',
  green: '#059669',
  red: '#dc2626',
  orange: '#ea580c',
  pink: '#db2777',
  teal: '#0d9488',
  indigo: '#4f46e5'
}

App({
  onLaunch() {
    // 注册数据同步回调：本地存储变更时自动同步到后端
    storage.setSyncCallbacks({
      onResult: (key, result) => {
        api.saveTestResult(key, result).catch(() => {})
      },
      onMood: (state) => {
        const latest = (state.history || []).slice(-1)[0]
        if (latest) api.addMood(latest).catch(() => {})
      },
      onDaily: (state) => {
        api.updateDailyState(state).catch(() => {})
      }
    })

    this.applyTheme()

    // 检查登录状态，未登录则跳转登录页
    if (!api.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
    }
  },

  applyTheme() {
    const settings = storage.getSettings()
    const key = settings.theme || 'purple'
    const color = THEME_COLORS[key] || THEME_COLORS.purple
    this.globalData._themeColor = color
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: color,
      animation: { duration: 0, timingFunc: 'easeIn' }
    })
  },

  getThemeColor() {
    if (this.globalData._themeColor) return this.globalData._themeColor
    const settings = storage.getSettings()
    const key = settings.theme || 'purple'
    const color = THEME_COLORS[key] || THEME_COLORS.purple
    this.globalData._themeColor = color
    return color
  },

  refreshTheme() {
    this.globalData._themeColor = null
    const color = this.getThemeColor()
    // 通知所有已注册的页面刷新主题
    const callbacks = this.globalData._themeCallbacks || []
    callbacks.forEach(cb => {
      try { cb(color) } catch (e) {}
    })
    return color
  },

  // 页面注册主题变更回调
  registerThemeCallback(cb) {
    if (!this.globalData._themeCallbacks) this.globalData._themeCallbacks = []
    this.globalData._themeCallbacks.push(cb)
  },

  // 页面注销主题变更回调
  unregisterThemeCallback(cb) {
    if (!this.globalData._themeCallbacks) return
    this.globalData._themeCallbacks = this.globalData._themeCallbacks.filter(c => c !== cb)
  },

  globalData: {
    themeColors: THEME_COLORS,
    _themeColor: null,
    _themeCallbacks: [],
    serverUser: null
  }
})
