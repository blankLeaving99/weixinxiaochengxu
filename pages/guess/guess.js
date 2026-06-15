const storage = require('../../utils/storage')
const { MBTI_QUESTIONS } = require('../../utils/data')

// 取每个维度（12题一段）随机2题，共8题
function sampleQuestions() {
  const result = []
  for (let i = 0; i < 4; i++) {
    const chunk = MBTI_QUESTIONS.slice(i * 12, i * 12 + 12).slice()
    // Fisher-Yates 取 2 题
    for (let k = chunk.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1))
      const tmp = chunk[k]; chunk[k] = chunk[j]; chunk[j] = tmp
    }
    result.push(chunk[0], chunk[1])
  }
  return result
}

Page({
  data: {
    phase: 'pick',   // 'pick' | 'question' | 'result'
    eligibleList: [],
    isEmpty: true,
    // 答题
    friendName: '',
    qIdx: 0,
    qTotal: 8,
    qLabel: '',
    qText: '',
    optA: '',
    optB: '',
    // 结果
    guessed: '',
    actual: '',
    same: 0,
    score: 0,
    comment: ''
  },

  onShow() {
    if (this.data.phase !== 'pick') return
    const friends = storage.getFriends()
    const list = Object.keys(friends)
      .filter(n => friends[n].results && friends[n].results.mbti)
      .map(n => ({ name: n, type: friends[n].results.mbti.type }))
    this.setData({
      eligibleList: list,
      isEmpty: list.length === 0
    })
  },

  startGuess(e) {
    const name = e.currentTarget.dataset.name
    this.friendPayload = storage.getFriends()[name]
    this.questions = sampleQuestions()
    this.guesses = []
    this.setData({
      phase: 'question',
      friendName: name,
      qIdx: 0,
      qTotal: this.questions.length
    })
    this.renderQuestion()
  },

  renderQuestion() {
    const i = this.data.qIdx
    const [q, a, b] = this.questions[i]
    this.setData({
      qLabel: `猜 ${this.data.friendName} · 第 ${i + 1}/${this.data.qTotal} 题`,
      qText: q,
      optA: 'A. ' + a[0],
      optB: 'B. ' + b[0]
    })
  },

  chooseA() { this.pick(this.questions[this.data.qIdx][1][1]) },
  chooseB() { this.pick(this.questions[this.data.qIdx][2][1]) },

  pick(dim) {
    this.guesses.push(dim)
    const next = this.data.qIdx + 1
    if (next >= this.questions.length) {
      this.showResult()
    } else {
      this.setData({ qIdx: next })
      this.renderQuestion()
    }
  },

  showResult() {
    const c = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
    this.guesses.forEach(d => c[d]++)
    const guessed =
      (c.E >= c.I ? 'E' : 'I') +
      (c.S >= c.N ? 'S' : 'N') +
      (c.T >= c.F ? 'T' : 'F') +
      (c.J >= c.P ? 'J' : 'P')
    const actual = ((this.friendPayload.results || {}).mbti || {}).type || '????'
    let same = 0
    for (let i = 0; i < 4; i++) if (guessed[i] === actual[i]) same++
    const score = Math.round(same / 4 * 100)
    let comment
    if (score === 100) comment = '简直心有灵犀！'
    else if (score >= 75) comment = '非常了解 TA～'
    else if (score >= 50) comment = '有点了解，但还能更深'
    else comment = '看起来你们还不够熟哦'

    if (score >= 75) wx.vibrateShort({ type: 'medium' })
    this.setData({
      phase: 'result',
      guessed, actual, same, score, comment
    })
  },

  playAgain() {
    this.setData({ phase: 'pick' })
    this.onShow()
  }
})
