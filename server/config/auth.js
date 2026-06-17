/**
 * 认证配置
 * 优先从环境变量读取，未设置则使用默认值（开发模式）
 */

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  console.error('❌ JWT_SECRET 环境变量未设置，拒绝启动')
  process.exit(1)
}

module.exports = {
  // JWT 密钥
  jwtSecret: jwtSecret || 'dev_secret_key_for_local_testing',
  // JWT 过期时间
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // 开发模式：跳过微信 code2session，直接用 code 生成 openid
  // 生产环境设置环境变量 DEV_MODE=false
  devMode: process.env.DEV_MODE === 'true',

  // 微信小程序配置
  wx: {
    appId: process.env.WX_APPID || 'YOUR_APPID',
    secret: process.env.WX_SECRET || 'YOUR_SECRET'
  }
}
