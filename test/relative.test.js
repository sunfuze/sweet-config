import test from 'ava'
import config from '../src/lib.js'

test('load relative path', t => {
  config.load('./config')
  t.is(config.get('a').value, 1)
  t.is(config.get('a.value'), 1)
  t.is(config.get('b').value, 1)
  t.is(config.get('b.value'), 1)
  t.is(config.get('c').d.value, 1)
  t.is(config.get('c.d').value, 1)
  t.is(config.get('c.d.value'), 1)
  t.is(config.get('dev'), 1)
})
