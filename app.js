const storage = require('./utils/storage')

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
    this.applyTheme()
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
    return this.getThemeColor()
  },

  globalData: {
    themeColors: THEME_COLORS,
    _themeColor: null
  }
})
