const fs = require('fs')
const path = require('path')
const glob = require('glob')

module.exports = {
  /**
   * 首字母转大写
   * @param {string} str 需要转化的字符
   * */
  stringFirstToUpper: str => {
    return str[0].toUpperCase() + str.slice(1)
  },

  /**
   * 移除字符'-'，并将'-'后的字符转为大写
   * @param {string} str 需要转化的字符
   * */
  stringMinusToUpper: str => {
    if(!str.includes('-')) return str
    const index = str.indexOf('-')
    let name = str.replace('-', '')
    name = name.slice(0, index) + name[index].toUpperCase() + name.slice(index + 1)
    return module.exports.stringMinusToUpper(name)
  },

  /**
   * 路径内资源解析
   * @param pathname {string} - 路径
   * @param type {string} - 文件类型
   * */
  getEntries: (pathname, type = '*') => {
    let pathDir = pathname
    let baseName // 文件名
    let entry // 文件完整路径
    let extName // 文件格式
    let dirName // 传入的文件夹路径
    let pathName // 文件夹路劲

    const files = glob.sync(`${pathname}/${type}`)
    const entries = {}
    for (const i in files) {
      entry = files[i]
      extName = path.extname(entry)
      dirName = path.dirname(entry)
      baseName = path.basename(entry, extName)
      pathName = path.normalize(path.join(dirName, baseName))
      pathDir = path.normalize(pathDir)

      entries[pathName] = {
        entry,
        extName,
        dirName,
        baseName,
        pathDir,
        pathName
      }
    }
    return entries
  },

  /**
   * 删除文件目录
   * @param path {string} - 文件路径
   * */
  removeFiles: path => {
    if (fs.existsSync(path)) {
      const files = fs.readdirSync(path)

      files.forEach(function (file) {
        const curPath = path + '/' + file

        if (fs.statSync(curPath).isDirectory()) {
          module.exports.removeFiles(curPath)
        }
        else {
          fs.unlinkSync(curPath)
        }
      })
      fs.rmdirSync(path)
    }
  }
}
