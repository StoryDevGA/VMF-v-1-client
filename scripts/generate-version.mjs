import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = process.cwd()
const packageJsonPath = resolve(rootDir, 'package.json')
const publicDir = resolve(rootDir, 'public')
const versionFilePath = resolve(publicDir, 'version.json')

function runGit(command, fallback = 'unknown') {
  try {
    return execSync(command, { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim() || fallback
  } catch {
    return fallback
  }
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function getBuildNumber(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join('') + '.' + [
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join('')
}

const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
const now = new Date()
const buildNumber = getBuildNumber(now)
const commit = runGit('git rev-parse --short HEAD')
const branch = runGit('git rev-parse --abbrev-ref HEAD')
const baseVersion = pkg.version || '0.0.0'
const fullVersion = `${baseVersion}+${buildNumber}.${commit}`
const environment = (process.env.BUILD_ENV || 'local').toLowerCase()

const metadata = {
  version: baseVersion,
  buildNumber,
  commit,
  branch,
  environment,
  builtAt: now.toISOString(),
  fullVersion,
}

mkdirSync(publicDir, { recursive: true })
writeFileSync(versionFilePath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')

console.log(`Generated ${versionFilePath}`)
console.log(`Version: ${fullVersion}`)
