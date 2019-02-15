require('colors')
const digo = require('digo')
const path = require('path')
const { getEntries } = require('./utils/buildHelper')

// 文件目录
const root = process.cwd()
const ESBuild = path.resolve(root, './lib')
const template = path.resolve(root, './template') // 依赖项目的文件结构

// 为了将重制样式表与组件样式分离
exports.copyStyleToDist = () => {
  // 获取所有组件入口
  const entries = ((file) => {
    const entry = {}
    const paths = getEntries(file)
    for (const key in paths) {
      if (paths[key].baseName !== 'index') {
        entry[paths[key].baseName] = `./${paths[key].pathName}`
      }
    }
    return entry
  })('components')
  
  Object.keys(entries).map(key => {
    digo.src(`${template}/style/css.js`).dest(`${ESBuild}/${key}/style/`)
  })
}

/**
 * 创建一个组件模版，首字母大写,驼峰命名法
 * digo create Button | ListBox
 * 输出 > button | list-box
 * */
exports.create = () => {
  const options = digo.parseArgs()
  const page = options[1]
  if (!page) {
    digo.error('digo create 组件名 - 创建一个组件模版，首字母大写,驼峰命名法'.yellow)
    return
  }
  const filePath = page.split('')
    .map((str, key) => {
      if (!(str === str.toUpperCase()) || key === 0) return str.toLowerCase()
      return `-${str.toLowerCase()}`
    }).join('')
  
  digo.src(`${template}/Page`)
    .pipe(file => {
      let fileName = file.name
      if (fileName.includes('Page')) fileName = fileName.replace('Page', page)
      digo.writeFileIf(`./components/${filePath}/${fileName}`,
        digo.readFile(file.path).toString()
          .replace(/Page/g, page)
          .replace('$userName', process.env.USER)
      )
    })
}