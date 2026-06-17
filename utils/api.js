/**
 * HTTP API 工具模块 - 封装对后端服务器的所有请求
 * 认证流程：wx.login() 获取 code → 后端换 openid + 签发 JWT → 请求携带 Authorization: Bearer <token>
 */

// ⚠️ 替换为你的服务器地址
// 开发时用局域网 IP（手机和电脑在同一 WiFi 下）
// 部署后换成正式域名
const BASE_URL = 'https://weixinxiaochengxu-production.up.railway.app/api'

// Token 存储 key
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

// ===== Token 管理 =====

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token)
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USER_KEY)
}

function getLocalUser() {
  try {
    return JSON.parse(wx.getStorageSync(USER_KEY) || 'null')
  } catch (e) {
    return null
  }
}

function setLocalUser(user) {
  wx.setStorageSync(USER_KEY, JSON.stringify(user))
}

function getLocalProfile() {
  try {
    const data = wx.getStorageSync('personality_suite_v1') || {}
    return data._profile || { name: '' }
  } catch (e) {
    return { name: '' }
  }
}

// ===== 请求方法 =====

/**
 * 底层请求（不自动弹 toast）
 * 401 时自动尝试重新登录并重试一次
 */
function rawRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const header = { 'Content-Type': 'application/json' }
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }

    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header,
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 401) {
          // token 失效，清除并尝试重新登录
          clearToken()
          login().then(() => {
            // 重试一次
            const retryToken = getToken()
            const retryHeader = { 'Content-Type': 'application/json' }
            if (retryToken) {
              retryHeader['Authorization'] = `Bearer ${retryToken}`
            }
            wx.request({
              url: BASE_URL + path,
              method,
              data,
              header: retryHeader,
              timeout: 10000,
              success: (res2) => resolve(res2.data),
              fail: reject
            })
          }).catch(reject)
          return
        }
        if (res.statusCode >= 400) {
          reject(new Error(res.data?.error || `HTTP ${res.statusCode}`))
          return
        }
        resolve(res.data)
      },
      fail: (err) => {
        console.error(`API 请求失败: ${method} ${path}`, err)
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

/**
 * 通用请求（对外接口，自动弹 toast 提示错误）
 */
async function request(method, path, data, silent) {
  try {
    const res = await rawRequest(method, path, data)
    if (res.code !== 0 && !silent) {
      wx.showToast({ title: res.error || '操作失败', icon: 'none' })
    }
    return res
  } catch (err) {
    if (!silent) {
      wx.showToast({ title: err.message || '网络错误', icon: 'none' })
    }
    throw err
  }
}

// ===== 用户 / 登录 =====

/**
 * 登录：wx.login() 获取 code → 后端换 openid + 签发 JWT
 * @returns {Promise<{code, token, user, isNew}>}
 */
async function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (loginRes) => {
        try {
          const profile = getLocalProfile()
          const res = await rawRequest('POST', '/login', {
            code: loginRes.code,
            nickname: profile.name || '微信用户'
          })

          if (res.code === 0 && res.token) {
            setToken(res.token)
            setLocalUser(res.user)
          }

          resolve(res)
        } catch (err) {
          reject(err)
        }
      },
      fail: (err) => {
        reject(new Error('微信登录失败: ' + (err.errMsg || '未知错误')))
      }
    })
  })
}

/** 退出登录 */
function logout() {
  clearToken()
}

/** 检查是否已登录 */
function isLoggedIn() {
  return !!getToken()
}

/** 获取本地缓存的用户信息 */
function getUser() {
  return getLocalUser()
}

async function getUserInfo() {
  return request('GET', '/user/info')
}

async function updateNickname(nickname) {
  return request('PUT', '/user/nickname', { nickname })
}

// ===== 测试结果 =====

async function getTestResults() {
  return request('GET', '/test/results')
}

async function getTestResult(key) {
  return request('GET', `/test/${key}`)
}

async function saveTestResult(key, result) {
  return request('PUT', `/test/${key}`, { result }, true)
}

// ===== 好友 =====

async function searchUsers(keyword) {
  return request('POST', '/friends/search', { keyword })
}

async function getFriends() {
  return request('GET', '/friends')
}

async function addFriend(friendId) {
  return request('POST', '/friends/add', { friendId })
}

async function removeFriend(friendId) {
  return request('DELETE', `/friends/${friendId}`, null, true)
}

async function updateFriendNote(friendId, note) {
  return request('PUT', `/friends/${friendId}/note`, { note }, true)
}

async function getFriendResults(friendId) {
  return request('GET', `/friends/${friendId}/results`)
}

// ===== 成就 =====

async function getAchievements() {
  return request('GET', '/achievements')
}

async function unlockAchievement(achievementId) {
  return request('POST', '/achievements/unlock', { achievementId })
}

// ===== 积分 =====

async function getPoints() {
  return request('GET', '/points')
}

async function addPoints(amount, reason) {
  return request('POST', '/points/add', { amount, reason })
}

// ===== 心情日记 =====

async function getMoodHistory() {
  return request('GET', '/mood')
}

async function addMood(mood) {
  return request('POST', '/mood', { mood })
}

async function deleteMood(id) {
  return request('DELETE', `/mood/${id}`)
}

// ===== 每日一题 =====

async function getDailyState() {
  return request('GET', '/daily')
}

async function updateDailyState(state) {
  return request('PUT', '/daily', state)
}

// ===== 设置 =====

async function getSettings() {
  return request('GET', '/settings')
}

async function saveSettings(settings) {
  return request('PUT', '/settings', { settings })
}

// ===== 健康检查 =====

async function healthCheck() {
  return rawRequest('GET', '/health')
}

module.exports = {
  BASE_URL,
  // Token 管理
  getToken,
  setToken,
  clearToken,
  isLoggedIn,
  getUser,
  logout,
  // 登录
  login,
  // 用户
  getUserInfo,
  updateNickname,
  // 测试结果
  getTestResults,
  getTestResult,
  saveTestResult,
  // 好友
  searchUsers,
  getFriends,
  addFriend,
  removeFriend,
  updateFriendNote,
  getFriendResults,
  // 成就
  getAchievements,
  unlockAchievement,
  // 积分
  getPoints,
  addPoints,
  // 心情
  getMoodHistory,
  addMood,
  deleteMood,
  // 每日一题
  getDailyState,
  updateDailyState,
  // 设置
  getSettings,
  saveSettings,
  // 其他
  healthCheck
}
