const storage = require('../../utils/storage')
const api = require('../../utils/api')
const { checkFriendAdded, showUnlocked } = require('../../utils/helpers')
const app = getApp()

function summary(results) {
  const parts = []
  if (results.mbti) parts.push(`MBTI ${results.mbti.type || ''}`)
  if (results.taste) parts.push(results.taste.name || '')
  if (results.zodiac) parts.push(results.zodiac.z1 || '')
  return parts.filter(Boolean).join('  ·  ')
}

Page({
  data: {
    myName: '',
    keyword: '',
    sortMode: 0,
    sortLabels: ['添加顺序', '昵称 A→Z', '昵称 Z→A'],
    showSortPicker: false,
    friendList: [],
    friendCount: 0,
    isEmpty: true,
    isFiltered: false,
    themeColor: '#7c3aed',
    showAddPanel: false,
    searchKeyword: '',
    searchResults: [],
    isSearching: false
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

    const profile = storage.getProfile()
    this.setData({ myName: profile.name || '' })
    this.refreshList()
  },

  onNameInput(e) {
    this.setData({ myName: e.detail.value })
  },

  async saveProfile() {
    const name = (this.data.myName || '').trim() || '我'
    storage.setProfile({ name })
    this.setData({ myName: name })

    // 同步到后端
    try {
      await api.updateNickname(name)
    } catch (e) {}

    wx.showToast({ title: '昵称已保存', icon: 'success' })
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value })
    this.refreshList()
  },

  onSortChange(e) {
    this.setData({ sortMode: parseInt(e.detail.value) })
    this.refreshList()
  },

  async refreshList() {
    try {
      const res = await api.getFriends()
      if (res.code === 0) {
        const allCount = res.friends.length
        let items = res.friends.map(f => ({
          id: f.friend_id,
          openid: f.openid || '',
          name: f.nickname || '未知',
          summary: '',
          note: f.note || '',
          avatar: f.avatar || ''
        }))

        const kw = (this.data.keyword || '').trim().toLowerCase()
        if (kw) {
          items = items.filter(it => {
            const hay = (it.name + ' ' + it.summary + ' ' + it.note).toLowerCase()
            return hay.indexOf(kw) >= 0
          })
        }

        const mode = this.data.sortMode
        if (mode === 1) items.sort((a, b) => a.name.localeCompare(b.name))
        if (mode === 2) items.sort((a, b) => b.name.localeCompare(a.name))

        this.setData({
          friendList: items,
          friendCount: allCount,
          isEmpty: allCount === 0,
          isFiltered: !!kw && items.length === 0
        })
      }
    } catch (e) {
      console.error('获取好友列表失败，回退到本地数据:', e)
      // 服务器不可用时回退到本地存储
      const friends = storage.getFriends()
      const allCount = Object.keys(friends).length
      let items = Object.keys(friends).map(name => {
        const payload = friends[name]
        const res = payload.results || {}
        return {
          name,
          summary: summary(res),
          note: payload._note || ''
        }
      })

      const kw = (this.data.keyword || '').trim().toLowerCase()
      if (kw) {
        items = items.filter(it => {
          const hay = (it.name + ' ' + it.summary + ' ' + it.note).toLowerCase()
          return hay.indexOf(kw) >= 0
        })
      }

      const mode = this.data.sortMode
      if (mode === 1) items.sort((a, b) => a.name.localeCompare(b.name))
      if (mode === 2) items.sort((a, b) => b.name.localeCompare(a.name))

      this.setData({
        friendList: items,
        friendCount: allCount,
        isEmpty: allCount === 0,
        isFiltered: !!kw && items.length === 0
      })
    }
  },

  // ========== 搜索添加好友 ==========
  toggleAddPanel() {
    this.setData({ showAddPanel: !this.data.showAddPanel, searchResults: [], searchKeyword: '' })
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  async searchUsers() {
    const kw = (this.data.searchKeyword || '').trim()
    if (!kw) {
      wx.showToast({ title: '请输入昵称搜索', icon: 'none' })
      return
    }
    this.setData({ isSearching: true })
    try {
      const res = await api.searchUsers(kw)
      this.setData({ isSearching: false })
      if (res.code === 0) {
        this.setData({ searchResults: res.users || [] })
      } else {
        wx.showToast({ title: '搜索失败', icon: 'none' })
      }
    } catch (e) {
      this.setData({ isSearching: false })
      wx.showToast({ title: '搜索失败', icon: 'none' })
    }
  },

  async addFriendCloud(e) {
    const friendId = e.currentTarget.dataset.id
    const nickname = e.currentTarget.dataset.nickname
    try {
      const res = await api.addFriend(friendId)
      if (res.code === 0) {
        wx.showToast({ title: `已添加：${nickname}`, icon: 'success' })
        this.setData({ showAddPanel: false })
        this.refreshList()

        // 检查成就
        const unlocked = checkFriendAdded()
        if (unlocked.length) setTimeout(() => showUnlocked(unlocked), 800)
      } else {
        wx.showToast({ title: res.error || '添加失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  // ========== 本地导入好友（保留兼容） ==========
  exportMine() {
    const profile = storage.getProfile()
    if (!profile.name) {
      wx.showToast({ title: '请先填写并保存昵称', icon: 'none' })
      return
    }
    const my = storage.getMyResults()
    if (Object.keys(my).length === 0) {
      wx.showToast({ title: '请先完成至少一项测试', icon: 'none' })
      return
    }
    const payload = storage.exportPayload()
    const text = JSON.stringify(payload)
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showModal({
          title: '✅ 已复制到剪贴板',
          content: '把这串文本发给朋友，让 TA 在「好友管理 → 添加好友」中粘贴导入即可。',
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  importFriend() {
    wx.getClipboardData({
      success: (res) => {
        const text = (res.data || '').trim()
        if (!text) {
          wx.showToast({ title: '剪贴板为空', icon: 'none' })
          return
        }
        let payload
        try {
          payload = JSON.parse(text)
        } catch (e) {
          wx.showToast({ title: '内容不是有效的 JSON', icon: 'none' })
          return
        }
        if (payload.app !== 'PersonalityTestSuite') {
          wx.showToast({ title: '不是测试结果文件', icon: 'none' })
          return
        }
        const name = ((payload.profile || {}).name || '').trim() || '匿名好友'
        const friends = storage.getFriends()
        if (friends[name]) {
          wx.showModal({
            title: '已存在',
            content: `已有名为「${name}」的好友，是否覆盖？`,
            success: (m) => {
              if (m.confirm) this.doAddFriend(name, payload)
            }
          })
        } else {
          this.doAddFriend(name, payload)
        }
      }
    })
  },

  doAddFriend(name, payload) {
    storage.addFriend(name, payload)
    const unlocked = checkFriendAdded()
    wx.showToast({ title: `已添加：${name}`, icon: 'success' })
    this.refreshList()
    if (unlocked.length) setTimeout(() => showUnlocked(unlocked), 800)
  },

  removeFriend(e) {
    const name = e.currentTarget.dataset.name
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认',
      content: `确定删除好友「${name}」吗？`,
      confirmColor: '#ef4444',
      success: async (m) => {
        if (m.confirm) {
          if (id) {
            try { await api.removeFriend(id) } catch (e) {}
          }
          storage.removeFriend(name)
          this.refreshList()
        }
      }
    })
  },

  editNote(e) {
    const name = e.currentTarget.dataset.name
    const id = e.currentTarget.dataset.id
    const current = storage.getFriendNote(name)

    wx.showModal({
      title: `备注：${name}`,
      editable: true,
      placeholderText: '为这位好友写一段备注…',
      content: current,
      success: async (m) => {
        if (m.confirm) {
          const note = (m.content || '').trim()
          storage.setFriendNote(name, note)
          if (id) {
            try { await api.updateFriendNote(id, note) } catch (e) {}
          }
          this.refreshList()
        }
      }
    })
  },

  compareFriend(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    if (id) {
      // 使用后端 API 获取好友结果进行比较
      wx.navigateTo({ url: `/pages/compare/compare?friendId=${id}&name=${encodeURIComponent(name)}` })
    } else {
      // 本地好友
      wx.navigateTo({ url: `/pages/compare/compare?name=${encodeURIComponent(name)}` })
    }
  },

  // 发起挑战
  challengeFriend(e) {
    const friendId = e.currentTarget.dataset.id
    const friendName = e.currentTarget.dataset.name

    wx.showModal({
      title: '💕 发起挑战',
      content: `向 ${friendName} 发起恋爱默契大挑战？\n\n你需要先完成答题，对方收到通知后也会答题。`,
      confirmText: '开始答题',
      success: async (m) => {
        if (!m.confirm) return
        try {
          const result = await api.createChallenge(friendId, 'love')
          if (result.code === 0) {
            // 跳转到恋爱挑战页面，带上挑战信息
            wx.navigateTo({
              url: `/pages/love/love?challengeId=${result.challengeId}&friendName=${encodeURIComponent(friendName)}`
            })
          } else {
            wx.showToast({ title: result.error || '发送失败', icon: 'none' })
          }
        } catch (e) {
          wx.showToast({ title: '发送失败', icon: 'none' })
        }
      }
    })
  },

  goRanking() {
    wx.navigateTo({ url: '/pages/ranking/ranking' })
  }
})
