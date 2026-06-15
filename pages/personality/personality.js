const storage = require('../../utils/storage')
const app = getApp()

// 生成综合性格描述
function generateAnalysis(results) {
  const lines = []
  const mbti = results.mbti
  const taste = results.taste
  const zodiac = results.zodiac
  const love = results.love

  if (mbti) {
    const isE = mbti.type[0] === 'E'
    const isN = mbti.type[1] === 'N'
    const isF = mbti.type[2] === 'F'
    const isJ = mbti.type[3] === 'J'
    lines.push(`🔬 性格基调：你是 ${mbti.type}（${mbti.nick}），${isE ? '外向开朗，善于社交' : '内敛深思，独立自主'}，${isN ? '富有创意和想象力' : '务实可靠，注重细节'}，${isF ? '感性温柔，重视人际和谐' : '理性客观，逻辑思维强'}，${isJ ? '做事计划性强，追求秩序' : '灵活随性，享受探索过程'}。`)
  }

  if (taste) {
    const descMap = {
      SP: '热情奔放、充满活力',
      SW: '浪漫细腻、温柔体贴',
      SA: '务实稳重、踏实可靠',
      UM: '品味独特、注重质感',
      GR: '随和包容、热爱生活',
      LT: '清雅纯粹、内心安宁'
    }
    lines.push(`🍜 生活气质：${taste.name}人格——${descMap[taste.type] || taste.name}。`)
  }

  if (zodiac) {
    lines.push(`⭐ 星象特质：你是${zodiac.z1}，与${zodiac.z2}的元素匹配度 ${zodiac.score} 分——${zodiac.comment}`)
  }

  if (love) {
    lines.push(`💕 情感默契：与 ${love.b} 的默契度 ${love.score}%——${love.comment}`)
  }

  if (lines.length === 0) return '完成更多测试后，这里将生成你的专属性格综合分析~'
  return lines.join('\n\n')
}

Page({
  data: {
    doneCount: 0,
    totalCount: 4,
    analysis: '',
    mbti: null,
    love: null,
    zodiac: null,
    taste: null,
    hasMbti: false,
    hasLove: false,
    hasZodiac: false,
    hasTaste: false,
    themeColor: '#7c3aed'
  },

  onShow() {
    const themeColor = app.getThemeColor()
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeColor,
      animation: { duration: 0, timingFunc: 'easeIn' }
    })

    // 一次性读取数据并合并 setData
    const data = storage.load()
    const mbti = data.mbti || null
    const love = data.love || null
    const zodiac = data.zodiac || null
    const taste = data.taste || null
    const results = { mbti, love, zodiac, taste }
    const doneCount = [mbti, love, zodiac, taste].filter(Boolean).length
    const analysis = generateAnalysis(results)

    // 只调用一次 setData
    this.setData({
      themeColor,
      doneCount,
      analysis,
      mbti,
      love,
      zodiac,
      taste,
      hasMbti: !!mbti,
      hasLove: !!love,
      hasZodiac: !!zodiac,
      hasTaste: !!taste
    })
  },

  goMbti() { wx.navigateTo({ url: '/pages/mbti/mbti' }) },
  goLove() { wx.navigateTo({ url: '/pages/love/love' }) },
  goZodiac() { wx.navigateTo({ url: '/pages/zodiac/zodiac' }) },
  goTaste() { wx.navigateTo({ url: '/pages/taste/taste' }) }
})
