const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const auth = require('../middleware/auth')

// 获取所有测试结果
router.get('/results', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT test_key, result_json FROM test_results WHERE user_id = ?',
      [req.user.id]
    )
    const results = {}
    rows.forEach(r => {
      try { results[r.test_key] = JSON.parse(r.result_json) } catch (e) {}
    })
    res.json({ code: 0, results })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 获取单个测试结果
router.get('/:key', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT result_json FROM test_results WHERE user_id = ? AND test_key = ?',
      [req.user.id, req.params.key]
    )
    if (rows.length === 0) return res.json({ code: 0, result: null })
    res.json({ code: 0, result: JSON.parse(rows[0].result_json) })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 保存/更新测试结果
router.put('/:key', auth, async (req, res) => {
  const { result } = req.body
  if (!result) return res.json({ code: -1, error: '测试结果不能为空' })

  try {
    await pool.query(
      `INSERT INTO test_results (user_id, test_key, result_json)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE result_json = VALUES(result_json)`,
      [req.user.id, req.params.key, JSON.stringify(result)]
    )
    res.json({ code: 0, message: '测试结果已保存' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

module.exports = router
