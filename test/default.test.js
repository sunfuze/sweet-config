import test from 'ava'
import config from '../src/lib.js'

test('load default path', t => {
  t.is(config.get('a').value, 1)
  t.is(config.get('a.value'), 1)
  t.is(config.get('b').value, 1)
  t.is(config.get('b.value'), 1)
  t.is(config.get('c').d.value, 1)
  t.is(config.get('c.d').value, 1)
  t.is(config.get('c.d.value'), 1)
  t.is(config.get('dev'), 1)
})
