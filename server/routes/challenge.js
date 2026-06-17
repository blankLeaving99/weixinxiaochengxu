const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const auth = require('../middleware/auth')

// 发起挑战邀请
router.post('/create', auth, async (req, res) => {
  const { friendId, testKey } = req.body
  if (!friendId) return res.json({ code: -1, error: '好友ID不能为空' })
  if (!testKey) return res.json({ code: -1, error: '测试类型不能为空' })
  if (friendId === req.user.id) return res.json({ code: -1, error: '不能挑战自己' })

  try {
    // 验证是否是好友
    const [rel] = await pool.query(
      'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
      [req.user.id, friendId]
    )
    if (rel.length === 0) return res.json({ code: -1, error: '对方不是你的好友' })

    // 创建挑战
    const [result] = await pool.query(
      'INSERT INTO challenges (from_user_id, to_user_id, test_key) VALUES (?, ?, ?)',
      [req.user.id, friendId, testKey]
    )

    res.json({ code: 0, challengeId: result.insertId, message: '挑战邀请已发送' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 获取我的挑战列表
router.get('/list', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*,
        u1.nickname AS from_nickname,
        u2.nickname AS to_nickname
      FROM challenges c
      JOIN users u1 ON c.from_user_id = u1.id
      JOIN users u2 ON c.to_user_id = u2.id
      WHERE c.from_user_id = ? OR c.to_user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `, [req.user.id, req.user.id])

    res.json({ code: 0, challenges: rows })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 获取待处理的挑战（别人发给我的）
router.get('/pending', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, u.nickname AS from_nickname
      FROM challenges c
      JOIN users u ON c.from_user_id = u.id
      WHERE c.to_user_id = ? AND c.status = 'pending'
      ORDER BY c.created_at DESC
    `, [req.user.id])

    res.json({ code: 0, challenges: rows })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 获取单个挑战详情
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*,
        u1.nickname AS from_nickname,
        u2.nickname AS to_nickname
      FROM challenges c
      JOIN users u1 ON c.from_user_id = u1.id
      JOIN users u2 ON c.to_user_id = u2.id
      WHERE c.id = ? AND (c.from_user_id = ? OR c.to_user_id = ?)
    `, [req.params.id, req.user.id, req.user.id])

    if (rows.length === 0) return res.json({ code: -1, error: '挑战不存在' })

    const challenge = rows[0]
    // 解析 JSON 字段
    try { challenge.from_answers = JSON.parse(challenge.from_answers || 'null') } catch (e) {}
    try { challenge.to_answers = JSON.parse(challenge.to_answers || 'null') } catch (e) {}
    try { challenge.result = JSON.parse(challenge.result || 'null') } catch (e) {}

    res.json({ code: 0, challenge })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 接受挑战
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM challenges WHERE id = ? AND to_user_id = ? AND status = ?',
      [req.params.id, req.user.id, 'pending']
    )
    if (rows.length === 0) return res.json({ code: -1, error: '挑战不存在或已过期' })

    await pool.query(
      'UPDATE challenges SET status = ? WHERE id = ?',
      ['accepted', req.params.id]
    )

    res.json({ code: 0, message: '已接受挑战' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 提交答案
router.post('/:id/answer', auth, async (req, res) => {
  const { answers } = req.body
  if (!answers || !Array.isArray(answers)) return res.json({ code: -1, error: '答案必须是数组' })
  if (answers.length === 0 || answers.length > 20) return res.json({ code: -1, error: '答案数量异常' })

  try {
    const [rows] = await pool.query(
      'SELECT * FROM challenges WHERE id = ? AND status IN (?, ?)',
      [req.params.id, 'pending', 'accepted']
    )
    if (rows.length === 0) return res.json({ code: -1, error: '挑战不存在或已完成' })

    const challenge = rows[0]
    const isFrom = challenge.from_user_id === req.user.id
    const isTo = challenge.to_user_id === req.user.id

    if (!isFrom && !isTo) return res.json({ code: -1, error: '你不是挑战参与者' })

    const answersJson = JSON.stringify(answers)

    if (isFrom) {
      await pool.query(
        'UPDATE challenges SET from_answers = ?, status = IF(status = ?, ?, status) WHERE id = ?',
        [answersJson, 'pending', 'accepted', challenge.id]
      )
    } else {
      await pool.query(
        'UPDATE challenges SET to_answers = ? WHERE id = ?',
        [answersJson, challenge.id]
      )
    }

    // 检查双方是否都提交了答案
    const [updated] = await pool.query('SELECT * FROM challenges WHERE id = ?', [challenge.id])
    const c = updated[0]
    const fromAns = isFrom ? answers : (c.from_answers ? JSON.parse(c.from_answers) : null)
    const toAns = isTo ? answers : (c.to_answers ? JSON.parse(c.to_answers) : null)

    if (fromAns && toAns) {
      // 双方都提交了，计算结果
      const testKey = c.test_key
      let result = {}

      if (testKey === 'love') {
        // 答案是选项索引数组
        const matches = fromAns.reduce((cnt, ans, i) => cnt + (ans === toAns[i] ? 1 : 0), 0)
        const score = Math.round(matches / fromAns.length * 100)
        let comment
        if (score >= 80) comment = '天生一对！默契度爆表 💞'
        else if (score >= 60) comment = '高度合拍，继续培养感情 💖'
        else if (score >= 40) comment = '有戏！多沟通会更好 💗'
        else comment = '差异很大，但互补也是吸引力哦 💔'
        result = { score, match: matches, total: fromAns.length, comment }
      }

      // 通用计算：比较答案相似度
      if (testKey !== 'love') {
        const matches = fromAns.reduce((cnt, ans, i) => cnt + (ans === toAns[i] ? 1 : 0), 0)
        const score = Math.round(matches / fromAns.length * 100)
        result = { score, match: matches, total: fromAns.length }
      }

      await pool.query(
        'UPDATE challenges SET status = ?, result = ? WHERE id = ?',
        ['completed', JSON.stringify(result), challenge.id]
      )
    }

    res.json({ code: 0, message: '答案已提交' })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

// 获取结果
router.get('/:id/result', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*,
        u1.nickname AS from_nickname,
        u2.nickname AS to_nickname
      FROM challenges c
      JOIN users u1 ON c.from_user_id = u1.id
      JOIN users u2 ON c.to_user_id = u2.id
      WHERE c.id = ? AND (c.from_user_id = ? OR c.to_user_id = ?)
    `, [req.params.id, req.user.id, req.user.id])

    if (rows.length === 0) return res.json({ code: -1, error: '挑战不存在' })

    const c = rows[0]
    if (c.status !== 'completed') return res.json({ code: -1, error: '挑战尚未完成' })

    let result = {}
    try { result = JSON.parse(c.result || '{}') } catch (e) {}

    res.json({
      code: 0,
      result: {
        ...result,
        fromNickname: c.from_nickname,
        toNickname: c.to_nickname,
        testKey: c.test_key
      }
    })
  } catch (err) {
    res.json({ code: -1, error: err.message })
  }
})

module.exports = router
