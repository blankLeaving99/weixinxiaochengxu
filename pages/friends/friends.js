const storage = require('../../utils/storage')
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

    const profile = storage.getProfile()
    this.setData({ myName: profile.name || '' })
    this.refreshList()
  },

  onNameInput(e) {
    this.setData({ myName: e.detail.value })
  },

  saveProfile() {
    const name = (this.data.myName || '').trim() || '我'
    storage.setProfile({ name })
    this.setData({ myName: name })
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

  refreshList() {
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
        const hay = (it.name + ' ' + it.summary).toLowerCase()
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
  },

  // ========== 导出我的结果 ==========
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

  // ========== 添加好友（粘贴）==========
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
    wx.showModal({
      title: '确认',
      content: `确定删除好友「${name}」吗？`,
      confirmColor: '#ef4444',
      success: (m) => {
        if (m.confirm) {
          storage.removeFriend(name)
          this.refreshList()
        }
      }
    })
  },

  editNote(e) {
    const name = e.currentTarget.dataset.name
    const current = storage.getFriendNote(name)
    wx.showModal({
      title: `备注：${name}`,
      editable: true,
      placeholderText: '为这位好友写一段备注…',
      content: current,
      success: (m) => {
        if (m.confirm) {
          storage.setFriendNote(name, (m.content || '').trim())
          this.refreshList()
        }
      }
    })
  },

  compareFriend(e) {
    const name = e.currentTarget.dataset.name
    wx.navigateTo({ url: `/pages/compare/compare?name=${encodeURIComponent(name)}` })
  },

  goRanking() {
    wx.navigateTo({ url: '/pages/ranking/ranking' })
  }
})
