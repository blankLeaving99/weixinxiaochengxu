const { COLOR_QUESTIONS, COLOR_RESULTS } = require('../../utils/data')
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
    this.setData({ total: COLOR_QUESTIONS.length })
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
    const q = COLOR_QUESTIONS[idx]
    const options = q.slice(1).map((opt, i) => ({
      text: opt[0],
      color: opt[1],
      idx: i
    }))
    this.setData({
      current: idx,
      question: q[0],
      options,
      progress: Math.round((idx / COLOR_QUESTIONS.length) * 100)
    })
  },

  selectOption(e) {
    const color = e.currentTarget.dataset.color
    const scores = this.data.scores
    scores[color] = (scores[color] || 0) + 1
    const next = this.data.current + 1

    if (next >= COLOR_QUESTIONS.length) {
      this.showResult(scores)
    } else {
      this.setData({ scores })
      this.showQuestion(next)
    }
  },

  showResult(scores) {
    // 找出得分最高的颜色
    let maxColor = 'B'
    let maxScore = 0
    Object.keys(scores).forEach(color => {
      if (scores[color] > maxScore) {
        maxScore = scores[color]
        maxColor = color
      }
    })

    const result = COLOR_RESULTS[maxColor]

    // 保存结果
    storage.setResult('color', { type: maxColor, name: result.name })
    const unlocked = helpers.checkAfterTest('color', { type: maxColor })
    helpers.showUnlocked(unlocked)

    this.setData({
      phase: 'result',
      result: {
        ...result,
        score: maxScore,
        total: COLOR_QUESTIONS.length
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
