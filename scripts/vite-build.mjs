import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cwd = process.cwd()

function parseEnvFile(fileName) {
  const filePath = resolve(cwd, fileName)
  if (!existsSync(filePath)) return {}

  const content = readFileSync(filePath, 'utf8')
  const parsed = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const cleanLine = line.startsWith('export ')
      ? line.slice('export '.length)
      : line
    const eqIndex = cleanLine.indexOf('=')
    if (eqIndex <= 0) continue

    const key = cleanLine.slice(0, eqIndex).trim()
    let value = cleanLine.slice(eqIndex + 1).trim()

    // Drop inline comments for unquoted values.
    if (
      !(value.startsWith('"') || value.startsWith("'")) &&
      value.includes(' #')
    ) {
      value = value.split(' #')[0].trim()
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (key) parsed[key] = value
  }

  return parsed
}

function readCliMode(argv) {
  const modeFlagIndex = argv.findIndex((arg) => arg === '--mode')
  if (modeFlagIndex === -1) return ''

  const modeValue = argv[modeFlagIndex + 1]
  return modeValue?.trim() || ''
}

function normalizeMode(value) {
  const lower = String(value || '').trim().toLowerCase()
  if (!lower) return ''
  if (lower === 'dev') return 'development'
  if (lower === 'prod') return 'production'
  return lower
}

const cliArgs = process.argv.slice(2)
const cliMode = normalizeMode(readCliMode(cliArgs))
const envModeHint = normalizeMode(process.env.BUILD_MODE || process.env.BUILD_ENV)
const requestedMode = cliMode || envModeHint || 'production'
const safeMode = /^[\w-]+$/.test(requestedMode) ? requestedMode : 'production'

const envBase = parseEnvFile('.env')
const envMode = parseEnvFile(`.env.${safeMode}`)
const envModeLocal = parseEnvFile(`.env.${safeMode}.local`)
const envDevelopment = parseEnvFile('.env.development')
const envProduction = parseEnvFile('.env.production')

const explicitBuildUrl = process.env.BUILD_VITE_API_URL?.trim()
const explicitRuntimeUrl = process.env.VITE_API_URL?.trim()

const resolutionCandidates = [
  { value: explicitBuildUrl, source: 'BUILD_VITE_API_URL (shell)' },
  { value: explicitRuntimeUrl, source: 'VITE_API_URL (shell)' },
  { value: envModeLocal.VITE_API_URL, source: `.env.${safeMode}.local` },
  { value: envMode.VITE_API_URL, source: `.env.${safeMode}` },
  { value: envProduction.VITE_API_URL, source: '.env.production (fallback)' },
  { value: envDevelopment.VITE_API_URL, source: '.env.development (fallback)' },
  { value: envBase.VITE_API_URL, source: '.env (fallback)' },
]

const matchedCandidate = resolutionCandidates.find((entry) => Boolean(entry.value))
const resolvedApiUrl = matchedCandidate?.value || ''
const source = matchedCandidate?.source || 'unresolved'

if (resolvedApiUrl) {
  // Setting process env before invoking Vite ensures dotenv files do not override it.
  process.env.VITE_API_URL = resolvedApiUrl
}

console.log(`[build] mode=${safeMode}`)
if (resolvedApiUrl) {
  console.log(`[build] VITE_API_URL=${resolvedApiUrl} (${source})`)
} else {
  console.warn('[build] VITE_API_URL unresolved; Vite fallback behavior will apply.')
}

const child = spawn(`npx vite build --mode ${safeMode}`, {
  cwd,
  env: process.env,
  stdio: 'inherit',
  shell: true,
})

child.on('error', (error) => {
  console.error('[build] failed to start vite build')
  console.error(error)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
