const storage = require('../../utils/storage')
const {
  getZodiac, elementScore, parseBirthday,
  checkAfterTest, showUnlocked
} = require('../../utils/helpers')

Page({
  data: {
    phase: 'input',
    birthday1: '3/21',
    birthday2: '8/15',
    errorMsg: '',
    z1Name: '', z1Sym: '', z1Elem: '',
    z2Name: '', z2Sym: '', z2Elem: '',
    score: 0,
    comment: ''
  },

  onB1Input(e) { this.setData({ birthday1: e.detail.value }) },
  onB2Input(e) { this.setData({ birthday2: e.detail.value }) },

  compute() {
    const p1 = parseBirthday(this.data.birthday1)
    const p2 = parseBirthday(this.data.birthday2)
    if (!p1 || !p2) {
      this.setData({ errorMsg: '❌ 格式错误，请输入如：3/21 或 8-15' })
      return
    }
    const z1 = getZodiac(p1[0], p1[1])
    const z2 = getZodiac(p2[0], p2[1])
    let score = elementScore(z1.elem, z2.elem)
    if (z1.name === z2.name) score = Math.min(99, score + 3)

    let comment
    if (score >= 90) comment = '天作之合，星象完美契合 ✨'
    else if (score >= 80) comment = '非常契合，能彼此理解和欣赏 🌟'
    else if (score >= 70) comment = '适合发展，需要用心经营 💫'
    else if (score >= 60) comment = '存在差异，但有成长空间 🌙'
    else comment = '性格差异较大，需要更多包容 ☄'

    const result = { z1: z1.name, z2: z2.name, score, comment }
    storage.setResult('zodiac', result)
    storage.addHistory('zodiac', result)
    const unlocked = checkAfterTest('zodiac', result)
    this.setData({
      phase: 'result',
      errorMsg: '',
      z1Name: z1.name, z1Sym: z1.sym, z1Elem: z1.elem,
      z2Name: z2.name, z2Sym: z2.sym, z2Elem: z2.elem,
      score,
      comment
    })
    if (unlocked.length) setTimeout(() => showUnlocked(unlocked), 500)
  },

  goBack() {
    this.setData({ phase: 'input' })
  },

  finish() {
    wx.navigateBack()
  }
})
