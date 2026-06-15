const storage = require('../../utils/storage')

const THEMES = [
  { key: 'purple',  color: '#7c3aed', name: '星空紫', emoji: '💜' },
  { key: 'blue',    color: '#2563eb', name: '海洋蓝', emoji: '💙' },
  { key: 'green',   color: '#059669', name: '森林绿', emoji: '💚' },
  { key: 'red',     color: '#dc2626', name: '烈焰红', emoji: '❤️' },
  { key: 'orange',  color: '#ea580c', name: '活力橙', emoji: '🧡' },
  { key: 'pink',    color: '#db2777', name: '樱花粉', emoji: '💗' },
  { key: 'teal',    color: '#0d9488', name: '薄荷青', emoji: '🩵' },
  { key: 'indigo',  color: '#4f46e5', name: '靛蓝',   emoji: '💙' }
]

Page({
  data: {
    profileName: '',
    userId: '',
    doneCount: 0,
    achCount: 0,
    friendCount: 0,
    level: 1,
    levelIcon: '🌱',
    levelTitle: '新手上路',
    totalXp: 0,
    themes: THEMES,
    currentTheme: 'purple',
    currentColor: '#7c3aed'
  },

  onShow() {
    // 一次性读取所有数据
    const data = storage.load()
    const profile = data._profile || { name: '' }
    const results = {}
    const achievements = data._achievements || {}
    const friends = data._friends || {}
    const pts = data._points || { xp: 0, level: 1, totalEarned: 0 }
    const settings = Object.assign({ theme: 'light', fontScale: 1.0, aiProvider: 'baidu', aiApiKey: '', aiSecretKey: '' }, data._settings || {})

    // 分离测试结果
    Object.keys(data).forEach(k => {
      if (!k.startsWith('_')) results[k] = data[k]
    })

    const levelInfo = storage.getLevelInfo(pts.level)
    const themeKey = settings.theme || 'purple'
    const theme = THEMES.find(t => t.key === themeKey) || THEMES[0]

    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: theme.color,
      animation: { duration: 0, timingFunc: 'easeIn' }
    })

    // 只调用一次 setData
    this.setData({
      profileName: profile.name || '',
      userId: this.generateUserId(),
      doneCount: Object.keys(results).length,
      achCount: Object.keys(achievements).length,
      friendCount: Object.keys(friends).length,
      level: pts.level,
      levelIcon: levelInfo.icon,
      levelTitle: levelInfo.title,
      totalXp: pts.totalEarned,
      currentTheme: themeKey,
      currentColor: theme.color
    })
  },

  onThemeTap(e) {
    const key = e.currentTarget.dataset.key
    const theme = THEMES.find(t => t.key === key)
    if (!theme || key === this.data.currentTheme) return

    storage.updateSetting('theme', key)
    app.refreshTheme()
    this.setData({
      currentTheme: key,
      currentColor: theme.color
    })

    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: theme.color,
      animation: { duration: 300, timingFunc: 'easeIn' }
    })

    wx.showToast({ title: `已切换为${theme.name}`, icon: 'none' })
  },

  generateUserId() {
    let userId = wx.getStorageSync('user_id')
    if (!userId) {
      userId = 'U' + Date.now().toString(36).toUpperCase()
      wx.setStorageSync('user_id', userId)
    }
    return userId
  },

  onNameInput(e) {
    this.setData({ profileName: e.detail.value })
  },

  goToPage(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.page })
  },

  saveName() {
    const name = (this.data.profileName || '').trim() || '我'
    storage.setProfile({ name })
    wx.showToast({ title: '✓ 已保存', icon: 'success' })
  },

  backup() {
    const data = storage.fullBackup()
    const text = JSON.stringify(data)
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showModal({
          title: '✅ 备份已复制',
          content: `全部数据已复制到剪贴板（${text.length} 字符）。请妥善保存，需要时在「恢复数据」中粘贴即可还原。`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  restore() {
    wx.getClipboardData({
      success: (res) => {
        const text = (res.data || '').trim()
        if (!text) {
          wx.showToast({ title: '剪贴板为空', icon: 'none' })
          return
        }
        let data
        try {
          data = JSON.parse(text)
        } catch (e) {
          wx.showToast({ title: '不是有效的备份', icon: 'none' })
          return
        }
        wx.showModal({
          title: '确认恢复',
          content: '恢复备份将覆盖当前所有数据，确定继续吗？',
          confirmColor: '#ef4444',
          success: (m) => {
            if (m.confirm) {
              storage.fullRestore(data)
              wx.showToast({ title: '✓ 已恢复', icon: 'success' })
              this.onShow()
            }
          }
        })
      }
    })
  },

  clearAll() {
    wx.showModal({
      title: '危险操作',
      content: '将清除全部数据（测试结果、好友、成就、设置），且不可恢复，确定继续？',
      confirmText: '确认清除',
      confirmColor: '#ef4444',
      success: (m) => {
        if (m.confirm) {
          storage.fullRestore({})
          wx.showToast({ title: '已清除', icon: 'success' })
          this.onShow()
        }
      }
    })
  }
})
