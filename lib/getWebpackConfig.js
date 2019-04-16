const { getProjectPath, resolve, injectRequire } = require('./utils/projectHelper')
injectRequire()
process.traceDeprecation = true // Show warning for webpack

// Normal requirement
const digo = require('digo')
const path = require('path')
const webpack = require('webpack')
const webpackMerge = require('webpack-merge')
const WebpackBar = require('webpackbar')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const postcssConfig = require('./postcssConfig')
const { getEntries, removeFiles } = require('./utils/buildHelper')
const CleanUpStatsPlugin = require('./utils/CleanUpStatsPlugin')

function getWebpackConfig(props = {}) {
  const options = {
    modules: false, // 其它babel模块
    styleGlobal: [],
    babelConfig: {},
    webpackConfig: {},
    ...props
  }
  const pkg = require(getProjectPath('package.json'))
  const babelConfig = webpackMerge(require('./getBabelCommonConfig')(options.modules), options.babelConfig)
  babelConfig.plugins.push([
    resolve('babel-plugin-import'),
    {
      libraryName: pkg.name,
      libraryDirectory: 'components',
      style: name => {
        switch (name) {
          case `${pkg.name}/components/tools`:
            return false
          default:
            return `${name}/style/`
        }
      }
    }
  ])
  
  const config = webpackMerge({
    devtool: 'source-map',
    
    output: {
      path: getProjectPath('./dist/'),
      filename: '[name].js'
    },
    
    resolve: {
      alias: { [pkg.name]: process.cwd() },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.scss', '.css'],
      modules: ['node_modules', path.join(__dirname, '../node_modules')]
    },
    
    module: {
      noParse: [/moment.js/],
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: babelConfig
            }
          ]
        },
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: babelConfig
            },
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true
              }
            }
          ]
        },
        {
          test: /\.(s?css)$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true
              }
            },
            {
              loader: 'postcss-loader',
              options: Object.assign({}, postcssConfig, { sourceMap: true })
            },
            ...(options.styleGlobal.length ? [{
              loader: 'sass-resources-loader',
              options: {
                sourceMap: true,
                resources: options.styleGlobal
              }
            }] : [])
          ]
        },
        {
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000,
                minetype: 'image/svg+xml'
              }
            }
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif)(\?v=\d+\.\d+\.\d+)?$/i,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000
              }
            }
          ]
        }
      ]
    },
    
    plugins: [
      new CaseSensitivePathsPlugin(),
      new CleanUpStatsPlugin(),
      new WebpackBar()
    ],
    
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
          uglifyOptions: {
            warnings: false
          }
        })
      ]
    },
    
    performance: {
      hints: false
    }
  }, options.webpackConfig)
  
  // 打包生产包
  if (process.env.RUN_ENV === 'PROD') {
    removeFiles('./dist')
    const entry = ['./index']
    
    // Common config
    config.externals = {
      react: {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react'
      },
      'react-dom': {
        root: 'ReactDOM',
        commonjs2: 'react-dom',
        commonjs: 'react-dom',
        amd: 'react-dom'
      }
    }
    config.output = {
      path: getProjectPath('./dist/'),
      filename: '[name].js',
      library: pkg.name,
      libraryTarget: 'umd'
    }
    
    // Development
    const uncompressedConfig = webpackMerge({}, config, {
      entry: {
        [pkg.name]: entry
      },
      mode: 'development',
      plugins: [
        new MiniCssExtractPlugin({
          filename: '[name].css'
        })
      ]
    })
    
    // Production
    const prodConfig = webpackMerge({}, config, {
      entry: {
        [`${pkg.name}.min`]: entry
      },
      mode: 'production',
      plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
        new webpack.LoaderOptionsPlugin({
          minimize: true
        }),
        new MiniCssExtractPlugin({
          filename: '[name].css'
        })
      ]
    })
    
    return [prodConfig, uncompressedConfig]
  }
  
  if (({ BUNDLE: 1, ES: 2 })[process.env.RUN_ENV]) {
    removeFiles('./lib')
    digo.exec('digo copyStyleToDist')
    const paths = getEntries('components')
    const entry = {}
    const externals = {}
    for (const key in paths) {
      let name = paths[key].baseName
      if (name !== 'index') {
        entry[name] = `./${paths[key].pathName}`
        externals[`${pkg.name}/components/${name}`] = `../${name}`
      }
    }
    
    // Common config
    config.output = {
      path: getProjectPath('./lib/'),
      filename: '[name]/index.js',
      libraryTarget: 'umd'
    }
    config.externals = {
      react: {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react'
      },
      'react-dom': {
        root: 'ReactDOM',
        commonjs2: 'react-dom',
        commonjs: 'react-dom',
        amd: 'react-dom'
      },
      ...externals
    }
    
    // Development
    const uncompressedConfig = webpackMerge({}, config, {
      entry,
      mode: 'development',
      plugins: [
        new MiniCssExtractPlugin({
          filename: '[name]/style/index.css'
        })
      ]
    })
    
    // 静态资源分析
    if (process.env.RUN_ENV === 'BUNDLE') {
      uncompressedConfig.plugins.push(new BundleAnalyzerPlugin({
        analyzerPort: 8081
      }))
    }
    
    return [uncompressedConfig]
  }
  
  return config
}

getWebpackConfig.webpack = webpack

module.exports = getWebpackConfig