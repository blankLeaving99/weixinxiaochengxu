const { EQ_QUESTIONS } = require('../../utils/data')
const storage = require('../../utils/storage')
const helpers = require('../../utils/helpers')

Page({
  data: {
    phase: 'intro', // intro | quiz | result
    current: 0,
    total: 0,
    progress: 0,
    question: '',
    options: [],
    score: 0,
    level: '',
    emoji: '',
    color: '',
    desc: '',
    percentage: 0
  },

  onLoad() {
    this.setData({ total: EQ_QUESTIONS.length })
  },

  startTest() {
    this.setData({
      phase: 'quiz',
      current: 0,
      score: 0,
      progress: 0
    })
    this.showQuestion(0)
  },

  showQuestion(idx) {
    const q = EQ_QUESTIONS[idx]
    const letters = 'ABCD'
    const options = q.slice(1).map((opt, i) => ({
      text: opt[0],
      score: opt[1],
      idx: i,
      letter: letters[i]
    }))
    this.setData({
      current: idx,
      question: q[0],
      options,
      progress: Math.round((idx / EQ_QUESTIONS.length) * 100)
    })
  },

  selectOption(e) {
    const score = e.currentTarget.dataset.score
    const newScore = this.data.score + score
    const next = this.data.current + 1

    if (next >= EQ_QUESTIONS.length) {
      this.showResult(newScore)
    } else {
      this.setData({ score: newScore })
      this.showQuestion(next)
    }
  },

  showResult(totalScore) {
    const maxScore = EQ_QUESTIONS.length * 4
    const percentage = Math.round((totalScore / maxScore) * 100)

    let level, emoji, color, desc
    if (percentage >= 85) {
      level = '情商达人'; emoji = '🌟'; color = '#10b981'
      desc = '你的情商非常高！你善于理解和管理情绪，在人际关系中表现出色。'
    } else if (percentage >= 70) {
      level = '情商不错'; emoji = '😊'; color = '#3b82f6'
      desc = '你的情商处于中上水平，大多数情况下能很好地处理情绪问题。'
    } else if (percentage >= 50) {
      level = '情商一般'; emoji = '🤔'; color = '#f59e0b'
      desc = '你的情商有提升空间，建议多关注自己和他人的情绪变化。'
    } else {
      level = '需要提升'; emoji = '💪'; color = '#ef4444'
      desc = '你的情商还有很大提升空间，建议多学习情绪管理技巧。'
    }

    // 保存结果
    const result = { score: percentage, level }
    storage.setResult('eq', result)
    const unlocked = helpers.checkAfterTest('eq', result)
    helpers.showUnlocked(unlocked)

    this.setData({
      phase: 'result',
      score: totalScore,
      level,
      emoji,
      color,
      desc,
      percentage
    })
  },

  retry() {
    this.setData({ phase: 'intro' })
  },

  goBack() {
    wx.navigateBack()
  }
})
