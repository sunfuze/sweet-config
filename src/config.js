'use strict'
import fs from 'fs'
import path from 'path'
import assert from 'assert'
import set from 'lodash.set'
import property from 'lodash.property'
import eventBus from './eventBus'

const debug = require('debug')('sweet:config')

const parent = module.parent
const parentFile = parent.filename
const parentDir = path.dirname(parentFile)
delete require.cache[__filename]

export const DEFAULT_NAMESPACE = 'default'

const absolutePath = (filepath) => {
  if (filepath.indexOf('/') === 0) {
    return filepath
  } else {
    return path.resolve(parentDir, filepath)
  }
}

class Config {
  /**
   * @constructor
   * @param {String} filepath - config path
   * @param {Object} [options] - options
   * @param {String} [options.envDir] - env related directory
   * like: 'env', which make config/env store the env configuration. Example: test/fixtures/env-prefix
   * @param {String} [options.nameSuffix] - config file name suffix. Example: test/fixtures/name-suffix
   * @param {String} [options.namespace] - config namespace
   * @param {Boolean} [options.camelcase] - make name camelCase
   * @param {Boolean] [options.needFiles] - should have file in constructor
   */
  constructor (filepath, options = {}) {
    if (typeof filepath === 'object') {
      options = filepath
      filepath = options.filepath
    }

    this._envDir = options.envDir || 'env'
    this._nameSuffix = options.nameSuffix || ''
    this._namespace = options.namespace || DEFAULT_NAMESPACE
    this._camelcase = options.camelcase || false
    this._needFiles = options.needFiles || false
    this._store = {}
    this._paths = []
    this._bus = eventBus
    process.env.NODE_ENV = process.env.NODE_ENV || 'development'
    this._store.env = process.env

    filepath = absolutePath(filepath)
    debug(`new config, namespace: ${this._namespace}, path: ${filepath}`)

    const existsFilePath = fs.existsSync(filepath)

    if (!existsFilePath) {
      if (this._needFiles) {
        assert(existsFilePath, 'config path should exist')
      } else {
        console.warn(`Warning: ${filepath} is not exists, config[${this._namespace}] is empty`)
      }
    } else {
      const stat = fs.statSync(filepath)
      assert(stat.isFile() || stat.isDirectory(), 'config path should be file or directory')
      this._paths.push(filepath)

      if (stat.isFile()) {
        this._fromFile(filepath)
      } else {
        this._fromDirectory(filepath)
      }
    }
  }

  extend (filepath, prefix = '') {
    filepath = absolutePath(filepath)

    if (this._paths.includes(filepath)) {
      console.warn(`Warning: config[${this._namespace}] has loaded ${filepath} before`)
      return this
    }

    assert(fs.existsSync(filepath), `config.extend error, ${filepath} is not exist`)
    this._paths.push(filepath)
    let obj
    if (prefix) {
      obj = property(prefix)(this._store)
    } else {
      obj = this._store
    }
    if (!obj && prefix) {
      obj = {}
      if (prefix) set(this._store, prefix, obj)
    }
    // const name = this._formatName(filepath)
    const padding = this._extendFrom(filepath)

    debug('extend content:', padding)
    Object.assign(obj, padding)
    // if (obj[name]) {
    //   assert(typeof padding === 'object', `${prefix}.${name} is exist, so ${filepath} should return object`)
    //   Object.assign(obj[name], padding)
    // } else {
    //   obj[name] = padding
    // }
    return this
  }

  /**
   * get NODE_ENV, default is development
   * @returns {String} NODE_ENV
   */
  get env () {
    return this.get('env.NODE_ENV')
  }

  /**
   * get namespace of config
   * @returns {String}
   */
  get namespace () {
    return this._namespace
  }

  /**
   * get config by name
   * @param {String} property path, like: a.b.c
   * @param {Any}
   */
  get (name, value) {
    let val = property(name)(this._store)
    if (typeof val === 'function') {
      // lazy load function configuration
      val = val()
      debug('lazy get', name)
      this.set(name, val)
    }
    if (!val && value) {
      val = value
      debug(`${name} is not exist, set value:`, value)
      this.set(name, value)
    }
    return val
  }

  /**
   * set name of property
   * @param {String} name
   * @param {Any} value
   * @returns {Config}
   */
  set (name, value, emit = true) {
    set(this._store, name, value)
    if (emit) {
      debug('emit setting', name)
      this._bus.emit('config.setting', {
        path: name,
        value: value,
        namespace: this._namespace
      })
    }
    return this
  }

  toString () {
    return `
    namespace: ${this._namespace}
    paths loaded: ${this._paths.join(',')}
    config: ${JSON.stringify(this._store, null, '\t')}
`
  }

  /**
   * init config from file
   * @param file
   * @returns {Object}
   * @private
   */
  _fromFile(file) {
    debug('init from file')
    const config = this._loadModule(file)
    assert(typeof config === 'object', 'initialization file should return object')
    Object.assign(this._store, this._loadModule(file))
  }

  /**
   * init config from directory
   * @param directory
   * @private
   */
  _fromDirectory(directory) {
    debug('init from directory')
    const bases = this._requireDir(directory, { excludes: [this._envDir] })
    debug('config:', bases)
    Object.assign(this._store, bases)
    Object.assign(this._store, this._loadEnvDirectory(path.join(directory, this._envDir)))
  }

  _extendFrom (filepath) {
    if (fs.statSync(filepath).isFile()) {
      return this._loadModule(filepath)
    } else {
      return this._requireDir(filepath)
    }
  }

  /**
   * init env configuration
   * @param {String} directory
   * @returns {Object} env configuration
   * @private
   */
  _loadEnvDirectory (directory) {
    if (!fs.existsSync(directory)) {
      return {}
    }

    const env = this.env
    const configDir = path.join(directory, env)
    debug('load env configuration from', configDir)

    let config = {}
    if (fs.existsSync(configDir) && fs.statSync(configDir).isDirectory()) {
      config = this._requireDir(configDir)
    } else if (fs.existsSync(configDir + '.js')) {
      config = this._loadModule(configDir + '.js')
    } else if (fs.existsSync(configDir + '.json')) {
      config = this._loadModule(configDir + '.json')
    }
    return config
  }

  _loadModule(file) {
    debug('load:', file)
    const mod = require(file)
    return mod.default || mod
  }

  _formatName(file) {
    let ret
    ret = path.basename(file)
    if (this._nameSuffix) ret = ret.replace(`.${this._nameSuffix}`, '')
    ret = ret.replace(path.extname(ret), '')
    return this._camelcase
      ? toCamelCase(ret)
      : ret
  }

  // fork from module `require-dir`
  _requireDir (dir, { excludes = [] } = {}) {
    debug('read directory:', dir)
    excludes = ['node_modules'].concat(excludes)
    debug('excludes:', excludes)
    const files = fs.readdirSync(dir)

    const filesForBase = files.reduce((filesForBase, file) => {
      const ext = path.extname(file)
      const base = path.basename(file, ext)
      if (excludes.indexOf(base) === -1) {
        ;(filesForBase[base] = filesForBase[base] || []).push(file)
      }
      return filesForBase
    }, {})

    const result = {}

    for (let base in filesForBase) {
      if (!filesForBase.hasOwnProperty(base)) {
        continue
      }
      const prop = this._formatName(base)
      const files = filesForBase[base]
      const filesMinusDirs = {}

      for (let  i = 0; i < files.length; i ++) {
        const file = files[i]
        const filepath = path.resolve(dir, file)

        if (filepath === parentFile) {
          continue
        }

        if (fs.statSync(filepath).isDirectory()) {
          result[prop] = this._requireDir(filepath)
        } else {
          filesMinusDirs[file] = filepath
        }
      }

      if (result[prop]) {
        continue
      }

      for (let ext in require.extensions) {
        if (!require.extensions.hasOwnProperty(ext)) {
          continue;
        }

        const filepath = filesMinusDirs[base + ext]
        if (filepath) {
          result[prop] = this._loadModule(filepath)
        }
      }
    }
    return result
  }
}

function toCamelCase(str) {
  return str.replace(/[_-][a-z]/ig, function (s) {
    return s.substring(1).toUpperCase();
  });
}

export default Config