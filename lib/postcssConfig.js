module.exports = {
  parser: require('postcss-scss'),
  syntax: require('postcss-scss'),
  plugins: [
    require('postcss-import'),
    require('precss'),
    require('postcss-preset-env'),
    require('postcss-sass-color-functions'),
    require('postcss-map-get'),
    require('postcss-px-to-viewport')({
      viewportWidth: 3200, // 默认 1vw = viewportWidth / 100,转rem则需要1vw = 16
      viewportHeight: 1206,
      unitPrecision: 8,
      viewportUnit: 'rem',
      fontViewportUnit: 'rem',
      selectorBlackList: ['body', 'html', '#rsg-root'],
      minPixelValue: 8,
      mediaQuery: false
    }),
    require('cssnano')({
      preset: ['advanced', {
        zindex: false,
        reduceIdents: false,
        normalizeUrl: false,
        autoprefixer: { add: true },
        discardComments: { removeAll: true }
      }]
    })
  ]
}