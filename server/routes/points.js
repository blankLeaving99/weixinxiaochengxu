const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const auth = require('../middleware/auth')

// 获取积分信息
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM points WHERE user_id = ?', [req.user.id])
    if (rows.length === 0) {
      await pool.query('INSERT INTO points (user_id) VALUES (?)', [req.user.id])
      return res.json({ code: 0, points: { xp: 0, level: 1, total_earned: 0 } })
    }
    res.json({ code: 0, points: rows[0] })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 增加积分
router.post('/add', auth, async (req, res) => {
  const { amount, reason } = req.body
  if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 100 || !Number.isInteger(amount)) {
    return res.json({ code: -1, error: '积分数必须是1-100的正整数' })
  }

  try {
    // 确保积分记录存在
    await pool.query('INSERT IGNORE INTO points (user_id) VALUES (?)', [req.user.id])

    // 更新积分
    await pool.query(
      'UPDATE points SET xp = xp + ?, total_earned = total_earned + ? WHERE user_id = ?',
      [amount, amount, req.user.id]
    )

    // 记录历史
    await pool.query(
      'INSERT INTO point_history (user_id, amount, reason) VALUES (?, ?, ?)',
      [req.user.id, amount, reason || '']
    )

    // 计算等级
    const [rows] = await pool.query('SELECT * FROM points WHERE user_id = ?', [req.user.id])
    const pts = rows[0]
    let newLevel = 1
    let xpNeeded = 100
    let totalXp = pts.xp
    while (totalXp >= xpNeeded && newLevel < 50) {
      totalXp -= xpNeeded
      newLevel++
      xpNeeded = 100 + (newLevel - 1) * 50
    }
    const leveledUp = newLevel > pts.level
    if (leveledUp) {
      await pool.query('UPDATE points SET level = ? WHERE user_id = ?', [newLevel, req.user.id])
    }

    res.json({ code: 0, leveledUp, level: newLevel, xp: pts.xp })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 设置积分（恢复备份用，直接覆盖而非累加）
router.post('/set', auth, async (req, res) => {
  const { xp, level } = req.body
  if (xp == null) return res.json({ code: -1, error: '积分数不能为空' })

  try {
    await pool.query('INSERT IGNORE INTO points (user_id) VALUES (?)', [req.user.id])
    await pool.query(
      'UPDATE points SET xp = ?, level = ?, total_earned = ? WHERE user_id = ?',
      [xp, level || 1, xp, req.user.id]
    )
    res.json({ code: 0, message: '积分已设置' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 获取积分历史
router.get('/history', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT amount, reason, created_at FROM point_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    )
    res.json({ code: 0, history: rows })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

module.exports = router
