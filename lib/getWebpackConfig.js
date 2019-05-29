const { getProjectPath, resolve, injectRequire } = require('./utils/projectHelper')

injectRequire()
process.traceDeprecation = true // Show warning for webpack

// Normal requirement
const digo = require('digo')
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
    libraries: [], // 多包名处理
    modules: false, // 其它babel模块
    styleGlobal: [],
    babelConfig: {},
    postcssConfig: {},
    webpackConfig: {},
    ...props
  }
  const pkg = require(getProjectPath('package.json'))
  const libraries = [pkg.name, ...options.libraries]
  const babelConfig = webpackMerge(require('./getBabelCommonConfig')(options.modules), options.babelConfig)
  babelConfig.plugins.push(...libraries.map(library => [
    resolve('babel-plugin-import'),
    {
      libraryName: library,
      libraryDirectory: 'components',
      style: name => {
        switch (name) {
          // 排除工具库的样式导入
          case `${library}/components/tools`:
            return false
          default:
            return `${name}/style/`
        }
      }
    },
    library
  ]))

  const config = webpackMerge({
    devtool: 'source-map',

    output: {
      path: getProjectPath('./dist/'),
      filename: '[name].js'
    },

    resolve: {
      alias: libraries.reduce((prev, next) => ({ [next]: process.cwd(), ...prev }), {}),
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.scss', '.css'],
      modules: ['node_modules', getProjectPath('../node_modules')]
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
              options: { ...postcssConfig, sourceMap: true, ...options.postcssConfig }
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
      new WebpackBar(),
      new CleanUpStatsPlugin(),
      new CaseSensitivePathsPlugin()
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
        libraries.forEach(library => {
          externals[`${library}/components/${name}`] = `../${name}`
        })
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