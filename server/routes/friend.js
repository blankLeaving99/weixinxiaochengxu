const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const auth = require('../middleware/auth')

// 搜索用户（支持昵称和ID）
router.post('/search', auth, async (req, res) => {
  const { keyword } = req.body
  if (!keyword) return res.json({ code: -1, error: '搜索关键词不能为空' })

  try {
    const trimmed = keyword.trim()
    let users

    // 如果是纯数字，按ID精确搜索
    if (/^\d+$/.test(trimmed)) {
      ;[users] = await pool.query(
        'SELECT id, nickname, avatar FROM users WHERE id = ? AND id != ? LIMIT 1',
        [parseInt(trimmed), req.user.id]
      )
    } else {
      // 按昵称模糊搜索
      ;[users] = await pool.query(
        'SELECT id, nickname, avatar FROM users WHERE nickname LIKE ? AND id != ? AND discoverable = 1 LIMIT 50',
        [`%${trimmed}%`, req.user.id]
      )
    }

    res.json({ code: 0, users })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 获取好友列表
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.friend_id, f.note, f.created_at, u.openid, u.nickname, u.avatar
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [req.user.id])

    res.json({ code: 0, friends: rows })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 添加好友
router.post('/add', auth, async (req, res) => {
  const { friendId } = req.body
  if (!friendId) return res.json({ code: -1, error: '好友ID不能为空' })
  if (friendId === req.user.id) return res.json({ code: -1, error: '不能添加自己为好友' })

  try {
    // 检查好友是否存在
    const [friend] = await pool.query('SELECT id FROM users WHERE id = ?', [friendId])
    if (friend.length === 0) return res.json({ code: -1, error: '用户不存在' })

    // 检查是否已是好友
    const [existing] = await pool.query(
      'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
      [req.user.id, friendId]
    )
    if (existing.length > 0) return res.json({ code: 0, message: '已经是好友了' })

    // 双向添加
    await pool.query(
      'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?), (?, ?)',
      [req.user.id, friendId, friendId, req.user.id]
    )

    res.json({ code: 0, message: '添加成功' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 删除好友
router.delete('/:id', auth, async (req, res) => {
  const friendId = parseInt(req.params.id)
  try {
    await pool.query(
      'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [req.user.id, friendId, friendId, req.user.id]
    )
    res.json({ code: 0, message: '删除成功' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 更新好友备注
router.put('/:id/note', auth, async (req, res) => {
  const friendId = parseInt(req.params.id)
  const { note } = req.body
  try {
    await pool.query(
      'UPDATE friendships SET note = ? WHERE user_id = ? AND friend_id = ?',
      [note || '', req.user.id, friendId]
    )
    res.json({ code: 0, message: '备注已更新' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 获取好友测试结果（用于比较）
router.get('/:id/results', auth, async (req, res) => {
  const friendId = parseInt(req.params.id)
  try {
    // 验证是否是好友
    const [rel] = await pool.query(
      'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
      [req.user.id, friendId]
    )
    if (rel.length === 0) return res.json({ code: -1, error: '对方不是你的好友' })

    // 获取好友信息
    const [user] = await pool.query('SELECT nickname FROM users WHERE id = ?', [friendId])
    // 获取好友测试结果
    const [rows] = await pool.query(
      'SELECT test_key, result_json FROM test_results WHERE user_id = ?',
      [friendId]
    )
    const results = {}
    rows.forEach(r => {
      try { results[r.test_key] = JSON.parse(r.result_json) } catch (e) {}
    })

    res.json({
      code: 0,
      friend: { id: friendId, nickname: user[0]?.nickname || '未知' },
      results
    })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

module.exports = router
