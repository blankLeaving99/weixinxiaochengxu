const storage = require('../../utils/storage')

// AI 提供商配置
const AI_PROVIDERS = {
  baidu: {
    name: '百度文心一言',
    desc: '完全免费！ERNIE-Speed-8K 模型免费调用',
    helpUrl: 'console.bce.baidu.com/qianfan/ais/console/onlineService',
    tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token',
    chatUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie_speed_8k',
    placeholderApiKey: '百度 API Key',
    placeholderSecretKey: '百度 Secret Key',
    free: true
  },
  deepseek: {
    name: 'DeepSeek',
    desc: '注册送500万token，超低价',
    helpUrl: 'platform.deepseek.com',
    chatUrl: 'https://api.deepseek.com/v1/chat/completions',
    placeholderApiKey: 'DeepSeek API Key (sk-...)',
    placeholderSecretKey: '',
    free: false
  },
  zhipu: {
    name: '智谱GLM',
    desc: '注册送500万token，国产大模型',
    helpUrl: 'open.bigmodel.cn',
    chatUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    placeholderApiKey: '智谱 API Key (xxx.yyy)',
    placeholderSecretKey: '',
    free: false
  }
}

function buildPrompt(my, profileName) {
  const lines = [`我的昵称：${profileName || '匿名'}`, '我的测试结果：']
  if (my.mbti) {
    lines.push(`- MBTI 类型：${my.mbti.type}（${my.mbti.nick || ''}）`)
  }
  if (my.love) {
    lines.push(`- 恋爱默契：与 ${my.love.b || ''} 默契度 ${my.love.score || 0}%`)
  }
  if (my.zodiac) {
    lines.push(`- 星座配对：${my.zodiac.z1} × ${my.zodiac.z2} 得 ${my.zodiac.score} 分`)
  }
  if (my.taste) {
    lines.push(`- 美食人格：${my.taste.name}`)
  }
  lines.push('')
  lines.push(
    '请你以朋友的口吻，写一段 200-400 字的定制化性格解读，' +
    '包含我的优点、可能的盲区、以及一条具体的成长建议。' +
    '用温暖但不肉麻的语气，避免空话套话。'
  )
  return lines.join('\n')
}

const app = getApp()

Page({
  data: {
    canRun: false,
    blocker: '',
    providerKey: 'baidu',
    providerName: '百度文心一言',
    providerDesc: '完全免费！ERNIE-Speed-8K 模型免费调用',
    apiKey: '',
    secretKey: '',
    showSecretKey: false,
    text: '（点击下方按钮开始）',
    running: false,
    btnLabel: '✨ 开始生成解读',
    themeColor: '#7c3aed',
    providers: ['baidu', 'deepseek', 'zhipu'],
    providerNames: ['百度文心一言', 'DeepSeek', '智谱GLM'],
    providerIdx: 0,
    isFree: true
  },

  onShow() {
    const themeColor = app.getThemeColor()
    this.setData({ themeColor })
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor,
      animation: { duration: 300, timingFunc: 'easeIn' }
    })

    const my = storage.getMyResults()
    const settings = storage.getSettings()

    if (Object.keys(my).length === 0) {
      this.setData({ canRun: false, blocker: '请先完成至少一项测试。' })
      return
    }

    // 读取AI设置
    const providerKey = settings.aiProvider || 'baidu'
    const apiKey = settings.aiApiKey || ''
    const secretKey = settings.aiSecretKey || ''
    const providerIdx = this.data.providers.indexOf(providerKey)
    const provider = AI_PROVIDERS[providerKey]
    const showSecretKey = providerKey === 'baidu'

    if (providerKey === 'baidu') {
      if (!apiKey || !secretKey) {
        this.setData({
          canRun: false,
          providerKey,
          providerName: provider.name,
          providerDesc: provider.desc,
          apiKey,
          secretKey,
          showSecretKey,
          isFree: true,
          providerIdx: providerIdx >= 0 ? providerIdx : 0,
          blocker: `请先在下方填入百度的 API Key 和 Secret Key。\n获取地址：${provider.helpUrl}`
        })
        return
      }
    } else {
      if (!apiKey) {
        this.setData({
          canRun: false,
          providerKey,
          providerName: provider.name,
          providerDesc: provider.desc,
          apiKey,
          secretKey: '',
          showSecretKey: false,
          isFree: false,
          providerIdx: providerIdx >= 0 ? providerIdx : 0,
          blocker: `请先在下方填入 ${provider.name} 的 API Key。\n获取地址：${provider.helpUrl}`
        })
        return
      }
    }

    this.setData({
      canRun: true,
      blocker: '',
      providerKey,
      providerName: provider.name,
      providerDesc: provider.desc,
      apiKey,
      secretKey,
      showSecretKey,
      isFree: provider.free || false,
      providerIdx: providerIdx >= 0 ? providerIdx : 0
    })
  },

  onProviderChange(e) {
    const idx = parseInt(e.detail.value)
    const key = this.data.providers[idx]
    const provider = AI_PROVIDERS[key]
    this.setData({
      providerIdx: idx,
      providerKey: key,
      providerName: provider.name,
      providerDesc: provider.desc,
      showSecretKey: key === 'baidu',
      isFree: provider.free || false
    })
    // 保存设置
    storage.updateSetting('aiProvider', key)
    this.onShow()
  },

  onApiKeyInput(e) {
    this.setData({ apiKey: e.detail.value })
  },

  onSecretKeyInput(e) {
    this.setData({ secretKey: e.detail.value })
  },

  saveKeys() {
    const { providerKey, apiKey, secretKey } = this.data
    storage.updateSetting('aiApiKey', apiKey.trim())
    if (providerKey === 'baidu') {
      storage.updateSetting('aiSecretKey', secretKey.trim())
    }
    wx.showToast({ title: '已保存', icon: 'success' })
    this.onShow()
  },

  generate() {
    if (this.data.running) return
    const settings = storage.getSettings()
    const providerKey = settings.aiProvider || 'baidu'
    const provider = AI_PROVIDERS[providerKey]

    if (providerKey === 'baidu') {
      this.generateBaidu()
    } else {
      this.generateOpenAI(provider)
    }
  },

  // 百度文心一言调用
  generateBaidu() {
    const settings = storage.getSettings()
    const apiKey = settings.aiApiKey
    const secretKey = settings.aiSecretKey

    if (!apiKey || !secretKey) {
      wx.showToast({ title: '请先保存API Key', icon: 'none' })
      return
    }

    const my = storage.getMyResults()
    const profile = storage.getProfile()
    const prompt = buildPrompt(my, profile.name)

    this.setData({
      running: true,
      btnLabel: '生成中…请稍候',
      text: '🤔 AI 正在思考你的性格画像…'
    })

    // 先获取 access_token
    wx.request({
      url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
      method: 'POST',
      timeout: 30000,
      header: { 'Content-Type': 'application/json' },
      success: (tokenRes) => {
        if (tokenRes.statusCode !== 200 || !tokenRes.data.access_token) {
          this.showText(`⚠️ 获取token失败：${JSON.stringify(tokenRes.data)}\n\n请检查API Key和Secret Key是否正确`)
          return
        }

        const accessToken = tokenRes.data.access_token

        // 调用文心一言API
        wx.request({
          url: `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie_speed_8k?access_token=${accessToken}`,
          method: 'POST',
          timeout: 60000,
          header: { 'Content-Type': 'application/json' },
          data: {
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_output_tokens: 1024
          },
          success: (res) => {
            if (res.statusCode !== 200) {
              this.showText(`⚠️ HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`)
              return
            }
            const text = res.data.result || ''
            this.showText(text || '（AI 没有返回内容）')
          },
          fail: (err) => {
            this.showText(`⚠️ 调用失败：${err.errMsg || err}`)
          }
        })
      },
      fail: (err) => {
        this.showText(`⚠️ 获取token失败：${err.errMsg || err}\n\n请确认：\n1. 项目「不校验合法域名」已开启\n2. API Key 和 Secret Key 正确`)
      }
    })
  },

  // OpenAI 兼容格式调用（DeepSeek、智谱等）
  generateOpenAI(provider) {
    const settings = storage.getSettings()
    const apiKey = settings.aiApiKey

    if (!apiKey) {
      wx.showToast({ title: '请先保存API Key', icon: 'none' })
      return
    }

    const my = storage.getMyResults()
    const profile = storage.getProfile()
    const prompt = buildPrompt(my, profile.name)

    this.setData({
      running: true,
      btnLabel: '生成中…请稍候',
      text: '🤔 AI 正在思考你的性格画像…'
    })

    let model = 'deepseek-chat'
    if (this.data.providerKey === 'zhipu') model = 'glm-4-flash'

    wx.request({
      url: provider.chatUrl,
      method: 'POST',
      timeout: 60000,
      header: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: model,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: '你是一个温暖友善的性格分析师，善于用亲切的语气给出有深度的分析。' },
          { role: 'user', content: prompt }
        ]
      },
      success: (res) => {
        if (res.statusCode !== 200) {
          this.showText(`⚠️ HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`)
          return
        }
        const content = (res.data.choices || [])[0]
        const text = content ? (content.message || {}).content : ''
        this.showText(text || '（AI 没有返回内容）')
      },
      fail: (err) => {
        this.showText(`⚠️ 调用失败：${err.errMsg || err}\n\n请确认：\n1. 项目「不校验合法域名」已开启\n2. API Key 正确`)
      }
    })
  },

  showText(text) {
    this.setData({
      text,
      running: false,
      btnLabel: '✨ 重新生成'
    })
  },

  copyText() {
    wx.setClipboardData({ data: this.data.text })
  }
})
