const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const auth = require('../middleware/auth')

// 获取心情日记
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, mood_data, created_at FROM mood_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 200',
      [req.user.id]
    )
    const history = rows.map(r => {
      let data
      try { data = JSON.parse(r.mood_data) } catch (e) { data = {} }
      return { id: r.id, ...data, created_at: r.created_at }
    })
    res.json({ code: 0, history })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 添加心情记录
router.post('/', auth, async (req, res) => {
  const { mood } = req.body
  if (!mood) return res.json({ code: -1, error: '心情数据不能为空' })

  try {
    const [result] = await pool.query(
      'INSERT INTO mood_history (user_id, mood_data) VALUES (?, ?)',
      [req.user.id, JSON.stringify(mood)]
    )
    res.json({ code: 0, id: result.insertId, message: '心情已记录' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 删除心情记录
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM mood_history WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    res.json({ code: 0, message: '已删除' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

module.exports = router
