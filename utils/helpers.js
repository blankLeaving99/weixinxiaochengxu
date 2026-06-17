/**
 * 通用算法：星座推算、元素打分、MBTI/口味/综合兼容度、成就检查
 */
const {
  ZODIACS, ELEMENT_SCORES, MBTI_PAIRS, TASTE_COMPAT, ACHIEVEMENTS
} = require('./data')
const storage = require('./storage')
const api = require('./api')

function getZodiac(month, day) {
  for (const [name, sym, start, end, elem] of ZODIACS) {
    const [sm, sd] = start
    const [em, ed] = end
    if (sm === em) {
      if (month === sm && day >= sd && day <= ed) return { name, sym, elem }
    } else {
      if ((month === sm && day >= sd) || (month === em && day <= ed)) {
        return { name, sym, elem }
      }
    }
  }
  const z = ZODIACS[0]
  return { name: z[0], sym: z[1], elem: z[4] }
}

function elementScore(e1, e2) {
  return ELEMENT_SCORES[e1 + e2] || ELEMENT_SCORES[e2 + e1] || 70
}

function getElementOf(zodiacName) {
  const found = ZODIACS.find(z => z[0] === zodiacName)
  return found ? found[4] : ''
}

function parseBirthday(str) {
  if (!str) return null
  const parts = ('' + str).replace(/-/g, '/').split('/')
  if (parts.length < 2) return null
  const m = parseInt(parts[0])
  const d = parseInt(parts[1])
  if (isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return null
  return [m, d]
}

// ===== MBTI 兼容度（0-100） =====
function mbtiCompat(t1, t2) {
  if (!t1 || !t2) return 0
  if (t1 === t2) return 78
  const sorted = [t1, t2].sort()
  const score = MBTI_PAIRS[`${sorted[0]}-${sorted[1]}`]
  if (score) return score
  // 共享维度数
  let same = 0
  for (let i = 0; i < 4; i++) if (t1[i] === t2[i]) same++
  return 50 + same * 8
}

// ===== 口味兼容度 =====
function tasteCompat(t1, t2) {
  if (!t1 || !t2) return 0
  if (t1 === t2) return 80
  const sorted = [t1, t2].sort()
  return TASTE_COMPAT[`${sorted[0]}-${sorted[1]}`] || 70
}

// ===== 综合契合度 =====
function overallScore(myResults, friendResults) {
  const parts = []
  const myMbti = (myResults.mbti || {}).type
  const fMbti = (friendResults.mbti || {}).type
  if (myMbti && fMbti) parts.push(mbtiCompat(myMbti, fMbti))

  const myT = (myResults.taste || {}).type
  const fT = (friendResults.taste || {}).type
  if (myT && fT) parts.push(tasteCompat(myT, fT))

  const myZ = (myResults.zodiac || {}).z1
  const fZ = (friendResults.zodiac || {}).z1
  if (myZ && fZ) {
    const e1 = getElementOf(myZ)
    const e2 = getElementOf(fZ)
    if (e1 && e2) {
      let s = elementScore(e1, e2)
      if (myZ === fZ) s = Math.min(99, s + 3)
      parts.push(s)
    }
  }
  if (parts.length === 0) return null
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
}

// ===== 成就检查 =====
function _achInfo(aid) {
  const a = ACHIEVEMENTS.find(x => x[0] === aid)
  return a ? { id: a[0], icon: a[1], title: a[2], desc: a[3] } : null
}

/**
 * 完成测试后调用，返回新解锁成就 [{id,icon,title,desc}, ...]
 */
function checkAfterTest(testKey, result) {
  const unlocked = []
  const my = storage.getMyResults()
  const tryUnlock = (aid) => {
    if (storage.unlockAchievement(aid)) {
      const info = _achInfo(aid)
      if (info) unlocked.push(info)
      // 同步到服务器
      api.unlockAchievement(aid).catch(() => {})
      // 解锁成就奖励积分
      awardPoints('achievement_unlock')
    }
  }

  // 完成测试奖励积分
  awardPoints('test_complete')

  if (Object.keys(my).length > 0) tryUnlock('first_test')
  if (testKey === 'mbti') {
    tryUnlock('mbti_done')
    const t = result.type || ''
    if (t === 'INTJ' || t === 'INTP') tryUnlock('introvert')
    if (t === 'INFJ') tryUnlock('rare_type')
  }
  if (testKey === 'love') {
    tryUnlock('love_done')
    if ((result.score || 0) >= 80) {
      tryUnlock('love_high')
      awardPoints('test_high_score')
    }
  }
  if (testKey === 'zodiac') tryUnlock('zodiac_done')
  if (testKey === 'taste') tryUnlock('taste_done')
  if (testKey === 'eq') {
    tryUnlock('eq_done')
    if ((result.score || 0) >= 85) {
      tryUnlock('eq_high')
      awardPoints('test_high_score')
    }
  }
  if (testKey === 'iq') {
    tryUnlock('iq_done')
    if ((result.correct || 0) >= 12) {
      tryUnlock('iq_high')
      awardPoints('test_high_score')
    }
  }
  if (testKey === 'color') tryUnlock('color_done')
  if (testKey === 'fun_stress' || testKey === 'fun_happiness' || testKey === 'fun_social') {
    tryUnlock('fun_done')
  }
  // 全部完成成就
  const basicTests = ['mbti', 'love', 'zodiac', 'taste']
  if (basicTests.every(k => k in my)) {
    tryUnlock('all_done')
  }
  const allTests = ['mbti', 'love', 'zodiac', 'taste', 'eq', 'iq', 'color']
  if (allTests.every(k => k in my)) {
    tryUnlock('super_tester')
  }
  return unlocked
}

function checkFriendAdded() {
  const unlocked = []
  const n = Object.keys(storage.getFriends()).length
  const tryUnlock = (aid) => {
    if (storage.unlockAchievement(aid)) {
      const info = _achInfo(aid)
      if (info) unlocked.push(info)
      api.unlockAchievement(aid).catch(() => {})
    }
  }
  if (n >= 1) tryUnlock('first_friend')
  if (n >= 5) tryUnlock('social_butterfly')
  if (n >= 10) tryUnlock('network_master')
  return unlocked
}

/**
 * 弹窗展示新解锁成就（使用 wx.showModal）
 */
function showUnlocked(items) {
  if (!items || items.length === 0) return
  const list = items.map(a => `${a.icon} ${a.title}：${a.desc}`).join('\n')
  wx.vibrateShort({ type: 'medium' })
  wx.showModal({
    title: '🎉 恭喜解锁新成就！',
    content: list,
    showCancel: false,
    confirmText: '太棒了'
  })
}

// ===== 积分奖励 =====
const POINTS_REWARDS = {
  test_complete: { points: 30, reason: '完成测试' },
  test_high_score: { points: 20, reason: '测试高分' },
  daily_checkin: { points: 10, reason: '每日打卡' },
  streak_3: { points: 30, reason: '连续3天打卡' },
  streak_7: { points: 70, reason: '连续7天打卡' },
  friend_add: { points: 15, reason: '添加好友' },
  achievement_unlock: { points: 25, reason: '解锁成就' },
  share: { points: 5, reason: '分享' },
  ai_generate: { points: 10, reason: 'AI解读' }
}

function awardPoints(action) {
  const reward = POINTS_REWARDS[action]
  if (!reward) return null
  const result = storage.addPoints(reward.points, reward.reason)
  // 同步到服务器
  api.addPoints(reward.points, reward.reason).catch(() => {})
  if (result.leveledUp) {
    const levelInfo = storage.getLevelInfo(result.level)
    wx.showModal({
      title: '🎉 升级了！',
      content: `恭喜升到 ${result.level} 级！\n当前头衔：${levelInfo.icon} ${levelInfo.title}`,
      showCancel: false,
      confirmText: '太棒了'
    })
  }
  return result
}

module.exports = {
  getZodiac,
  elementScore,
  getElementOf,
  parseBirthday,
  mbtiCompat,
  tasteCompat,
  overallScore,
  checkAfterTest,
  checkFriendAdded,
  showUnlocked,
  awardPoints,
  achInfo: _achInfo
}
