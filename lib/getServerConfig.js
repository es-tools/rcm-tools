const webpackServe = require('webpack-serve')

/**
 * @param {object} webpackConfig - webpack配置
 * @param {object} config - 其它服务配置
 * */
function getServerConfig(webpackConfig, config = {}) {
  const options = {
    port: 3000,
    content: ['static'],
    publicPath: '/',
    ...config
  }
  webpackServe({}, {
    add: app => {
      // app.use()
    },
    config: webpackConfig,
    content: options.content,
    devMiddleware: {
      publicPath: options.publicPath, // 服务器根路径
      logTime: true,
      stats: 'minimal' // 只在发生错误 或是 新的编译时输出
    },
    host: '0.0.0.0',
    hotClient: {
      logLevel: 'warn'
    },
    port: options.port,
    open: process.argv.includes('open') && { path: '/' }
  })
}

module.exports = getServerConfig
