const { IQ_QUESTIONS } = require('../../utils/data')
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
    correctCount: 0,
    level: '',
    emoji: '',
    color: '',
    desc: '',
    iq: 0,
    showAnswer: false,
    selectedIdx: -1,
    correctIdx: -1
  },

  onLoad() {
    this.setData({ total: IQ_QUESTIONS.length })
  },

  startTest() {
    this.setData({
      phase: 'quiz',
      current: 0,
      correctCount: 0,
      progress: 0,
      showAnswer: false,
      selectedIdx: -1
    })
    this.showQuestion(0)
  },

  showQuestion(idx) {
    const q = IQ_QUESTIONS[idx]
    const letters = 'ABCD'
    const options = q[1].map((text, i) => ({ text, idx: i, letter: letters[i] }))
    this.setData({
      current: idx,
      question: q[0],
      options,
      correctIdx: q[2],
      progress: Math.round((idx / IQ_QUESTIONS.length) * 100),
      showAnswer: false,
      selectedIdx: -1
    })
  },

  selectOption(e) {
    if (this.data.showAnswer) return
    const idx = e.currentTarget.dataset.idx
    const isCorrect = idx === this.data.correctIdx
    const newCorrect = this.data.correctCount + (isCorrect ? 1 : 0)

    this.setData({
      selectedIdx: idx,
      showAnswer: true,
      correctCount: newCorrect
    })

    setTimeout(() => {
      const next = this.data.current + 1
      if (next >= IQ_QUESTIONS.length) {
        this.showResult(newCorrect)
      } else {
        this.showQuestion(next)
      }
    }, 1000)
  },

  showResult(correct) {
    const total = IQ_QUESTIONS.length
    const percentage = Math.round((correct / total) * 100)

    // 简单IQ估算
    let iq
    if (percentage >= 90) iq = 140
    else if (percentage >= 80) iq = 130
    else if (percentage >= 70) iq = 120
    else if (percentage >= 60) iq = 110
    else if (percentage >= 50) iq = 100
    else if (percentage >= 40) iq = 90
    else if (percentage >= 30) iq = 80
    else iq = 70

    let level, emoji, color, desc
    if (iq >= 130) {
      level = '天才级'; emoji = '🧠'; color = '#7c3aed'
      desc = '你的逻辑推理能力超强！属于人群中的顶尖水平。'
    } else if (iq >= 115) {
      level = '优秀'; emoji = '🌟'; color = '#10b981'
      desc = '你的智商高于平均水平，逻辑思维能力很强！'
    } else if (iq >= 100) {
      level = '正常'; emoji = '😊'; color = '#3b82f6'
      desc = '你的智商处于正常水平，继续锻炼可以提升。'
    } else if (iq >= 85) {
      level = '一般'; emoji = '🤔'; color = '#f59e0b'
      desc = '你的逻辑能力有提升空间，多做思维训练会有帮助。'
    } else {
      level = '需要锻炼'; emoji = '💪'; color = '#ef4444'
      desc = '建议多做逻辑推理练习，提升思维能力。'
    }

    // 保存结果
    const result = { iq, correct, total, level }
    storage.setResult('iq', result)
    const unlocked = helpers.checkAfterTest('iq', result)
    helpers.showUnlocked(unlocked)

    this.setData({
      phase: 'result',
      iq,
      level,
      emoji,
      color,
      desc,
      correctCount: correct
    })
  },

  retry() {
    this.setData({ phase: 'intro' })
  },

  goBack() {
    wx.navigateBack()
  }
})
