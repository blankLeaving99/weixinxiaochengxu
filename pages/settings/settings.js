const storage = require('../../utils/storage')
const api = require('../../utils/api')
const app = getApp()

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
    currentColor: '#7c3aed',
    discoverable: true
  },

  onLoad() {
  },

  onUnload() {
  },

  async onShow() {
    // 从本地缓存读取
    const data = storage.load()
    const profile = data._profile || { name: '' }
    const results = {}
    const achievements = data._achievements || {}
    const friends = data._friends || {}
    const pts = data._points || { xp: 0, level: 1, totalEarned: 0 }
    const settings = Object.assign({ theme: 'purple', fontScale: 1.0, aiProvider: 'baidu', aiApiKey: '', aiSecretKey: '' }, data._settings || {})

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

    // 异步从后端同步数据
    this.syncFromServer()

    // 获取可被搜索设置和真实用户ID
    this.loadUserInfo()
  },

  async loadUserInfo() {
    try {
      const res = await api.getUserInfo()
      if (res.code === 0 && res.user) {
        this.setData({
          discoverable: res.user.discoverable !== 0,
          userId: res.user.id
        })
      }
    } catch (e) {}
  },

  copyId() {
    wx.setClipboardData({
      data: String(this.data.userId),
      success: () => {
        wx.showToast({ title: 'ID已复制', icon: 'success' })
      }
    })
  },

  async toggleDiscoverable() {
    const newVal = !this.data.discoverable
    this.setData({ discoverable: newVal })
    try {
      await api.updateDiscoverable(newVal)
      wx.showToast({ title: newVal ? '已允许被搜索' : '已关闭被搜索', icon: 'none' })
    } catch (e) {
      this.setData({ discoverable: !newVal })
      wx.showToast({ title: '设置失败', icon: 'none' })
    }
  },

  // 从后端同步数据到本地（直接写入存储，不触发回调避免回写循环）
  async syncFromServer() {
    try {
      // 同步昵称
      const userRes = await api.getUserInfo()
      if (userRes.code === 0 && userRes.user) {
        const data = storage.load()
        const profile = data._profile || {}
        if (userRes.user.nickname && userRes.user.nickname !== profile.name) {
          profile.name = userRes.user.nickname
          data._profile = profile
          storage.save(data)
        }
      }

      // 同步设置
      const settingsRes = await api.getSettings()
      if (settingsRes.code === 0 && settingsRes.settings) {
        const data = storage.load()
        data._settings = Object.assign({}, data._settings || {}, settingsRes.settings)
        storage.save(data)
      }

      // 同步测试结果（绕过 setResult 回调）
      const testRes = await api.getTestResults()
      if (testRes.code === 0) {
        const data = storage.load()
        Object.keys(testRes.results).forEach(key => {
          data[key] = testRes.results[key]
        })
        storage.save(data)
      }

      // 同步成就
      const achRes = await api.getAchievements()
      if (achRes.code === 0) {
        Object.keys(achRes.achievements).forEach(aid => {
          storage.unlockAchievement(aid)
        })
      }

      // 同步积分（取本地和服务器中较高的值，避免覆盖）
      const ptsRes = await api.getPoints()
      if (ptsRes.code === 0) {
        const data = storage.load()
        const localPts = data._points || { xp: 0, level: 1, totalEarned: 0 }
        const serverXp = ptsRes.points.xp || 0
        // 只有服务器数据比本地多时才覆盖
        if (serverXp > localPts.xp) {
          data._points = {
            xp: ptsRes.points.xp,
            level: ptsRes.points.level,
            totalEarned: ptsRes.points.total_earned,
            history: localPts.history || []
          }
          storage.save(data)
        }
      }

      // 刷新页面数据（直接 setData，不调用 onShow 避免递归）
      this._refreshPageData()
    } catch (e) {
      console.log('从后端同步数据失败:', e)
    }
  },

  // 将本地数据同步到服务器（恢复备份后调用）
  async syncToServer(data) {
    try {
      // 同步昵称
      const profile = data._profile
      if (profile && profile.name) {
        await api.updateNickname(profile.name).catch(() => {})
      }

      // 同步测试结果
      const results = {}
      Object.keys(data).forEach(k => {
        if (!k.startsWith('_')) results[k] = data[k]
      })
      for (const [key, result] of Object.entries(results)) {
        await api.saveTestResult(key, result).catch(() => {})
      }

      // 同步积分（用 set 覆盖，不用 add 累加）
      const pts = data._points
      if (pts) {
        await api.setPoints(pts.xp || 0, pts.level || 1).catch(() => {})
      }

      // 同步成就
      const achs = data._achievements || {}
      for (const aid of Object.keys(achs)) {
        await api.unlockAchievement(aid).catch(() => {})
      }

      // 同步设置
      if (data._settings) {
        await api.saveSettings(data._settings).catch(() => {})
      }
    } catch (e) {
      console.log('同步到服务器失败:', e)
    }
  },

  // 刷新页面显示数据（从本地存储读取）
  _refreshPageData() {
    const data = storage.load()
    const profile = data._profile || { name: '' }
    const results = {}
    const achievements = data._achievements || {}
    const friends = data._friends || {}
    const pts = data._points || { xp: 0, level: 1, totalEarned: 0 }
    const settings = Object.assign({ theme: 'purple', fontScale: 1.0, aiProvider: 'baidu', aiApiKey: '', aiSecretKey: '' }, data._settings || {})

    Object.keys(data).forEach(k => {
      if (!k.startsWith('_')) results[k] = data[k]
    })

    const levelInfo = storage.getLevelInfo(pts.level)
    const themeKey = settings.theme || 'purple'
    const theme = THEMES.find(t => t.key === themeKey) || THEMES[0]

    this.setData({
      profileName: profile.name || '',
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

  async saveName() {
    const name = (this.data.profileName || '').trim() || '我'
    storage.setProfile({ name })

    // 同步到后端
    try {
      await api.updateNickname(name)
    } catch (e) {}

    wx.showToast({ title: '✓ 已保存', icon: 'success' })
  },

  // 备份：同步本地数据到云端
  async backup() {
    wx.showLoading({ title: '备份中...' })
    try {
      await this.syncToServer(storage.fullBackup())
      wx.hideLoading()
      wx.showModal({
        title: '✅ 备份成功',
        content: '所有数据已同步到云端服务器。换设备登录同一账号即可恢复。',
        showCancel: false,
        confirmText: '知道了'
      })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '备份失败', icon: 'none' })
    }
  },

  // 恢复：从云端拉取自己的数据
  restore() {
    wx.showModal({
      title: '恢复数据',
      content: '将从云端拉取你的数据并覆盖本地，确定继续吗？',
      confirmColor: '#f59e0b',
      success: async (m) => {
        if (!m.confirm) return

        wx.showLoading({ title: '从云端恢复中...' })
        try {
          const data = {}

          // 拉取用户信息（验证身份）
          const userRes = await api.getUserInfo()
          if (userRes.code !== 0) {
            wx.hideLoading()
            wx.showToast({ title: '请先登录', icon: 'none' })
            return
          }
          data._profile = { name: userRes.user.nickname || '' }

          // 拉取测试结果
          const testRes = await api.getTestResults()
          if (testRes.code === 0) {
            Object.assign(data, testRes.results)
          }

          // 拉取积分
          const ptsRes = await api.getPoints()
          if (ptsRes.code === 0) {
            data._points = {
              xp: ptsRes.points.xp || 0,
              level: ptsRes.points.level || 1,
              totalEarned: ptsRes.points.total_earned || 0,
              history: []
            }
          }

          // 拉取成就
          const achRes = await api.getAchievements()
          if (achRes.code === 0) {
            data._achievements = achRes.achievements || {}
          }

          // 拉取设置
          const settingsRes = await api.getSettings()
          if (settingsRes.code === 0) {
            data._settings = settingsRes.settings || {}
          }

          // 拉取心情日记
          const moodRes = await api.getMoodHistory()
          if (moodRes.code === 0) {
            data._mood = { history: moodRes.history || [] }
          }

          // 拉取每日一题
          const dailyRes = await api.getDailyState()
          if (dailyRes.code === 0) {
            data._daily = dailyRes.state || { streak: 0, last_date: '', history: [] }
          }

          // 恢复到本地
          storage.fullRestore(data)
          wx.hideLoading()
          wx.showToast({ title: '✓ 恢复成功', icon: 'success' })

          // 刷新页面
          this.onShow()
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '恢复失败', icon: 'none' })
          console.error('恢复失败:', e)
        }
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
