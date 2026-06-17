const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const auth = require('../middleware/auth')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const authConfig = require('../config/auth')

// 登录：用微信 code 换 openid，签发 JWT
router.post('/login', async (req, res) => {
  const { code, nickname, avatar } = req.body
  if (!code) {
    return res.json({ code: -1, error: '缺少 wx.login code' })
  }

  try {
    let openid

    if (authConfig.devMode) {
      // 开发模式：用 code 生成稳定的 openid（同一 code 每次登录相同）
      const crypto = require('crypto')
      openid = 'dev_' + crypto.createHash('md5').update(code).digest('hex').substring(0, 16)
      console.log(`[DEV] code=${code} → openid=${openid}`)
    } else {
      // 生产模式：用微信 code2session 接口换取 openid
      const wxUrl = 'https://api.weixin.qq.com/sns/jscode2session'
      const wxRes = await axios.get(wxUrl, {
        params: {
          appid: authConfig.wx.appId,
          secret: authConfig.wx.secret,
          js_code: code,
          grant_type: 'authorization_code'
        }
      })

      const data = wxRes.data
      if (!data.openid) {
        console.error('微信 code2session 失败:', data)
        return res.json({ code: -1, error: '微信登录失败: ' + (data.errmsg || '未知错误') })
      }
      openid = data.openid
    }

    // 查找或创建用户
    const [existing] = await pool.query('SELECT * FROM users WHERE openid = ?', [openid])

    let user
    if (existing.length === 0) {
      // 新用户
      const [result] = await pool.query(
        'INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)',
        [openid, nickname || '微信用户', avatar || '']
      )
      // 初始化积分
      await pool.query('INSERT INTO points (user_id) VALUES (?)', [result.insertId])
      // 初始化设置
      await pool.query('INSERT INTO user_settings (user_id, settings_json) VALUES (?, ?)', [result.insertId, '{}'])
      // 初始化每日一题
      await pool.query('INSERT INTO daily_state (user_id) VALUES (?)', [result.insertId])

      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId])
      user = rows[0]
    } else {
      user = existing[0]
      // 更新登录时间
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])
    }

    // 签发 JWT（包含用户 ID 和 openid）
    const token = jwt.sign(
      { userId: user.id, openid: user.openid },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiresIn }
    )

    res.json({
      code: 0,
      token,
      user: { id: user.id, nickname: user.nickname, avatar: user.avatar },
      isNew: existing.length === 0
    })
  } catch (err) {
    console.error('login error:', err)
    res.json({ code: -1, error: err.message })
  }
})

// 获取当前用户信息
router.get('/user/info', auth, (req, res) => {
  res.json({ code: 0, user: req.user })
})

// 更新昵称
router.put('/user/nickname', auth, async (req, res) => {
  const { nickname } = req.body
  if (!nickname) return res.json({ code: -1, error: '昵称不能为空' })

  try {
    await pool.query('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.user.id])
    res.json({ code: 0, message: '昵称已更新' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

module.exports = router
