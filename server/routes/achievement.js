const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const auth = require('../middleware/auth')

// 获取成就列表
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ?',
      [req.user.id]
    )
    const achievements = {}
    rows.forEach(r => { achievements[r.achievement_id] = r.unlocked_at })
    res.json({ code: 0, achievements })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 解锁成就
router.post('/unlock', auth, async (req, res) => {
  const { achievementId } = req.body
  if (!achievementId) return res.json({ code: -1, error: '成就ID不能为空' })

  try {
    const [result] = await pool.query(
      'INSERT IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)',
      [req.user.id, achievementId]
    )
    const isNew = result.affectedRows > 0
    res.json({ code: 0, isNew, message: isNew ? '成就已解锁' : '成就已存在' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

module.exports = router
