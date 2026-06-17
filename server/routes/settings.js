const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const auth = require('../middleware/auth')

// 获取设置
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT settings_json FROM user_settings WHERE user_id = ?', [req.user.id])
    if (rows.length === 0) return res.json({ code: 0, settings: {} })
    let settings = {}
    try { settings = JSON.parse(rows[0].settings_json) } catch (e) {}
    res.json({ code: 0, settings })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 更新设置
router.put('/', auth, async (req, res) => {
  const { settings } = req.body
  try {
    await pool.query(
      `INSERT INTO user_settings (user_id, settings_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)`,
      [req.user.id, JSON.stringify(settings || {})]
    )
    res.json({ code: 0, message: '设置已保存' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

module.exports = router
