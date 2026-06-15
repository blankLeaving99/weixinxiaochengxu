const storage = require('../../utils/storage')
const { checkAfterTest, showUnlocked } = require('../../utils/helpers')

const QUESTIONS = [
  ['一份外卖，你最先点的是？', [['麻辣火锅', 'SP'], ['甜品蛋糕', 'SW'], ['烤肉串', 'SA'], ['日式刺身', 'UM']]],
  ['夏天最爱的解暑饮品？', [['冰镇酸梅汤', 'LT'], ['珍珠奶茶', 'SW'], ['冰镇啤酒', 'SA'], ['鲜榨果汁', 'LT']]],
  ['早餐你倾向于？', [['白粥小菜', 'LT'], ['豆浆油条', 'GR'], ['三明治+咖啡', 'SA'], ['肉包子', 'GR']]],
  ['聚餐选餐厅你会选？', [['川湘菜', 'SP'], ['日料寿司', 'UM'], ['烧烤啤酒', 'SA'], ['甜品下午茶', 'SW']]],
  ['做菜你最常用的调料？', [['辣椒花椒', 'SP'], ['酱油蚝油', 'UM'], ['盐和味精', 'SA'], ['糖和醋', 'SW']]],
  ['零食柜里最多的是？', [['辣条魔芋爽', 'SP'], ['巧克力糖果', 'SW'], ['薯片饼干', 'GR'], ['坚果果干', 'LT']]],
  ['点奶茶你常选？', [['超甜全糖', 'SW'], ['半糖刚好', 'SW'], ['无糖去冰', 'LT'], ['加芝士奶盖', 'GR']]],
  ['吃面你喜欢？', [['重庆小面辣', 'SP'], ['日式拉面油', 'GR'], ['阳春面清淡', 'LT'], ['海鲜面鲜美', 'UM']]],
  ['甜品你喜欢？', [['浓郁芝士蛋糕', 'GR'], ['水果冰沙', 'LT'], ['双皮奶布丁', 'SW'], ['不太爱甜品', 'SA']]],
  ['理想的一顿饭是？', [['麻辣过瘾', 'SP'], ['精致鲜美', 'UM'], ['家常下饭', 'SA'], ['健康轻食', 'LT']]]
]

const PERSONALITY = {
  SP: { name: '热辣型', desc: '你性格热情奔放，喜欢刺激和冒险，是朋友圈的开心果。', match: '适合搭配清淡型口味的人。' },
  SW: { name: '甜蜜型', desc: '你温柔体贴，浪漫细腻，享受生活中的小确幸。', match: '适合搭配鲜美型，互补又有共鸣。' },
  SA: { name: '咸香型', desc: '你务实稳重，有家的味道，让人感到踏实。', match: '适合搭配油润型或甜蜜型。' },
  UM: { name: '鲜美型', desc: '你品味讲究，注重细节，是生活的鉴赏家。', match: '适合搭配甜蜜型或清淡型。' },
  GR: { name: '油润型', desc: '你随和包容，享受丰盛的生活，热爱美食。', match: '适合搭配清淡型平衡口味。' },
  LT: { name: '清淡型', desc: '你追求自然健康，简单纯粹，内心安宁。', match: '适合搭配热辣型或油润型。' }
}

const TOTAL = QUESTIONS.length

Page({
  data: {
    phase: 'question',
    idx: 0,
    progress: 0,
    qNum: '',
    qText: '',
    options: [],
    typeName: '',
    typeDesc: '',
    typeMatch: '',
    statsStr: ''
  },

  onLoad() {
    this.scores = { SP: 0, SW: 0, SA: 0, UM: 0, GR: 0, LT: 0 }
    this.showQuestion(0)
  },

  showQuestion(idx) {
    const [q, opts] = QUESTIONS[idx]
    this.setData({
      phase: 'question',
      idx,
      progress: Math.round(idx / TOTAL * 100),
      qNum: `第 ${idx + 1} / ${TOTAL} 题`,
      qText: q,
      options: opts.map((o, i) => ({
        label: `${String.fromCharCode(65 + i)}. ${o[0]}`,
        dim: o[1]
      }))
    })
  },

  choose(e) {
    const dim = e.currentTarget.dataset.dim
    this.scores[dim]++
    const next = this.data.idx + 1
    if (next >= TOTAL) {
      this.showResult()
    } else {
      this.showQuestion(next)
    }
  },

  showResult() {
    const topDim = Object.keys(this.scores).reduce(
      (a, b) => this.scores[a] >= this.scores[b] ? a : b
    )
    const p = PERSONALITY[topDim]
    const result = { type: topDim, name: p.name, scores: Object.assign({}, this.scores) }
    storage.setResult('taste', result)
    storage.addHistory('taste', result)
    const unlocked = checkAfterTest('taste', result)
    const statsStr = Object.keys(this.scores)
      .map(k => `${k}${this.scores[k]}`)
      .join('  ')
    this.setData({
      phase: 'result',
      progress: 100,
      typeName: p.name,
      typeDesc: p.desc,
      typeMatch: p.match,
      statsStr
    })
    if (unlocked.length) setTimeout(() => showUnlocked(unlocked), 500)
  },

  finish() {
    wx.navigateBack()
  }
})
