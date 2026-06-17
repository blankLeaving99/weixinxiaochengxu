const storage = require('../../utils/storage')
const api = require('../../utils/api')
const helpers = require('../../utils/helpers')
const app = getApp()

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const MOODS = [
  { value: 5, emoji: '😊', label: '开心', color: '#10b981' },
  { value: 4, emoji: '😌', label: '平静', color: '#3b82f6' },
  { value: 3, emoji: '😐', label: '一般', color: '#f59e0b' },
  { value: 2, emoji: '😔', label: '低落', color: '#f97316' },
  { value: 1, emoji: '😢', label: '难过', color: '#ef4444' }
]

const MOOD_MAP = {}
MOODS.forEach(m => { MOOD_MAP[m.value] = m })

const MOOD_TAGS = [
  '工作顺利', '学习进步', '运动健身', '美食享受',
  '朋友聚会', '家庭温馨', '恋爱甜蜜', '独处放松',
  '天气很好', '完成目标', '被表扬', '收到礼物',
  '加班疲惫', '睡眠不好', '压力大', '无聊',
  '孤独', '焦虑', '生气', '失望'
]

Page({
  data: {
    moods: MOODS,
    moodMap: MOOD_MAP,
    moodTags: MOOD_TAGS,
    selectedMood: 0,
    selectedTags: [],
    note: '',
    today: '',
    todayRecord: null,
    history: [],
    weekData: [],
    monthData: [],
    showHistory: false,
    themeColor: '#7c3aed',
    stats: {
      avgMood: 0,
      happyDays: 0,
      totalDays: 0,
      topTags: []
    }
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
      animation: { duration: 300, timingFunc: 'easeIn' }
    })

    const today = todayStr()
    const moodState = storage.getMoodState()
    const todayRecord = (moodState.history || []).find(h => h.date === today)

    this.setData({
      today,
      todayRecord,
      selectedMood: 0,
      selectedTags: [],
      note: ''
    })

    this.loadHistory()
    this.loadWeekData()
    this.loadMonthData()
    this.calcStats()

    // 从后端同步
    this.syncFromServer()
  },

  async syncFromServer() {
    try {
      const res = await api.getMoodHistory()
      if (res.code === 0 && res.history) {
        // 统一日期格式：服务器返回 created_at，本地用 date
        const history = res.history.map(h => {
          if (!h.date && h.created_at) {
            h.date = (h.created_at || '').split('T')[0]
          }
          return h
        })
        const data = storage.load()
        data._mood = { history }
        storage.save(data)
        this.loadHistory()
        this.loadWeekData()
        this.loadMonthData()
        this.calcStats()
      }
    } catch (e) {}
  },

  loadHistory() {
    const moodState = storage.getMoodState()
    // 按日期去重，同一天只保留最后一条
    const dayMap = {}
    ;(moodState.history || []).forEach(h => {
      const d = h.date || (h.created_at || '').split('T')[0]
      if (d) dayMap[d] = h
    })
    const history = Object.values(dayMap).slice(-30).reverse()
    this.setData({ history })
  },

  loadWeekData() {
    const moodState = storage.getMoodState()
    // 按日期去重
    const dayMap = {}
    ;(moodState.history || []).forEach(h => {
      const d = h.date || (h.created_at || '').split('T')[0]
      if (d) dayMap[d] = h
    })
    const history = Object.values(dayMap)
    const weekData = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const record = history.find(h => h.date === dateStr)
      weekData.push({
        date: dateStr,
        day: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
        mood: record ? record.mood : 0,
        emoji: record ? MOODS.find(m => m.value === record.mood)?.emoji || '' : '',
        isToday: i === 0
      })
    }
    this.setData({ weekData })
  },

  loadMonthData() {
    const moodState = storage.getMoodState()
    // 按日期去重
    const dayMap = {}
    ;(moodState.history || []).forEach(h => {
      const d = h.date || (h.created_at || '').split('T')[0]
      if (d) dayMap[d] = h
    })
    const history = Object.values(dayMap)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const monthData = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const record = history.find(h => h.date === dateStr)
      monthData.push({
        date: dateStr,
        day: d,
        mood: record ? record.mood : 0,
        color: record ? MOODS.find(m => m.value === record.mood)?.color || '#e5e7eb' : '#e5e7eb'
      })
    }
    this.setData({ monthData })
  },

  calcStats() {
    const moodState = storage.getMoodState()
    const history = moodState.history || []
    // 按日期去重，同一天只保留最后一条记录
    const dayMap = {}
    history.forEach(h => {
      const d = h.date || (h.created_at || '').split('T')[0]
      if (d) dayMap[d] = h
    })
    const uniqueRecords = Object.values(dayMap)
    const totalDays = uniqueRecords.length

    if (totalDays === 0) {
      this.setData({ stats: { avgMood: 0, happyDays: 0, totalDays: 0, topTags: [] } })
      return
    }

    const happyDays = uniqueRecords.filter(h => h.mood >= 4).length
    const avgMood = (uniqueRecords.reduce((sum, h) => sum + h.mood, 0) / totalDays).toFixed(1)

    const tagCount = {}
    history.forEach(h => {
      (h.tags || []).forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    })
    const tagKeys = Object.keys(tagCount)
    const topTags = tagKeys
      .map(tag => ({ tag, count: tagCount[tag] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    this.setData({
      stats: { avgMood, happyDays, totalDays, topTags }
    })
  },

  selectMood(e) {
    this.setData({ selectedMood: e.currentTarget.dataset.value })
  },

  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    let tags = this.data.selectedTags
    if (tags.includes(tag)) {
      tags = tags.filter(t => t !== tag)
    } else {
      if (tags.length < 5) {
        tags.push(tag)
      }
    }
    this.setData({ selectedTags: tags })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  async saveMood() {
    if (this.data.selectedMood === 0) {
      wx.showToast({ title: '请选择今天的心情', icon: 'none' })
      return
    }

    const today = todayStr()
    const record = {
      date: today,
      mood: this.data.selectedMood,
      tags: this.data.selectedTags,
      note: this.data.note
    }

    // 保存到本地（按日期去重）
    const moodState = storage.getMoodState()
    const history = moodState.history || []
    const existIdx = history.findIndex(h => {
      const d = h.date || (h.created_at || '').split('T')[0]
      return d === today
    })
    if (existIdx >= 0) {
      history[existIdx] = record
    } else {
      history.push(record)
    }
    moodState.history = history.slice(-365)
    storage.setMoodState(moodState)

    // 同步到后端
    try {
      await api.addMood(record)
    } catch (e) {}

    // 奖励积分
    helpers.awardPoints('daily_checkin')

    wx.showToast({ title: '记录成功 +10XP', icon: 'success' })
    wx.vibrateShort({ type: 'medium' })

    setTimeout(() => {
      this.onShow()
    }, 800)
  },

  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory })
  },

  goBack() {
    wx.navigateBack()
  }
})
