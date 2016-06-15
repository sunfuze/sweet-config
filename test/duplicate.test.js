import test from 'ava'
import config from '../src/lib'

test('duplicate load configuration should throw error', t => {
  config.load()
  t.throws(config.load)
})
