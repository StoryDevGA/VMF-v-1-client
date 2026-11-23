import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, symlinkSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { buildRelease } from './build-release.mjs'

function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'release copy '))
  t.after(() => rmSync(base, { recursive: true, force: true }))
  const rootDir = join(base, 'client source')
  const releaseRoot = join(base, 'release root')
  const destination = join(releaseRoot, 'DEV-client-v1')
  mkdirSync(join(rootDir, 'dist', 'assets'), { recursive: true })
  mkdirSync(destination, { recursive: true })
  writeFileSync(join(destination, '.htaccess'), 'existing hosting rules')
  writeFileSync(join(destination, 'old.js'), 'old release')
  const build = ({ env }) => {
    writeFileSync(join(rootDir, 'dist', 'index.html'), '<script src="assets/app.js"></script>')
    writeFileSync(join(rootDir, 'dist', 'assets', 'app.js'), 'new build')
    writeFileSync(join(rootDir, 'dist', 'version.json'), JSON.stringify({ environment: env.BUILD_ENV }))
  }
  return { rootDir, releaseRoot, destination, build }
}

test('copies fresh output with spaces in paths, removes stale assets and preserves hosting rules', t => {
  const f = fixture(t)
  buildRelease({ ...f, environment: 'dev', build: options => {
    assert.equal(options.cwd, f.rootDir)
    assert.equal(options.env.BUILD_ENV, 'dev')
    f.build(options)
  } })
  assert.equal(existsSync(join(f.destination, 'old.js')), false)
  assert.equal(readFileSync(join(f.destination, '.htaccess'), 'utf8'), 'existing hosting rules')
  for (const file of ['index.html', 'version.json', 'assets/app.js']) {
    const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
    assert.equal(hash(join(f.destination, file)), hash(join(f.rootDir, 'dist', file)))
  }
})

test('build failure leaves release untouched', t => {
  const f = fixture(t)
  assert.throws(() => buildRelease({ ...f, environment: 'dev', build: () => { throw new Error('build failed') } }), /build failed/)
  assert.equal(readFileSync(join(f.destination, 'old.js'), 'utf8'), 'old release')
})

test('missing destination and unknown environment fail before building', t => {
  const f = fixture(t)
  const build = () => assert.fail('must not build')
  assert.throws(() => buildRelease({ ...f, environment: 'staging', build }), /ENOENT/)
  assert.throws(() => buildRelease({ ...f, environment: '../dev', build }), /Expected environment/)
})

test('incomplete or wrong-environment output leaves release untouched', t => {
  const f = fixture(t)
  assert.throws(() => buildRelease({ ...f, environment: 'dev', build: () => {} }), /ENOENT/)
  f.build({ env: { BUILD_ENV: 'local' } })
  assert.throws(() => buildRelease({ ...f, environment: 'dev', build: () => {} }), /environment does not match/)
  assert.equal(readFileSync(join(f.destination, 'old.js'), 'utf8'), 'old release')
})

test('overlapping source and release destination are rejected before building', t => {
  const f = fixture(t)
  assert.throws(() => buildRelease({ ...f, rootDir: f.releaseRoot, environment: 'dev', build: () => assert.fail('must not build') }), /overlaps/)
  assert.equal(readFileSync(join(f.destination, 'old.js'), 'utf8'), 'old release')
})

test('redirected destination and symbolic links in output cannot affect other folders', t => {
  const f = fixture(t)
  f.build({ env: { BUILD_ENV: 'dev' } })
  symlinkSync(f.destination, join(f.rootDir, 'dist', 'assets', 'outside'), 'junction')
  assert.throws(() => buildRelease({ ...f, environment: 'dev', build: () => {} }), /symbolic link/)
  assert.equal(readFileSync(join(f.destination, 'old.js'), 'utf8'), 'old release')
  unlinkSync(join(f.rootDir, 'dist', 'assets', 'outside'))
  rmSync(f.destination, { recursive: true })
  const other = join(f.releaseRoot, 'other')
  mkdirSync(other)
  writeFileSync(join(other, 'keep.txt'), 'untouched')
  symlinkSync(other, f.destination, 'junction')
  assert.throws(() => buildRelease({ ...f, environment: 'dev', build: () => assert.fail('must not build') }), /direct directory/)
  assert.equal(readFileSync(join(other, 'keep.txt'), 'utf8'), 'untouched')
})
