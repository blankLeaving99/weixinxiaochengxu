const storage = require('../../utils/storage')
const { MBTI_QUESTIONS: QUESTIONS, CAREER_MAP } = require('../../utils/data')
const { checkAfterTest, showUnlocked } = require('../../utils/helpers')

const TOTAL = QUESTIONS.length

Page({
  data: {
    phase: 'question',
    idx: 0,
    progress: 0,
    qNum: '',
    qText: '',
    optAText: '',
    optBText: '',
    mbtiType: '',
    mbtiNick: '',
    mbtiCareers: '',
    statsStr: ''
  },

  onLoad() {
    this.answers = []
    this.showQuestion(0)
  },

  showQuestion(idx) {
    const [q, a, b] = QUESTIONS[idx]
    this.setData({
      phase: 'question',
      idx,
      progress: Math.round(idx / TOTAL * 100),
      qNum: `第 ${idx + 1} / ${TOTAL} 题`,
      qText: q,
      optAText: 'A. ' + a[0],
      optBText: 'B. ' + b[0]
    })
  },

  chooseA() {
    this.choose(QUESTIONS[this.data.idx][1][1])
  },

  chooseB() {
    this.choose(QUESTIONS[this.data.idx][2][1])
  },

  choose(dim) {
    this.answers.push(dim)
    const next = this.data.idx + 1
    if (next >= TOTAL) {
      this.showResult()
    } else {
      this.showQuestion(next)
    }
  },

  showResult() {
    const c = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
    this.answers.forEach(d => { c[d]++ })
    const mbtiType =
      (c.E >= c.I ? 'E' : 'I') +
      (c.S >= c.N ? 'S' : 'N') +
      (c.T >= c.F ? 'T' : 'F') +
      (c.J >= c.P ? 'J' : 'P')
    const [mbtiNick, mbtiCareers] = CAREER_MAP[mbtiType]
    const result = { type: mbtiType, nick: mbtiNick, careers: mbtiCareers }
    storage.setResult('mbti', result)
    storage.addHistory('mbti', result)
    const unlocked = checkAfterTest('mbti', result)
    this.setData({
      phase: 'result',
      progress: 100,
      mbtiType,
      mbtiNick,
      mbtiCareers,
      statsStr: `E${c.E}/I${c.I}  S${c.S}/N${c.N}  T${c.T}/F${c.F}  J${c.J}/P${c.P}`
    })
    if (unlocked.length) setTimeout(() => showUnlocked(unlocked), 500)
  },

  finish() {
    wx.navigateBack()
  }
})
