import path from 'path'
import fs from 'fs'
import requireDir from 'require-dir'
import property from 'lodash.property'

const debug = require('debug')('sweet:config')

let parent = module.parent
let parentFile = parent.filename
let parentDir = path.dirname(parentFile)
delete require.cache[__filename]

class Config {
  constructor (filepath) {
    if (!filepath) {
      filepath = path.join(parentDir, 'config')
    }

    if (filepath.indexOf('.') === 0) {
      filepath = path.resolve(parentDir, filepath)
    }

    debug(`load configuration from ${filepath}`)

    this._path = filepath
    this._data = {}
    this._lazyCache = {}
    this._data.env = process.env.NODE_ENV || 'development'

    const stat = fs.lstatSync(filepath)

    if (stat.isFile()) {
      Object.assign(this._data, this._loadFile(filepath))
    }

    if (stat.isDirectory()) {
      Object.assign(this._data, this._loadEnvConfiguration(path.join(filepath, 'env', this._data.env + '.js')))
      this._loadDir(filepath)
    }

    // configuration from process env will override some configuration in file
    Object.assign(this._data, process.env)

  }

  all () {
    return this._data
  }

  path () {
    return this._path
  }

  get (name, defaultValue = undefined) {
    let value = property(name)(this._data)
    return value
      ? value
      : defaultValue
  }

  set (name, defaultValue) {
    if (this._data.hasOwnProperty(name)) {
      debug(`change configuration ${name}`)
    }
    this._data[name] = defaultValue
  }

  _loadFile (filepath) {
    debug('load configuration from file', filepath)
    let configuration = require(filepath)
    return configuration.default || configuration
  }

  _loadEnvConfiguration (filepath) {
    let stat = fs.lstatSync(filepath)
    if (stat.isFile()) {
      let config = require(filepath)
      return config.default || config
    } else {
      return {}
    }
  }

  _loadDir (filepath) {
    debug(`load configuration from directory ${filepath}`)
    const files = fs.readdirSync(filepath)
    const cache = this._lazyCache
    const loadFile = this._loadFile

    debug('files:', files)
    files.forEach(file => {
      let ext = path.extname(file)
      let name = path.basename(file, ext)

      if (ext === '' && name === 'env') return

      debug(`set lazy get configuration from file ${file}`)
      Object.defineProperty(this._data, name, {
        enumrable: true,
        get () {
          if (!cache[name]) {
            let modulePath = path.join(filepath, file)
            debug('modul path', modulePath)
            let stat = fs.lstatSync(modulePath)
            if (stat.isFile()) {
              cache[name] = loadFile(modulePath)
            } else if (stat.isDirectory()) {
              cache[name] = requireDir(modulePath)
            } else {
              console.warn(`can't load configuration from ${modulePath}, not file or directory`)
              cache[name] = {}
            }
          }
          debug('configuration of %s is %j', name, cache[name])
          return cache[name]
        },
        set (value) {
          cache[name] = value
        }
      })

    })
  }
}

function travelObject (obj, target) {

}

function isRequireExt (ext) {
  return ~require.extensions.indexOf(ext)
}

export default {
  load (filepath) {
    if (this._config) {
      throw Error(`duplicate load configuration, old: ${this._config.path}`)
    }
    this._config = new Config(filepath)
    this._isReady = true
  },
  get (name, defaultValue) {
    return this._config.get(name, defaultValue)
  },
  set (name, value) {
    return this._config.set(name, value)
  },
  all () {
    return this._config.all()
  },
  get isReady () {
    return !!this._isReady
  },
  _checkLoad () {
    return !!this._config
  }
}
