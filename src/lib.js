'use strict'
import path from 'path'
import { DEFAULT_NAMESPACE } from './config'
import manager from './manager'

const parent = module.parent
const parentFile = parent.filename
const parentDir = path.dirname(parentFile)
delete require.cache[__filename]

let config
if (manager.exists(DEFAULT_NAMESPACE)) {
  config = manager.select(DEFAULT_NAMESPACE)
} else {
  config = manager.create(path.join(process.cwd(), 'config'), DEFAULT_NAMESPACE)
}

config.select = function (namespace) {
  if (namespace === config.namespace) {
    return config
  }
  let c = manager.select('namespace')
  if (!c) {
    console.warn(`Warning: config ${namespace} is not exist, return ${DEFAULT_NAMESPACE} config`)
    c = config
  }
  return c
}

config.create = function (filepath, options = {}) {
  if (filepath.indexOf('/') !== 0) {
    filepath = path.resolve(parentDir, filepath)
  }
  return manager.create(filepath, options)
}

export default config