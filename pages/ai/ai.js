const storage = require('../../utils/storage')
const app = getApp()

// 本地免费分析（无需 API Key）
function generateLocalAnalysis(my, profileName) {
  const name = profileName || '你'
  const lines = []

  if (my.mbti) {
    const t = my.mbti.type || ''
    const nick = my.mbti.nick || ''
    if (t.length < 4) return `${name}的 MBTI 数据不完整，请重新测试~`
    const dim = []
    if (t[0] === 'E') dim.push('外向开朗、善于社交')
    else dim.push('内敛深思、独立自主')
    if (t[1] === 'N') dim.push('富有创意和想象力')
    else dim.push('务实可靠、注重细节')
    if (t[2] === 'F') dim.push('感性温柔、重视人际和谐')
    else dim.push('理性客观、逻辑思维强')
    if (t[3] === 'J') dim.push('做事有计划、追求秩序')
    else dim.push('灵活随性、享受探索')
    lines.push(`🔬 ${name}是 ${t}（${nick}），${dim[0]}，${dim[1]}，${dim[2]}，${dim[3]}。`)
    lines.push(`💪 优势：${nick}类型的人通常${dim[0]}，这在团队合作和人际交往中是非常宝贵的能力。`)
    lines.push(`⚠️ 盲区：需要注意不要过度${t[2] === 'F' ? '在意他人感受而忽略自己的需求' : '追求理性而忽视情感交流'}。`)
  }

  if (my.taste) {
    const descMap = {
      SP: '热情奔放、充满活力，喜欢尝试新鲜事物',
      SW: '浪漫细腻、温柔体贴，注重生活品质',
      SA: '务实稳重、踏实可靠，追求简单幸福',
      UM: '品味独特、注重质感，有自己独到的审美',
      GR: '随和包容、热爱生活，善于享受当下',
      LT: '清雅纯粹、内心安宁，追求精神世界的丰盈'
    }
    lines.push(`🍜 生活气质：${name}是「${my.taste.name}」人格——${descMap[my.taste.type] || '独特而迷人'}。`)
  }

  if (my.zodiac) {
    lines.push(`⭐ 星象能量：${my.zodiac.z1}的特质让${name}${my.zodiac.z1 === my.zodiac.z2 ? '在同频共振中更加强大' : '在不同能量的碰撞中成长'}。`)
  }

  if (my.love) {
    lines.push(`💕 情感状态：与 ${my.love.b} 的默契度 ${my.love.score}%，${my.love.score >= 80 ? '你们是非常合拍的一对！' : my.love.score >= 60 ? '相处愉快，多沟通会更默契。' : '有差异也有互补，珍惜彼此的独特。'}`)
  }

  if (lines.length === 0) {
    return '完成更多测试后，这里将生成更完整的性格分析~'
  }

  lines.push('')
  lines.push(`🌱 成长建议：试着每天给自己 10 分钟安静的时间，回顾今天的感受。认识自己是一生的功课，${name}已经在路上了，继续加油！`)

  return lines.join('\n\n')
}

Page({
  data: {
    canRun: false,
    blocker: '',
    text: '（点击下方按钮开始）',
    running: false,
    btnLabel: '✨ 开始生成解读',
    themeColor: '#7c3aed',
    useCloud: false,
    chatMessages: [],
    userInput: '',
    isChatMode: false
  },

  onLoad() {
    this._themeCb = (color) => {
      this.setData({ themeColor: color })
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: color, animation: { duration: 300, timingFunc: 'easeIn' } })
    }
    app.registerThemeCallback(this._themeCb)
  },

  onUnload() {
    app.unregisterThemeCallback(this._themeCb)
  },

  onShow() {
    const themeColor = app.getThemeColor()
    this.setData({ themeColor })
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor,
      animation: { duration: 0, timingFunc: 'easeIn' }
    })

    const my = storage.getMyResults()
    if (Object.keys(my).length === 0) {
      this.setData({ canRun: false, blocker: '请先完成至少一项测试。' })
      return
    }

    this.setData({
      canRun: true,
      blocker: '',
      useCloud: false,
      isChatMode: false
    })
  },

  // 生成本地分析
  generateLocal() {
    this.setData({ running: true, btnLabel: '生成中…' })
    const my = storage.getMyResults()
    const profile = storage.getProfile()
    setTimeout(() => {
      const text = generateLocalAnalysis(my, profile.name)
      this.setData({ text, running: false, btnLabel: '✨ 重新生成' })
    }, 800)
  },

  // 一键分析（本地模式）
  async generate() {
    if (this.data.running) return
    this.generateLocal()
  },

  // 聊天模式：发送消息
  onChatInput(e) {
    this.setData({ userInput: e.detail.value })
  },

  async sendMessage() {
    const msg = (this.data.userInput || '').trim()
    if (!msg || this.data.running) return

    const my = storage.getMyResults()
    const profile = storage.getProfile()

    // 添加用户消息
    const chatMessages = [...this.data.chatMessages, { role: 'user', content: msg }]
    this.setData({
      chatMessages,
      userInput: '',
      running: true
    })

    // 本地模式：模拟回复
    setTimeout(() => {
      const localReply = generateLocalAnalysis(my, profile.name)
      chatMessages.push({ role: 'assistant', content: localReply })
      this.setData({ chatMessages, running: false })
    }, 1000)
  },

  copyText() {
    wx.setClipboardData({ data: this.data.text })
  },

  switchMode() {
    this.setData({ isChatMode: !this.data.isChatMode })
  }
})
