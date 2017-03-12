'use strict'
import cluster from 'cluster'
import Config, { DEFAULT_NAMESPACE } from './config'
import eventBus from './eventBus'

const debug = require('debug')('sweet:config')

const isSYNC = (msg) => msg && msg.type === 'sweet:config:sync'

class ConfigManager {
  constructor () {
    this._configs = {}
    this._len = 0
    this._namespaces = []
    this._sync()
  }

  _sync () {
    // support cluster sync config updating
    eventBus.on('config.setting', config => {
      if (cluster.isWorker) {
        debug('sync changes of worker', cluster.worker.id)
        process.send({ cmd: 'sweet:config:sync', workerId: cluster.worker.id, data: config })
      } else if (cluster.isMaster) {
        const workers = cluster.workers
        Object.keys(workers).forEach(id => {
          workers[id].send({ cmd: 'sweet:config:sync', data: config })
        })
      }
    })

    if (cluster.isMaster) {
      for (let i in cluster.workers) {
        const w = cluster.workers[i]
        w.on('message', msg => {
          if (!isSYNC(msg)) {
            return
          }
          const config = this.select(msg.data.namespace)
          if (config) {
            config.set(msg.data.path, msg.data.value, false)
          }
          // master as an broker
          for (let j in cluster.workers) {
            if (j !== i) {
              cluster.workers[j].send(msg)
            }
          }
        })
      }
    }
    // message from master
    if (cluster.isWorker) {
      process.on('message', msg => {
        if (!isSYNC(msg)) {
          return
        }
        if (cluster.isMaster && Object.keys(cluster.workers).length) {
          process.send(msg)
        }
      })
    }

  }

  /**
   * select config by namespace
   * @param namespace
   * @returns {*}
   */
  select (namespace) {
    return this._configs[namespace]
  }

  /**
   * if config exist
   * @param namespace
   * @returns {boolean}
   */
  exists (namespace) {
    return !!this._configs[namespace]
  }

  /**
   * create config
   * @param {String} filepath - config path
   * @param {Object} [options] - options
   * @param {String} [options.envDir] - env related directory
   * like: 'env', which make config/env store the env configuration. Example: test/fixtures/env-prefix
   * @param {String} [options.nameSuffix] - config file name suffix. Example: test/fixtures/name-suffix
   * @param {String} [options.namespace] - config namespace
   * @param {Boolean} [options.camelcase] - make name camelCase
   */
  create (filepath, options = {}) {
    debug('manager namespaces:', this._namespaces)
    if (typeof filepath === 'object') {
      options = filepath
      filepath = options
    }
    let namespace = options.namespace
    let config
    if (!namespace) {
      console.warn(`Warning\n\tnamespace was not provided, using root`)
      namespace = DEFAULT_NAMESPACE
    }
    if (this.exists(namespace)) {
      console.warn(`Warning: config named ${namespace} is exist, your operation will extend it`)
      config = this.select(namespace)
      config.extend(filepath)
    } else {
      config = new Config(filepath, options)
      this._configs[namespace] = config
      this._namespaces.push(namespace)
      this._len ++
    }
    // create will overwrite namespace
    return config
  }
}

export default new ConfigManager()
