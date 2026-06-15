const { LOVE_TYPE_QUESTIONS, LOVE_TYPE_RESULTS } = require('../../utils/data')
const storage = require('../../utils/storage')
const helpers = require('../../utils/helpers')

Page({
  data: {
    phase: 'intro',
    current: 0,
    total: 0,
    progress: 0,
    question: '',
    options: [],
    scores: {},
    result: null
  },

  onLoad() {
    this.setData({ total: LOVE_TYPE_QUESTIONS.length })
  },

  startTest() {
    this.setData({
      phase: 'quiz',
      current: 0,
      scores: {},
      progress: 0
    })
    this.showQuestion(0)
  },

  showQuestion(idx) {
    const q = LOVE_TYPE_QUESTIONS[idx]
    const letters = 'ABCD'
    const options = q.slice(1).map((opt, i) => ({
      text: opt[0],
      type: opt[1],
      idx: i,
      letter: letters[i]
    }))
    this.setData({
      current: idx,
      question: q[0],
      options,
      progress: Math.round((idx / LOVE_TYPE_QUESTIONS.length) * 100)
    })
  },

  selectOption(e) {
    const type = e.currentTarget.dataset.type
    const scores = this.data.scores
    scores[type] = (scores[type] || 0) + 1
    const next = this.data.current + 1

    if (next >= LOVE_TYPE_QUESTIONS.length) {
      this.showResult(scores)
    } else {
      this.setData({ scores })
      this.showQuestion(next)
    }
  },

  showResult(scores) {
    let maxType = 'T'
    let maxScore = 0
    Object.keys(scores).forEach(type => {
      if (scores[type] > maxScore) {
        maxScore = scores[type]
        maxType = type
      }
    })

    const result = LOVE_TYPE_RESULTS[maxType]

    storage.setResult('love_type', { type: maxType, name: result.name })
    const unlocked = helpers.checkAfterTest('love_type', { type: maxType })
    helpers.showUnlocked(unlocked)

    this.setData({
      phase: 'result',
      result: {
        ...result,
        score: maxScore,
        total: LOVE_TYPE_QUESTIONS.length
      }
    })
  },

  retry() {
    this.setData({ phase: 'intro' })
  },

  goBack() {
    wx.navigateBack()
  }
})
