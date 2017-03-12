/**
 * Created by sunfuze on 10/03/2017.
 */
'use strict'
import test from 'ava'
import config from '../src/lib'


test('load get empty config', t =>{
  t.deepEqual(config.get('env'), process.env)
  t.pass()
})

test('create root, will extend raw root config', t => {
  let c = config.create('./fixtures/normal')
  t.is(c, config)
  t.is(c.get('a.value'), 1)
  t.pass()
})

test('create new config', t => {
  let c = config.create('./fixtures/normal', { namespace: 'normal' })
  t.is(c.get('a.value'), 1)
  t.pass()
})

test('select config', t => {
  let c = config.select('normal')
  t.is(c.get('a.value'), 1)
  t.pass()
})