const { getProjectPath, resolve, injectRequire } = require('./utils/projectHelper')

injectRequire()

// Show warning for webpack
process.traceDeprecation = true

// Normal requirement
const path = require('path')
const webpack = require('webpack')
const webpackMerge = require('webpack-merge')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const postcssConfig = require('./getPostcssConfig')
const { getEntries, removeFiles } = require('./utils/buildHelper')
const CleanUpStatsPlugin = require('./utils/CleanUpStatsPlugin')

function getWebpackConfig(modules) {
  const pkg = require(getProjectPath('package.json'))
  const babelConfig = require('./getBabelCommonConfig')(modules || false)
  
  babelConfig.plugins.push([
    resolve('babel-plugin-import'),
    {
      style: true,
      libraryName: pkg.name,
      libraryDirectory: 'components'
    }
  ])
  
  const config = {
    devtool: 'source-map',
    
    output: {
      path: getProjectPath('./dist/'),
      filename: '[name].js'
    },
    
    resolve: {
      modules: ['node_modules', path.join(__dirname, '../node_modules')],
      extensions: [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.json'
      ],
      alias: {
        [pkg.name]: process.cwd()
      }
    },
    
    module: {
      noParse: [/moment.js/],
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: resolve('babel-loader'),
              options: babelConfig
            }
          ]
        },
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: resolve('babel-loader'),
              options: babelConfig
            },
            {
              loader: resolve('ts-loader'),
              options: {
                transpileOnly: true
              }
            }
          ]
        },
        {
          test: /\.(css)$/,
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
            }
          ]
        },
        
        {
          test: /\.less$/,
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
            {
              loader: resolve('less-loader'),
              options: {
                javascriptEnabled: true,
                sourceMap: true
              }
            }
          ]
        },
        
        // Images
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
      new CleanUpStatsPlugin()
    ],
    
    performance: {
      hints: false
    }
  }
  
  // 打包生产包
  if (process.env.RUN_ENV === 'PROD' || process.env.RUN_ENV === 'BUNDLE') {
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
    config.optimization = {
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
      ],
      optimization: {
        minimizer: []
      }
    })
    
    // 静态资源分析
    if (process.env.RUN_ENV === 'BUNDLE') {
      prodConfig.plugins.push(new BundleAnalyzerPlugin({
        analyzerPort: 8081
      }))
      return [prodConfig]
    }
    
    return [prodConfig, uncompressedConfig]
  }
  
  if (process.env.RUN_ENV === 'ES') {
    removeFiles('./es')
    require('digo').exec('digo copyStyleToDist')
    const paths = getEntries('components')
    const entry = {}
    for (const key in paths) {
      if (paths[key].baseName !== 'index') {
        entry[paths[key].baseName] = `./${paths[key].pathName}`
      }
    }
    // Common config
    config.output = {
      path: getProjectPath('./es/'),
      filename: '[name]/index.js'
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
      }
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
    
    return [uncompressedConfig]
  }
  
  return config
}

getWebpackConfig.webpack = webpack

module.exports = getWebpackConfig