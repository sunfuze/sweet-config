'use strict'
import test from 'ava'
import path from 'path'
import Config from '../src/config'

const factory = (filepath, options) => () => new Config(filepath, options)

test('file path should be string', t => {
  t.throws(factory(123))
})

test('file path should exist', t => {
  t.throws(factory('./fixtures/not-exist', { needFiles: true }))
})

test('getters', t => {
  const filepath = './fixtures/normal'
  const config = factory(filepath, { namespace: 'getters' })()
  t.true(config._paths.includes(path.resolve(__dirname, filepath)))
  t.is(config._envDir, 'env')
  t.is(config._nameSuffix, '')
  t.is(config._camelcase, false)
  t.is(config.namespace, 'getters')
  t.is(config.env, 'development')
  t.is(config.get('c.d.value'), 1)
  t.is(config.get('dev'), 1)
  t.pass()
})

test('name suffix', t => {
  const filepath = './fixtures/name-suffix'
  const config = factory(filepath, { nameSuffix: 'conf', namespace: 'name-suffix' })()
  t.is(config._nameSuffix, 'conf')
  t.deepEqual(config.get('session.cookie'), { maxAge: '1d' })
  t.pass()
})

test('env directory', t => {
  const filepath = './fixtures/env-dir'
  const config = factory(filepath, { envDir: 'testenv', namespace: 'env-dir' })()
  t.is(config.get('name'), 'dev')
  t.pass()
})

test('init from file', t => {
  const filepath = './fixtures/config.js'
  const config = factory(filepath)()
  t.is(config.get('name'), 'file-config')
  t.pass()
})

test('support env directory', t => {
  const filepath = './fixtures/env-directory'
  const config = factory(filepath)()
  t.is(config.get('application.type'), 'application')
  t.pass()
})

test('extend by file', t => {
  const filepath = './fixtures/normal'
  const config = factory(filepath)()
  config.extend('./fixtures/config.js', 'config')
  t.is(config.get('config.name'), 'file-config')
  config.extend('./fixtures/function.js', 'extend')
  t.deepEqual(config.get('extend.fn'), { a: 1, b: 2 })
  t.pass()
})

test('extend by directory', t => {
  const filepath = './fixtures/normal'
  const config = factory(filepath)()
  config.extend('./fixtures/extend', 'extend')
  t.is(config.get('extend.db.host'), 'localhost')
  t.deepEqual(config.get('extend.session.keys'), ['hello', 'session'])
  t.pass()
})

test('using absolute path', t => {
  const filepath = path.resolve(__dirname, './fixtures/normal')
  const conf1 = factory(filepath)()
  const conf2 = factory('./fixtures/normal')()
  t.is(conf1.toString(), conf2.toString())
  t.pass()
})

test('using options as first parameter', t => {
  const filepath = './fixtures/normal'
  const options = { filepath }
  const conf1 = factory(options)()
  const conf2 = factory(filepath)()
  t.is(conf1.toString(), conf2.toString())
  t.pass()
})

test('lazy config', t => {
  const conf = factory('./fixtures/function.js')()
  t.deepEqual(conf.get('fn'), { a: 1, b: 2 })
  t.pass()
})

test('get default value', t => {
  const conf = factory('./fixtures/normal')()
  t.is(conf.get('redis.host', 'localhost'), 'localhost')
  t.is(conf.get('redis.host'), 'localhost')
  t.pass()
})

test('set value', t => {
  const conf = factory('./fixtures/normal')()
  conf.set('foo', 'bar')
  t.is(conf.get('foo'), 'bar')
  t.pass()
})