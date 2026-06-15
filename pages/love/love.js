const storage = require('../../utils/storage')
const { checkAfterTest, showUnlocked } = require('../../utils/helpers')

const QUESTIONS = [
  ['理想的约会方式是？', ['浪漫烛光晚餐', '户外冒险', '宅家看电影', '逛街购物']],
  ['吵架后谁先低头？', ['我', '对方', '看情况', '都不会']],
  ['最重要的爱情品质？', ['忠诚', '幽默', '上进', '温柔']],
  ['理想居住地？', ['大城市', '小镇', '海边', '山里']],
  ['周末喜欢做什么？', ['睡到自然醒', '出去玩', '学习提升', '陪家人']],
  ['纪念日重要吗？', ['非常重要', '一般', '不太在意', '看心情']],
  ['理想孩子数量？', ['0个', '1个', '2个', '3个及以上']],
  ['更看重对方的？', ['颜值', '性格', '事业', '三观']],
  ['分手后还能做朋友吗？', ['可以', '不可以', '看情况', '陌生人']],
  ['旅行喜欢？', ['跟团省心', '自由行', '穷游', '豪华游']],
  ['赚钱与陪伴？', ['努力赚钱', '多陪我', '平衡', '看阶段']],
  ['理想的求婚？', ['浪漫公开', '私密惊喜', '简单仪式', '无所谓形式']]
]

const TOTAL = QUESTIONS.length

Page({
  data: {
    phase: 'setup',       // 'setup' | 'handoff' | 'question' | 'result'
    playerAName: '小明',
    playerBName: '小红',
    handoffMsg: '',
    currentName: '',
    idx: 0,
    qProgress: '',
    qText: '',
    options: [],
    // 结果
    score: 0,
    matchCount: 0,
    comment: ''
  },

  onLoad() {
    this.playerAAnswers = []
    this.playerBAnswers = []
    this.currentPlayer = 'A'
  },

  onNameAInput(e) {
    this.setData({ playerAName: e.detail.value })
  },

  onNameBInput(e) {
    this.setData({ playerBName: e.detail.value })
  },

  startChallenge() {
    const nameA = this.data.playerAName.trim() || '玩家A'
    const nameB = this.data.playerBName.trim() || '玩家B'
    this.setData({ playerAName: nameA, playerBName: nameB })
    this.playerAAnswers = []
    this.playerBAnswers = []
    this.currentPlayer = 'A'
    this.showHandoff(`请把屏幕交给 ${nameA}`)
  },

  showHandoff(msg) {
    this.setData({ phase: 'handoff', handoffMsg: msg })
  },

  readyToAnswer() {
    this.showQuestion(0)
  },

  showQuestion(idx) {
    const [q, opts] = QUESTIONS[idx]
    const name = this.currentPlayer === 'A'
      ? this.data.playerAName
      : this.data.playerBName
    this.setData({
      phase: 'question',
      idx,
      currentName: name,
      qProgress: `${name}  ·  第 ${idx + 1} / ${TOTAL} 题`,
      qText: q,
      options: opts.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`)
    })
  },

  chooseOption(e) {
    const i = e.currentTarget.dataset.index
    if (this.currentPlayer === 'A') {
      this.playerAAnswers.push(i)
    } else {
      this.playerBAnswers.push(i)
    }
    const next = this.data.idx + 1
    if (next >= TOTAL) {
      if (this.currentPlayer === 'A') {
        this.currentPlayer = 'B'
        this.showHandoff(`玩家 A 完成！请把屏幕交给 ${this.data.playerBName}`)
      } else {
        this.showResult()
      }
    } else {
      this.showQuestion(next)
    }
  },

  showResult() {
    const matchCount = this.playerAAnswers.reduce(
      (cnt, ans, i) => cnt + (ans === this.playerBAnswers[i] ? 1 : 0),
      0
    )
    const score = Math.round(matchCount / TOTAL * 100)
    let comment
    if (score >= 80) comment = '天生一对！默契度爆表 💞'
    else if (score >= 60) comment = '高度合拍，继续培养感情 💖'
    else if (score >= 40) comment = '有戏！多沟通会更好 💗'
    else comment = '差异很大，但互补也是吸引力哦 💔'

    const result = {
      a: this.data.playerAName,
      b: this.data.playerBName,
      score,
      match: matchCount,
      comment
    }
    storage.setResult('love', result)
    storage.addHistory('love', result)
    const unlocked = checkAfterTest('love', result)
    this.setData({ phase: 'result', score, matchCount, comment })
    if (unlocked.length) setTimeout(() => showUnlocked(unlocked), 500)
  },

  finish() {
    wx.navigateBack()
  }
})
