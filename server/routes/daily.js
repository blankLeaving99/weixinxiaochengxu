const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const auth = require('../middleware/auth')

// 获取每日一题状态
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM daily_state WHERE user_id = ?', [req.user.id])
    if (rows.length === 0) {
      return res.json({ code: 0, state: { streak: 0, last_date: '', history: [] } })
    }
    const state = rows[0]
    let history = []
    try { history = JSON.parse(state.history_json) } catch (e) {}
    res.json({
      code: 0,
      state: { streak: state.streak, last_date: state.last_date, history }
    })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 更新每日一题状态
router.put('/', auth, async (req, res) => {
  const { streak, last_date, history } = req.body
  try {
    await pool.query(
      `INSERT INTO daily_state (user_id, streak, last_date, history_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE streak = VALUES(streak), last_date = VALUES(last_date), history_json = VALUES(history_json)`,
      [req.user.id, streak || 0, last_date || '', JSON.stringify(history || [])]
    )
    res.json({ code: 0, message: '每日一题状态已更新' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

module.exports = router
