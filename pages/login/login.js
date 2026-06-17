const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    logging: false,
    tried: false  // 是否已尝试过静默登录
  },

  onLoad() {
    console.log('[Login] onLoad, isLoggedIn=', api.isLoggedIn())

    // 已登录则验证 token 是否真的有效（防止缓存残留）
    if (api.isLoggedIn()) {
      api.getUserInfo().then(res => {
        if (res.code === 0) {
          console.log('[Login] token 有效，跳转首页')
          this.goHome()
        } else {
          console.log('[Login] token 无效，清除后重新登录')
          api.clearToken()
          this.trySilentLogin()
        }
      }).catch(() => {
        console.log('[Login] 验证 token 失败，清除后重新登录')
        api.clearToken()
        this.trySilentLogin()
      })
      return
    }

    // 尝试静默登录
    this.trySilentLogin()
  },

  // 静默登录：自动获取 token，成功后跳转首页
  async trySilentLogin() {
    try {
      console.log('[Login] 开始静默登录...')
      const res = await api.login()
      console.log('[Login] 静默登录结果:', JSON.stringify(res))
      if (res.code === 0) {
        app.globalData.serverUser = res.user
        console.log('[Login] 静默登录成功，跳转首页')
        this.goHome()
        return
      }
    } catch (e) {
      console.log('[Login] 静默登录失败:', e)
    }
    // 静默登录失败，显示登录按钮
    console.log('[Login] 显示登录按钮')
    this.setData({ tried: true })
  },

  // 点击登录按钮
  async onLogin() {
    if (this.data.logging) return
    this.setData({ logging: true })

    try {
      const res = await api.login()
      if (res.code === 0) {
        app.globalData.serverUser = res.user
        wx.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => this.goHome(), 500)
      } else {
        wx.showToast({ title: res.error || '登录失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '登录失败，请检查网络', icon: 'none' })
      console.error('登录失败:', e)
    } finally {
      this.setData({ logging: false })
    }
  },

  // 跳转首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
