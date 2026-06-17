const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const authConfig = require('../config/auth')

/**
 * JWT 鉴权中间件
 * 从 Authorization: Bearer <token> 中解析用户信息
 */
async function auth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: -1, error: '未提供认证令牌' })
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret)

    // 从数据库获取用户信息（确保用户仍存在）
    const [rows] = await pool.query(
      'SELECT id, openid, nickname, avatar FROM users WHERE id = ?',
      [decoded.userId]
    )
    if (rows.length === 0) {
      return res.status(401).json({ code: -1, error: '用户不存在' })
    }

    req.user = rows[0]
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: -1, error: '认证令牌已过期，请重新登录' })
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ code: -1, error: '无效的认证令牌' })
    }
    console.error('auth error:', err)
    res.status(500).json({ code: -1, error: '服务器错误' })
  }
}

module.exports = auth
