const storage = require('../../utils/storage')
const { ZODIACS } = require('../../utils/data')
const app = getApp()

// 推荐数据
const RECOMMENDATIONS = {
  music: {
    title: '🎵 音乐推荐',
    byType: {
      INTJ: ['古典音乐', '后摇', '氛围音乐', 'Radiohead - OK Computer'],
      INTP: ['电子乐', '实验音乐', '爵士', 'Pink Floyd - The Dark Side of the Moon'],
      ENTJ: ['史诗音乐', '交响乐', '摇滚', 'Queen - Bohemian Rhapsody'],
      ENTP: ['独立摇滚', '朋克', '另类摇滚', 'Arctic Monkeys - AM'],
      INFJ: ['民谣', '新世纪', '梦幻流行', 'Sigur Rós - Takk...'],
      INFP: ['独立民谣', '后摇', '治愈系', 'Bon Iver - For Emma, Forever Ago'],
      ENFJ: ['流行摇滚', '灵魂乐', '福音', 'Coldplay - A Rush of Blood to the Head'],
      ENFP: ['独立流行', '放克', '雷鬼', 'Vampire Weekend - Modern Vampires of the City'],
      ISTJ: ['经典摇滚', '蓝调', '乡村', 'Eagles - Hotel California'],
      ISFJ: ['轻音乐', '古典', '新世纪', 'Yiruma - River Flows in You'],
      ESTJ: ['进行曲', '摇滚', '爱国歌曲', 'AC/DC - Back in Black'],
      ESFJ: ['流行', '乡村', '舞曲', 'Taylor Swift - 1989'],
      ISTP: ['金属', '电子', '工业', 'Daft Punk - Random Access Memories'],
      ISFP: ['梦幻流行', '慢摇', '民谣', 'Lana Del Rey - Born to Die'],
      ESTP: ['嘻哈', '电子舞曲', '摇滚', 'The Weeknd - After Hours'],
      ESFP: ['流行舞曲', '拉丁', '雷鬼', 'Dua Lipa - Future Nostalgia']
    },
    default: ['热门流行歌曲', '轻音乐', '治愈系音乐']
  },
  movies: {
    title: '🎬 电影推荐',
    byType: {
      INTJ: ['《星际穿越》', '《盗梦空间》', '《银翼杀手2049》'],
      INTP: ['《黑客帝国》', '《降临》', '《2001太空漫游》'],
      ENTJ: ['《教父》', '《华尔街之狼》', '《至暗时刻》'],
      ENTP: ['《搏击俱乐部》', '《低俗小说》', '《社交网络》'],
      INFJ: ['《肖申克的救赎》', '《触不可及》', '《天堂电影院》'],
      INFP: ['《阿甘正传》', '《千与千寻》', '《天使爱美丽》'],
      ENFJ: ['《死亡诗社》', '《闻香识女人》', '《国王的演讲》'],
      ENFP: ['《白日梦想家》', '《怦然心动》', '《寻梦环游记》'],
      ISTJ: ['《拯救大兵瑞恩》', '《辛德勒的名单》', '《敦刻尔克》'],
      ISFJ: ['《小鞋子》', '《海蒂和爷爷》', '《龙猫》'],
      ESTJ: ['《十二怒汉》', '《血战钢锯岭》', '《勇敢的心》'],
      ESFJ: ['《音乐之声》', '《泰坦尼克号》', '《罗马假日》'],
      ISTP: ['《疯狂的麦克斯》', '《碟中谍》', '《速度与激情》'],
      ISFP: ['《情书》', '《大鱼》', '《布达佩斯大饭店》'],
      ESTP: ['《007系列》', '《碟中谍》', '《死侍》'],
      ESFP: ['《了不起的盖茨比》', '《爱乐之城》', '《马戏之王》']
    },
    default: ['热门高分电影', '经典必看', '治愈系电影']
  },
  books: {
    title: '📚 书籍推荐',
    byType: {
      INTJ: ['《思考，快与慢》', '《三体》', '《原则》'],
      INTP: ['《人类简史》', '《哥德尔、艾舍尔、巴赫》', '《自私的基因》'],
      ENTJ: ['《从0到1》', '《基业长青》', '《影响力》'],
      ENTP: ['《创新者的窘境》', '《反脆弱》', '《黑天鹅》'],
      INFJ: ['《小王子》', '《追风筝的人》', '《牧羊少年奇幻之旅》'],
      INFP: ['《瓦尔登湖》', '《月亮与六便士》', '《人间失格》'],
      ENFJ: ['《如何赢得朋友》', '《高效能人士的七个习惯》', '《领导力21法则》'],
      ENFP: ['《解忧杂货店》', '《偷影子的人》', '《岛上书店》'],
      ISTJ: ['《孙子兵法》', '《高效执行》', '《细节决定成败》'],
      ISFJ: ['《窗边的小豆豆》', '《小妇人》', '《绿山墙的安妮》'],
      ESTJ: ['《卓有成效的管理者》', '《执行》', '《第五项修炼》'],
      ESFJ: ['《亲密关系》', '《非暴力沟通》', '《爱的五种语言》'],
      ISTP: ['《游戏改变世界》', '《黑客与画家》', '《禅与摩托车维修艺术》'],
      ISFP: ['《偷影子的人》', '《一个人的好天气》', '《步履不停》'],
      ESTP: ['《乔布斯传》', '《鞋狗》', '《创业维艰》'],
      ESFP: ['《活着》', '《许三观卖血记》', '《平凡的世界》']
    },
    default: ['畅销书榜', '经典文学', '自我提升']
  },
  fortune: {
    title: '🔮 今日运势',
    byElement: {
      '火': { lucky: '红色、橙色', mood: '热情高涨', advice: '适合主动出击，把握机会', luckyNum: 3 },
      '土': { lucky: '黄色、棕色', mood: '稳重踏实', advice: '适合处理重要事务，稳步推进', luckyNum: 8 },
      '风': { lucky: '浅蓝、银色', mood: '思维活跃', idea: '适合社交和创意工作', luckyNum: 5 },
      '水': { lucky: '深蓝、紫色', mood: '直觉敏锐', advice: '适合倾听内心，做重要决定', luckyNum: 7 }
    }
  }
}

Page({
  data: {
    hasResults: false,
    mbtiType: '',
    zodiacName: '',
    zodiacElement: '',
    musicRecs: [],
    movieRecs: [],
    bookRecs: [],
    fortune: null,
    profileName: '',
    themeColor: '#7c3aed'
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
      animation: { duration: 300, timingFunc: 'easeIn' }
    })

    const results = storage.getMyResults()
    const profile = storage.getProfile()
    const hasResults = Object.keys(results).length > 0

    if (!hasResults) {
      this.setData({ hasResults: false, profileName: profile.name || '' })
      return
    }

    const mbtiType = results.mbti ? results.mbti.type : ''
    const zodiacName = results.zodiac ? results.zodiac.z1 : ''
    let zodiacElement = ''

    if (zodiacName) {
      const found = ZODIACS.find(z => z[0] === zodiacName)
      if (found) zodiacElement = found[4]
    }

    // 获取推荐
    const musicRecs = mbtiType ? RECOMMENDATIONS.music.byType[mbtiType] || RECOMMENDATIONS.music.default : RECOMMENDATIONS.music.default
    const movieRecs = mbtiType ? RECOMMENDATIONS.movies.byType[mbtiType] || RECOMMENDATIONS.movies.default : RECOMMENDATIONS.movies.default
    const bookRecs = mbtiType ? RECOMMENDATIONS.books.byType[mbtiType] || RECOMMENDATIONS.books.default : RECOMMENDATIONS.books.default
    const fortune = zodiacElement ? RECOMMENDATIONS.fortune.byElement[zodiacElement] : null

    this.setData({
      hasResults: true,
      mbtiType,
      zodiacName,
      zodiacElement,
      musicRecs,
      movieRecs,
      bookRecs,
      fortune,
      profileName: profile.name || ''
    })
  },

  goTest() {
    wx.switchTab({ url: '/pages/personality/personality' })
  },

  // 复制推荐内容
  copyRec(e) {
    const text = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制，去搜索吧', icon: 'none' })
      }
    })
  },

  // 搜索音乐
  searchMusic(e) {
    const name = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: name,
      success: () => {
        wx.showModal({
          title: '🎵 搜索音乐',
          content: `已复制「${name}」到剪贴板，打开音乐 App 粘贴搜索即可收听～`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  // 搜索电影
  searchMovie(e) {
    const name = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: name,
      success: () => {
        wx.showModal({
          title: '🎬 搜索电影',
          content: `已复制「${name}」到剪贴板，打开影视 App 粘贴搜索即可观看～`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  }
})
