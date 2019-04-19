const {
  appendFile, constants, copyFile, link, lstat, mkdir, readdir, readFile, readlink, realpath, rename, rmdir, stat,
  Stats, symlink, unlink, writeFile
} = require('fs')
const { dirname, join } = require('path')

/** 表示一个文件系统 */
module.exports.FileSystem = class FileSystem {

  /**
   * 获取文件或文件夹的属性，如果是链接则返回链接实际引用的文件属性
   * @param path 要获取的路径
   */
  getStat(path) {
    return new Promise((resolve, reject) => {
      stat(path, (error, stats) => {
        if (error) {
          reject(error)
        }
        else {
          resolve(stats)
        }
      })
    })
  }

  /**
   * 获取文件或文件夹的属性，如果是链接则返回链接本身的文件属性
   * @param path 要获取的路径
   */
  getLinkStat(path) {
    return new Promise((resolve, reject) => {
      lstat(path, (error, stats) => {
        if (error) {
          reject(error)
        }
        else {
          resolve(stats)
        }
      })
    })
  }

  /**
   * 判断指定的文件是否存在
   * @param path 要判断的路径
   */
  async existsFile(path) {
    try {
      return (await this.getStat(path)).isFile()
    }
    catch (e) {
      if (e.code === 'ENOENT') {
        return false
      }
      throw e
    }
  }

  /**
   * 判断指定的文件夹是否存在
   * @param path 要判断的路径
   */
  async existsDir(path) {
    try {
      return (await this.getStat(path)).isDirectory()
    }
    catch (e) {
      if (e.code === 'ENOENT') {
        return false
      }
      throw e
    }
  }

  /**
   * 删除指定的文件夹
   * @param path 要删除的文件夹路径
   * @param recursive 是否删除所有所有子文件夹和文件，如果为 `false` 则只删除空文件夹
   * @returns 返回删除的文件数
   */
  deleteDir(path, recursive = true) {
    return new Promise((resolve, reject) => {
      rmdir(path, error => {
        if (error) {
          switch (error.code) {
            case 'ENOENT':
              resolve(0)
              break
            case 'ENOTEMPTY':
            case 'EEXIST':
              if (recursive) {
                this.cleanDir(path).then(result => {
                  this.deleteDir(path, false).then(() => {
                    resolve(result)
                  }).catch(reject)
                }, () => {
                  reject(error)
                })
              }
              else {
                reject(error)
              }
              break
            default:
              reject(error)
              break
          }
        }
        else {
          resolve(0)
        }
      })
    })
  }

  /**
   * 清空指定的文件夹
   * @param path 要清空的文件夹路径
   * @returns 返回删除的文件数
   */
  cleanDir(path) {
    return new Promise((resolve, reject) => {
      safeCall(readdir, [path], (error, entries) => {
        if (error) {
          if (error.code === 'ENOENT') {
            resolve(0)
          }
          else {
            reject(error)
          }
        }
        else {
          let pending = entries.length
          if (pending) {
            let count = 0
            for (const entry of entries) {
              const child = join(path, entry)
              lstat(child, async (error, stats) => {
                if (error) {
                  reject(error)
                }
                else {
                  try {
                    if (stats.isDirectory()) {
                      const childCount = await this.deleteDir(child)
                      count += childCount
                    }
                    else {
                      await this.deleteFile(child)
                      count++
                    }
                  }
                  catch (e) {
                    reject(e)
                  }
                }
                if (--pending < 1) {
                  resolve(count)
                }
              })
            }
          }
          else {
            resolve(0)
          }
        }
      })
    })
  }

  /**
   * 如果父文件夹是空文件夹则删除
   * @param path 文件夹内的文件路径
   * @returns 如果删除成功则返回 `true`，否则说明文件夹不空，返回 `false`
   */
  deleteParentDirIfEmpty(path) {
    const parent = dirname(path)
    if (parent === path) {
      return Promise.resolve(false)
    }
    return new Promise(resolve => {
      rmdir(parent, error => {
        if (error) {
          resolve(false)
        }
        else {
          this.deleteParentDirIfEmpty(parent).then(() => {
            resolve(true)
          })
        }
      })
    })
  }

  /**
   * 删除指定的文件
   * @param path 要删除的文件路径
   * @returns 如果删除成功则返回 `true`，否则说明文件不存在，返回 `false`
   */
  deleteFile(path) {
    return new Promise((resolve, reject) => {
      unlink(path, error => {
        if (error) {
          switch (error.code) {
            case 'ENOENT':
              resolve(false)
              break
            default:
              reject(error)
              break
          }
        }
        else {
          resolve(true)
        }
      })
    })
  }
}