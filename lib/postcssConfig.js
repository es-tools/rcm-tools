module.exports = {
  // parser: 'postcss-scss',
  plugins: [
    require('postcss-px-to-viewport')({ // https://github.com/evrone/postcss-px-to-viewport
      viewportWidth: 1600, // 默认 1vw = viewportWidth / 100,转rem则需要1vw = 16
      viewportHeight: 1206,
      unitPrecision: 8,
      viewportUnit: 'rem',
      selectorBlackList: ['body'],
      minPixelValue: 8,
      mediaQuery: false
    }),
    require('cssnano')({
      preset: ['advanced', {
        zindex: false,
        normalizeUrl: false,
        autoprefixer: { add: true },
        discardComments: { removeAll: true }
      }]
    })
  ]
}