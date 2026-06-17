const storage = require('../../utils/storage')
const api = require('../../utils/api')
const { DAILY_QUESTIONS, ZODIACS } = require('../../utils/data')
const helpers = require('../../utils/helpers')
const app = getApp()

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function dayDelta(a, b) {
  const da = new Date(a + 'T00:00:00').getTime()
  const db = new Date(b + 'T00:00:00').getTime()
  return Math.round((db - da) / 86400000)
}

function getTodayQuestion() {
  const ts = todayStr()
  let seed = 0
  for (let i = 0; i < ts.length; i++) seed += ts.charCodeAt(i)
  return DAILY_QUESTIONS[seed % DAILY_QUESTIONS.length]
}

const DAILY_QUOTES = [
  { text: '认识你自己。', author: '苏格拉底' },
  { text: '人生最大的智慧是认识自己。', author: '老子' },
  { text: '知道自己不知道，是最大的智慧。', author: '苏格拉底' },
  { text: '每个人都是自己命运的建筑师。', author: '克劳狄乌斯' },
  { text: '性格决定命运。', author: '赫拉克利特' },
  { text: '了解自己是最困难的工作。', author: '土耳其谚语' },
  { text: '真正的智慧不是预见未来，而是知道当下。', author: '老子' },
  { text: '人最大的敌人是自己。', author: '佚名' },
  { text: '做你自己，因为别人都有人做了。', author: '王尔德' },
  { text: '未经审视的人生不值得过。', author: '苏格拉底' }
]

const DAILY_CHALLENGES = [
  { id: 'smile', title: '微笑挑战', desc: '对3个陌生人微笑', icon: '😊', points: 15 },
  { id: 'compliment', title: '赞美挑战', desc: '真诚地赞美一个人', icon: '💝', points: 15 },
  { id: 'learn', title: '学习挑战', desc: '学习一个新知识点', icon: '📖', points: 20 },
  { id: 'exercise', title: '运动挑战', desc: '做10分钟运动', icon: '🏃', points: 20 },
  { id: 'read', title: '阅读挑战', desc: '阅读10页书', icon: '📚', points: 15 },
  { id: 'journal', title: '日记挑战', desc: '写下今天3件感恩的事', icon: '📝', points: 15 },
  { id: 'kindness', title: '善良挑战', desc: '做一件帮助他人的事', icon: '🤝', points: 20 },
  { id: 'nature', title: '自然挑战', desc: '在户外待15分钟', icon: '🌿', points: 15 }
]

function getTodayChallenge() {
  const ts = todayStr()
  let seed = 0
  for (let i = 0; i < ts.length; i++) seed += ts.charCodeAt(i)
  return DAILY_CHALLENGES[seed % DAILY_CHALLENGES.length]
}

function getTodayQuote() {
  const ts = todayStr()
  let seed = 0
  for (let i = 0; i < ts.length; i++) seed += ts.charCodeAt(i)
  return DAILY_QUOTES[seed % DAILY_QUOTES.length]
}

function getDailyFortune() {
  const results = storage.getMyResults()
  const zodiacName = results.zodiac ? results.zodiac.z1 : ''
  let element = '火'
  if (zodiacName) {
    const found = ZODIACS.find(z => z[0] === zodiacName)
    if (found) element = found[4]
  }
  const ts = todayStr()
  let seed = 0
  for (let i = 0; i < ts.length; i++) seed += ts.charCodeAt(i)

  const fortunes = {
    '火': [
      { level: '大吉', emoji: '🔥', desc: '今天精力充沛，适合挑战新事物！', lucky: ['红色', '3', '南方'] },
      { level: '中吉', emoji: '☀️', desc: '热情高涨，但注意控制情绪。', lucky: ['橙色', '7', '东方'] },
      { level: '小吉', emoji: '🌟', desc: '适合社交活动，会遇到有趣的人。', lucky: ['紫色', '5', '西方'] }
    ],
    '土': [
      { level: '大吉', emoji: '🏔️', desc: '稳重踏实的一天，适合处理重要事务。', lucky: ['黄色', '8', '中央'] },
      { level: '中吉', emoji: '🌾', desc: '脚踏实地，会有不错的收获。', lucky: ['棕色', '4', '北方'] },
      { level: '小吉', emoji: '🍀', desc: '保持耐心，好事即将发生。', lucky: ['绿色', '6', '南方'] }
    ],
    '风': [
      { level: '大吉', emoji: '🌪️', desc: '思维活跃，创意无限！', lucky: ['银色', '5', '西方'] },
      { level: '中吉', emoji: '🍃', desc: '社交运佳，适合团队合作。', lucky: ['浅蓝', '3', '东方'] },
      { level: '小吉', emoji: '🌬️', desc: '灵感涌现，适合学习新知识。', lucky: ['白色', '7', '北方'] }
    ],
    '水': [
      { level: '大吉', emoji: '🌊', desc: '直觉敏锐，适合做重要决定。', lucky: ['深蓝', '7', '北方'] },
      { level: '中吉', emoji: '💧', desc: '情感丰富，适合深度交流。', lucky: ['紫色', '6', '西方'] },
      { level: '小吉', emoji: '🌙', desc: '内心平静，适合独处思考。', lucky: ['银色', '9', '东方'] }
    ]
  }
  const f = fortunes[element] || fortunes['火']
  return f[seed % f.length]
}

Page({
  data: {
    streak: 0,
    today: '',
    question: '',
    doneToday: false,
    answer: '',
    input: '',
    quote: null,
    challenge: null,
    challengeDone: false,
    fortune: null,
    level: 1,
    levelIcon: '🌱',
    levelTitle: '新手上路',
    totalXp: 0,
    showCalendar: false,
    calendarDays: [],
    themeColor: '#7c3aed'
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

  async onShow() {
    const themeColor = app.getThemeColor()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor,
      animation: { duration: 0, timingFunc: 'easeIn' }
    })

    // 从后端同步每日一题状态
    let serverState = null
    try {
      const res = await api.getDailyState()
      if (res.code === 0) {
        serverState = res.state
        // 直接写入本地存储，不触发回调避免回写循环
        const data = storage.load()
        data._daily = serverState
        storage.save(data)
      }
    } catch (e) {}

    const state = serverState || storage.getDailyState()
    const pts = storage.getPoints()
    const levelInfo = storage.getLevelInfo(pts.level)
    const today = todayStr()
    const done = state.last_date === today
    const question = getTodayQuestion()
    let answer = ''
    if (done) {
      const item = (state.history || []).find(h => h.date === today)
      if (item) answer = item.answer
    }
    const challengeDone = state.challengeDone === today

    this.setData({
      themeColor,
      streak: state.streak || 0,
      today,
      question,
      doneToday: done,
      answer,
      input: '',
      quote: getTodayQuote(),
      challenge: getTodayChallenge(),
      challengeDone,
      fortune: getDailyFortune(),
      level: pts.level,
      levelIcon: levelInfo.icon,
      levelTitle: levelInfo.title,
      totalXp: pts.totalEarned,
      calendarDays: this.buildCalendar(state.history || [])
    })
  },

  buildCalendar(history) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()

    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: '', checked: false, isToday: false })
    }
    const todayStr2 = todayStr()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const checked = history.some(h => h.date === dateStr)
      const isToday = dateStr === todayStr2
      days.push({ day: d, checked, isToday, date: dateStr })
    }
    return days
  },

  toggleCalendar() {
    this.setData({ showCalendar: !this.data.showCalendar })
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  async checkin() {
    const ans = (this.data.input || '').trim()
    if (!ans) {
      wx.showToast({ title: '请先写下你的答案', icon: 'none' })
      return
    }
    const state = storage.getDailyState()
    const today = todayStr()
    const last = state.last_date

    if (last) {
      const delta = dayDelta(last, today)
      if (delta === 1) state.streak = (state.streak || 0) + 1
      else if (delta === 0) {}
      else state.streak = 1
    } else {
      state.streak = 1
    }
    state.last_date = today
    const hist = state.history || []
    hist.push({ date: today, answer: ans, question: this.data.question })
    state.history = hist.slice(-365)
    storage.setDailyState(state)

    // 同步到后端
    try {
      await api.updateDailyState(state)
    } catch (e) {}

    // 奖励积分
    helpers.awardPoints('daily_checkin')

    if (state.streak === 3) helpers.awardPoints('streak_3')
    if (state.streak === 7) helpers.awardPoints('streak_7')

    const unlocked = []
    if (state.streak >= 3 && storage.unlockAchievement('daily_3')) {
      unlocked.push({ icon: '📅', title: '三日打卡', desc: '每日一题连续 3 天' })
    }
    if (state.streak >= 7 && storage.unlockAchievement('daily_7')) {
      unlocked.push({ icon: '📆', title: '周更不停', desc: '每日一题连续 7 天' })
    }

    wx.showToast({ title: '🔥 打卡成功 +10XP', icon: 'success' })
    wx.vibrateShort({ type: 'medium' })

    setTimeout(() => {
      this.onShow()
      if (unlocked.length) {
        const list = unlocked.map(a => `${a.icon} ${a.title}：${a.desc}`).join('\n')
        wx.showModal({
          title: '🎉 恭喜解锁新成就！',
          content: list,
          showCancel: false,
          confirmText: '太棒了'
        })
      }
    }, 800)
  },

  completeChallenge() {
    const today = todayStr()
    const state = storage.getDailyState()
    state.challengeDone = today
    storage.setDailyState(state)

    helpers.awardPoints('daily_checkin')

    wx.showToast({ title: `🎉 挑战完成 +${this.data.challenge.points}XP`, icon: 'success' })
    wx.vibrateShort({ type: 'medium' })

    setTimeout(() => {
      this.onShow()
    }, 800)
  }
})
