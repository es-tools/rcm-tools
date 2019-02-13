// We should use `stats` props of webpack. But it not work in v4.
class CleanUpStatsPlugin {
  constructor(option) {
    this.option = {
      MiniCSSExtractPlugin: true,
      tsLoader: true,
      ...option
    }
  }
  
  shouldPickStatChild(child) {
    const { MiniCSSExtractPlugin } = this.option
    return !(MiniCSSExtractPlugin && child.name.includes('mini-css-extract-plugin'))
  }
  
  shouldPickWarning(message) {
    const { tsLoader } = this.option
    return !(tsLoader && /export .* was not found in .*/.test(message))
  }
  
  apply(compiler) {
    compiler.hooks.done.tap('CleanUpStatsPlugin', stats => {
      const { children, warnings } = stats.compilation
      if (Array.isArray(children)) {
        stats.compilation.children = children.filter(child => this.shouldPickStatChild(child))
      }
      if (Array.isArray(warnings)) {
        stats.compilation.warnings = warnings.filter(message => this.shouldPickWarning(message))
      }
    })
  }
}

module.exports = CleanUpStatsPlugin