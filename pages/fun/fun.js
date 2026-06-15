const { FUN_TESTS } = require('../../utils/data')
const storage = require('../../utils/storage')
const helpers = require('../../utils/helpers')

Page({
  data: {
    phase: 'list', // list | quiz | result
    tests: FUN_TESTS,
    currentTest: null,
    current: 0,
    total: 0,
    progress: 0,
    question: '',
    options: [],
    score: 0,
    result: null
  },

  selectTest(e) {
    const idx = e.currentTarget.dataset.idx
    const test = FUN_TESTS[idx]
    this.setData({
      phase: 'quiz',
      currentTest: test,
      current: 0,
      score: 0,
      total: test.questions.length,
      progress: 0
    })
    this.showQuestion(0)
  },

  showQuestion(idx) {
    const test = this.data.currentTest
    const q = test.questions[idx]
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
      progress: Math.round((idx / test.questions.length) * 100)
    })
  },

  selectOption(e) {
    const score = e.currentTarget.dataset.score
    const newScore = this.data.score + score
    const next = this.data.current + 1

    if (next >= this.data.currentTest.questions.length) {
      this.showResult(newScore)
    } else {
      this.setData({ score: newScore })
      this.showQuestion(next)
    }
  },

  showResult(totalScore) {
    const test = this.data.currentTest
    let result = null
    for (const r of test.results) {
      if (totalScore >= r.min && totalScore <= r.max) {
        result = r
        break
      }
    }
    if (!result) result = test.results[test.results.length - 1]

    // 保存结果
    storage.setResult(`fun_${test.id}`, { score: totalScore, level: result.level })
    const unlocked = helpers.checkAfterTest(`fun_${test.id}`, { score: totalScore })
    helpers.showUnlocked(unlocked)

    this.setData({
      phase: 'result',
      score: totalScore,
      result
    })
  },

  backToList() {
    this.setData({ phase: 'list' })
  },

  retry() {
    this.setData({ phase: 'list' })
  },

  goBack() {
    wx.navigateBack()
  }
})
