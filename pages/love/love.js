const storage = require('../../utils/storage')
const api = require('../../utils/api')
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
    phase: 'choose',    // 'choose' | 'selectFriend' | 'setup' | 'handoff' | 'question' | 'waiting' | 'result'
    playerAName: '小明',
    playerBName: '小红',
    handoffMsg: '',
    currentName: '',
    idx: 0,
    qProgress: '',
    qText: '',
    options: [],
    // 远程模式
    challengeId: null,
    friendName: '',
    friendList: [],
    // 历史记录
    historyList: [],
    // 结果
    score: 0,
    matchCount: 0,
    comment: ''
  },

  async onLoad(options) {
    this.playerAAnswers = []
    this.playerBAnswers = []
    this.currentPlayer = 'A'

    // 如果是通过挑战通知进入的（远程模式）
    if (options.challengeId) {
      const challengeId = parseInt(options.challengeId)
      const friendName = decodeURIComponent(options.friendName || '好友')
      this.setData({ challengeId, friendName })
      await this.loadChallenge(challengeId)
    } else {
      // 加载历史挑战记录
      this.loadHistory()
    }
  },

  async loadHistory() {
    try {
      const res = await api.getChallenges()
      if (res.code === 0 && res.challenges) {
        const historyList = res.challenges
          .filter(c => c.status === 'completed' && c.result)
          .map(c => {
            let result = {}
            try { result = typeof c.result === 'string' ? JSON.parse(c.result) : (c.result || {}) } catch (e) {}
            const score = result.score || 0
            let scoreColor = '#9ca3af'
            if (score >= 80) scoreColor = '#10b981'
            else if (score >= 60) scoreColor = '#ec4899'
            return {
              id: c.id,
              from_nickname: c.from_nickname,
              to_nickname: c.to_nickname,
              score,
              scoreColor,
              date: (c.updated_at || '').replace('T', ' ').substring(0, 19)
            }
          })
        this.setData({ historyList })
      }
    } catch (e) {}
  },

  // ===== 模式选择 =====

  chooseLocal() {
    this.setData({ phase: 'setup' })
  },

  async chooseRemote() {
    // 加载好友列表
    try {
      const res = await api.getFriends()
      if (res.code === 0 && res.friends && res.friends.length > 0) {
        const friendList = res.friends.map(f => ({
          id: f.friend_id,
          name: f.nickname || '未知'
        }))
        this.setData({ phase: 'selectFriend', friendList })
      } else {
        wx.showToast({ title: '暂无好友，请先添加', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '获取好友列表失败', icon: 'none' })
    }
  },

  // 选择好友发起挑战
  async selectFriend(e) {
    const friendId = e.currentTarget.dataset.id
    const friendName = e.currentTarget.dataset.name

    wx.showModal({
      title: '发起挑战',
      content: `向 ${friendName} 发起恋爱默契大挑战？`,
      confirmText: '发起',
      success: async (m) => {
        if (!m.confirm) return
        try {
          const res = await api.createChallenge(friendId, 'love')
          if (res.code === 0) {
            this.setData({
              phase: 'waiting',
              challengeId: res.challengeId,
              friendName,
              waitingMsg: `挑战已发送给 ${friendName}，等待对方答题...`
            })
          } else {
            wx.showToast({ title: res.error || '发送失败', icon: 'none' })
          }
        } catch (e) {
          wx.showToast({ title: '发送失败', icon: 'none' })
        }
      }
    })
  },

  // ===== 远程模式：加载挑战 =====

  async loadChallenge(challengeId) {
    try {
      const res = await api.getChallenge(challengeId)
      if (res.code !== 0) {
        wx.showToast({ title: '挑战不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 800)
        return
      }

      const challenge = res.challenge
      const user = api.getUser()
      const myId = user ? user.id : null
      const isFrom = challenge.from_user_id === myId

      if (challenge.status === 'completed') {
        this.showRemoteResult(challenge)
        return
      }

      if (isFrom) {
        // 我是发起者
        if (challenge.from_answers) {
          // 我已经答过了，等待对方
          this.setData({
            phase: 'waiting',
            waitingMsg: `等待 ${challenge.to_nickname} 答题中...`,
            playerAName: challenge.from_nickname,
            playerBName: challenge.to_nickname
          })
          this.startPolling(challengeId)
        } else {
          // 我还没答题
          this.setData({
            phase: 'setup',
            playerAName: challenge.from_nickname,
            playerBName: challenge.to_nickname
          })
        }
      } else {
        // 我是接收者
        if (challenge.status === 'pending') {
          wx.showModal({
            title: '💕 挑战邀请',
            content: `${challenge.from_nickname} 向你发起恋爱默契大挑战！`,
            confirmText: '接受挑战',
            success: async (m) => {
              if (m.confirm) {
                await api.acceptChallenge(challengeId)
                this.setData({
                  phase: 'setup',
                  playerAName: challenge.to_nickname,
                  playerBName: challenge.from_nickname
                })
              } else {
                wx.navigateBack()
              }
            }
          })
        } else if (!challenge.to_answers) {
          this.setData({
            phase: 'setup',
            playerAName: challenge.to_nickname,
            playerBName: challenge.from_nickname
          })
        } else {
          this.setData({
            phase: 'waiting',
            waitingMsg: `等待 ${challenge.from_nickname} 答题中...`,
            playerAName: challenge.to_nickname,
            playerBName: challenge.from_nickname
          })
          this.startPolling(challengeId)
        }
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 轮询检查挑战状态
  startPolling(challengeId) {
    this._pollTimer = setInterval(async () => {
      try {
        const res = await api.getChallenge(challengeId)
        if (res.code === 0 && res.challenge.status === 'completed') {
          clearInterval(this._pollTimer)
          this.showRemoteResult(res.challenge)
        }
      } catch (e) {}
    }, 3000)
  },

  // 显示远程挑战结果
  showRemoteResult(challenge) {
    let result = {}
    try { result = typeof challenge.result === 'string' ? JSON.parse(challenge.result) : (challenge.result || {}) } catch (e) {}

    const score = result.score || 0
    const matchCount = result.match || 0
    let comment
    if (score >= 80) comment = '天生一对！默契度爆表 💞'
    else if (score >= 60) comment = '高度合拍，继续培养感情 💖'
    else if (score >= 40) comment = '有戏！多沟通会更好 💗'
    else comment = '差异很大，但互补也是吸引力哦 💔'

    const localResult = {
      a: challenge.from_nickname,
      b: challenge.to_nickname,
      score,
      match: matchCount,
      comment
    }
    storage.setResult('love', localResult)
    storage.addHistory('love', localResult)
    checkAfterTest('love', localResult)

    this.setData({
      phase: 'result',
      playerAName: challenge.from_nickname,
      playerBName: challenge.to_nickname,
      score,
      matchCount,
      comment
    })
  },

  // ===== 本地模式 =====

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
    let name
    if (this.data.challengeId) {
      // 远程模式：只显示自己的名字
      name = this.data.playerAName
    } else {
      // 本地模式：显示当前玩家
      name = this.currentPlayer === 'A'
        ? this.data.playerAName
        : this.data.playerBName
    }
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

    if (this.data.challengeId) {
      // 远程模式
      this.playerAAnswers.push(i)
      const next = this.data.idx + 1
      if (next >= TOTAL) {
        this.submitRemoteAnswers()
      } else {
        this.showQuestion(next)
      }
    } else {
      // 本地模式
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
    }
  },

  // 提交远程答案
  async submitRemoteAnswers() {
    this.setData({ phase: 'waiting', waitingMsg: '答案提交中...' })
    try {
      await api.submitChallengeAnswers(this.data.challengeId, this.playerAAnswers)

      const res = await api.getChallenge(this.data.challengeId)
      if (res.code === 0 && res.challenge.status === 'completed') {
        this.showRemoteResult(res.challenge)
      } else {
        this.setData({
          waitingMsg: `等待 ${this.data.friendName} 答题中...`
        })
        this.startPolling(this.data.challengeId)
      }
    } catch (e) {
      wx.showToast({ title: '提交失败', icon: 'none' })
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

  goBack() {
    this.setData({ phase: 'choose' })
  },

  finish() {
    if (this._pollTimer) clearInterval(this._pollTimer)
    wx.navigateBack()
  },

  onUnload() {
    if (this._pollTimer) clearInterval(this._pollTimer)
  }
})
