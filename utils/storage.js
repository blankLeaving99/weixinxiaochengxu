/**
 * 本地存储工具 - 封装 wx.Storage API
 * 数据结构：{ mbti, love, zodiac, taste, _profile, _settings, _history, ... }
 */
const STORAGE_KEY = 'personality_suite_v1'

// 内存缓存，避免重复读取 storage
let _cache = null

function load() {
  if (_cache) return _cache
  try {
    _cache = wx.getStorageSync(STORAGE_KEY) || {}
    return _cache
  } catch (e) {
    return {}
  }
}

function save(data) {
  try {
    _cache = data
    wx.setStorageSync(STORAGE_KEY, data)
  } catch (e) {
    console.error('存储失败:', e)
  }
}

// 清除缓存（用于数据恢复等场景）
function clearCache() {
  _cache = null
}

function getResult(key) {
  return load()[key] || null
}

function setResult(key, result) {
  const data = load()
  data[key] = result
  save(data)
}

/**
 * 清除测试结果，保留以 _ 开头的元数据（设置、档案等）
 */
function clearResults() {
  const data = load()
  const keep = {}
  Object.keys(data).forEach(k => {
    if (k.startsWith('_')) keep[k] = data[k]
  })
  save(keep)
}

/**
 * 获取所有测试结果（排除元数据键）
 */
function getMyResults() {
  const data = load()
  const results = {}
  Object.keys(data).forEach(k => {
    if (!k.startsWith('_')) results[k] = data[k]
  })
  return results
}

// ===== 个人档案 =====
function getProfile() {
  return load()._profile || { name: '' }
}
function setProfile(profile) {
  const data = load()
  data._profile = profile
  save(data)
}

// ===== 好友 =====
function getFriends() {
  return load()._friends || {}
}
function addFriend(name, payload) {
  const data = load()
  const friends = data._friends || {}
  friends[name] = payload
  data._friends = friends
  save(data)
}
function removeFriend(name) {
  const data = load()
  const friends = data._friends || {}
  if (friends[name]) {
    delete friends[name]
    data._friends = friends
    save(data)
  }
}
function setFriendNote(name, note) {
  const data = load()
  const friends = data._friends || {}
  if (friends[name]) {
    friends[name]._note = note
    data._friends = friends
    save(data)
  }
}
function getFriendNote(name) {
  const f = getFriends()[name] || {}
  return f._note || ''
}

// ===== 导出包 =====
function exportPayload() {
  return {
    app: 'PersonalityTestSuite',
    version: 1,
    profile: getProfile(),
    results: getMyResults()
  }
}

// ===== 历史 =====
function addHistory(testKey, snapshot) {
  const data = load()
  const hist = data._history || []
  hist.push({
    ts: new Date().toISOString().split('.')[0],
    test: testKey,
    data: snapshot
  })
  data._history = hist.slice(-200)
  save(data)
}
function getHistory() {
  return load()._history || []
}

// ===== 成就 =====
function getAchievements() {
  return load()._achievements || {}
}
/** 解锁成就，返回 true 表示首次解锁 */
function unlockAchievement(aid, ts) {
  const data = load()
  const ach = data._achievements || {}
  if (ach[aid]) return false
  ach[aid] = ts || new Date().toISOString().split('.')[0]
  data._achievements = ach
  save(data)
  return true
}

// ===== 每日一题 =====
function getDailyState() {
  return load()._daily || { streak: 0, last_date: '', history: [] }
}
function setDailyState(state) {
  const data = load()
  data._daily = state
  save(data)
}

// ===== 设置 =====
const DEFAULT_SETTINGS = {
  theme: 'light',
  fontScale: 1.0,
  aiProvider: 'baidu',
  aiApiKey: '',
  aiSecretKey: ''
}
function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, load()._settings || {})
}
function updateSetting(key, value) {
  const data = load()
  const s = data._settings || {}
  s[key] = value
  data._settings = s
  save(data)
}

// ===== 心情日记 =====
function getMoodState() {
  return load()._mood || { history: [] }
}
function setMoodState(state) {
  const data = load()
  data._mood = state
  save(data)
}

// ===== 积分等级系统 =====
function getPoints() {
  return load()._points || { xp: 0, level: 1, totalEarned: 0, history: [] }
}
function addPoints(amount, reason) {
  const data = load()
  const pts = data._points || { xp: 0, level: 1, totalEarned: 0, history: [] }
  pts.xp += amount
  pts.totalEarned += amount
  pts.history.unshift({
    ts: new Date().toISOString().split('.')[0],
    amount,
    reason
  })
  if (pts.history.length > 100) pts.history = pts.history.slice(0, 100)
  // 计算等级 (每100xp升一级，越高级需要越多)
  let newLevel = 1
  let xpNeeded = 100
  let totalXp = pts.xp
  while (totalXp >= xpNeeded && newLevel < 50) {
    totalXp -= xpNeeded
    newLevel++
    xpNeeded = 100 + (newLevel - 1) * 50
  }
  const leveledUp = newLevel > pts.level
  pts.level = newLevel
  data._points = pts
  save(data)
  return { leveledUp, level: newLevel, xp: pts.xp }
}
function getLevelInfo(level) {
  const levels = [
    { level: 1, title: '新手上路', icon: '🌱', xpNeeded: 100 },
    { level: 2, title: '好奇宝宝', icon: '🐣', xpNeeded: 150 },
    { level: 3, title: '探索达人', icon: '🔍', xpNeeded: 200 },
    { level: 4, title: '测试高手', icon: '⭐', xpNeeded: 250 },
    { level: 5, title: '性格分析师', icon: '🎯', xpNeeded: 300 },
    { level: 6, title: '心理大师', icon: '🧠', xpNeeded: 350 },
    { level: 7, title: '智慧之光', icon: '💡', xpNeeded: 400 },
    { level: 8, title: '洞察先知', icon: '🔮', xpNeeded: 450 },
    { level: 9, title: '传奇测试者', icon: '👑', xpNeeded: 500 },
    { level: 10, title: '至尊大师', icon: '🏆', xpNeeded: 99999 }
  ]
  const info = levels.find(l => l.level === level) || levels[levels.length - 1]
  const prevInfo = levels.find(l => l.level === level - 1)
  return {
    ...info,
    prevXpNeeded: prevInfo ? prevInfo.xpNeeded : 0
  }
}

// ===== 备份 / 恢复 =====
function fullBackup() {
  return load()
}
function fullRestore(data) {
  _cache = null  // 恢复时清除缓存
  save(data || {})
}

module.exports = {
  load, save, clearCache,
  getResult, setResult, clearResults, getMyResults,
  getProfile, setProfile,
  getFriends, addFriend, removeFriend, setFriendNote, getFriendNote,
  exportPayload,
  addHistory, getHistory,
  getAchievements, unlockAchievement,
  getDailyState, setDailyState,
  getMoodState, setMoodState,
  getSettings, updateSetting,
  getPoints, addPoints, getLevelInfo,
  fullBackup, fullRestore
}
