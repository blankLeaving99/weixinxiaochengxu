const express = require('express')
const cors = require('cors')
const pool = require('./config/db')

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api', require('./routes/user'))
app.use('/api/test', require('./routes/test'))
app.use('/api/friends', require('./routes/friend'))
app.use('/api/achievements', require('./routes/achievement'))
app.use('/api/points', require('./routes/points'))
app.use('/api/mood', require('./routes/mood'))
app.use('/api/daily', require('./routes/daily'))
app.use('/api/settings', require('./routes/settings'))

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ code: 0, status: 'ok', db: 'connected' })
  } catch (err) {
    res.json({ code: -1, status: 'error', db: 'disconnected', error: err.message })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 性格测试服务器已启动: http://localhost:${PORT}`)
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`)
})
