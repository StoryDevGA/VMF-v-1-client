import { spawnSync } from 'node:child_process'
import { cpSync, lstatSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultReleaseRoot = 'C:/Users/garya/OneDrive/Documents/StoryLineOS/VMF-APP/release-v1'
const folders = { dev: 'DEV-client-v1', staging: 'STAGING-client-v1', prod: 'PROD-client-v1' }

function runBuild({ cwd, env }) {
  if (!process.env.npm_execpath) throw new Error('Run this command through npm run build:dev, build:staging or build:prod.')
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'build', '--', '--mode', 'production'], {
    cwd, env, stdio: 'inherit', shell: false,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Build failed (${result.status ?? result.signal}); copy skipped.`)
}

function contains(parent, child) {
  const path = relative(parent, child)
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`))
}

function validateTree(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) throw new Error(`Build output contains a symbolic link: ${path}`)
    if (stat.isDirectory()) validateTree(path)
    else if (!stat.isFile()) throw new Error(`Unsupported build output: ${path}`)
  }
}

export function buildRelease({ environment, rootDir = clientRoot, releaseRoot = defaultReleaseRoot, build = runBuild }) {
  if (!Object.hasOwn(folders, environment)) throw new Error('Expected environment: dev, staging or prod.')
  const releasePath = realpathSync(releaseRoot)
  const destination = realpathSync(join(releaseRoot, folders[environment]))
  if (dirname(destination) !== releasePath || basename(destination) !== folders[environment] || !lstatSync(destination).isDirectory()) {
    throw new Error('Release destination must be a direct directory inside the release root.')
  }
  const root = realpathSync(rootDir)
  if (contains(root, destination) || contains(destination, root)) throw new Error('Release destination overlaps the client source.')

  console.log(`[release] Building ${environment}; destination: ${destination}`)
  build({ cwd: root, env: { ...process.env, BUILD_ENV: environment } })

  const source = realpathSync(join(root, 'dist'))
  if (source !== join(root, 'dist')) throw new Error('Build output must not redirect outside dist.')
  if (!lstatSync(join(source, 'index.html')).isFile() || !lstatSync(join(source, 'assets')).isDirectory()) {
    throw new Error('Incomplete build output; copy skipped.')
  }
  validateTree(source)
  const version = JSON.parse(readFileSync(join(source, 'version.json'), 'utf8'))
  if (version.environment !== environment) throw new Error('Build environment does not match release; copy skipped.')
  // Recheck the exact destination after the build and before deleting anything.
  if (realpathSync(join(releaseRoot, folders[environment])) !== destination) throw new Error('Release destination changed during build.')
  for (const entry of readdirSync(destination)) {
    // Match the legacy shell glob: retain root dotfiles such as the hosting .htaccess.
    if (!entry.startsWith('.')) rmSync(join(destination, entry), { recursive: true, force: true })
  }
  cpSync(source, destination, { recursive: true })
  console.log(`[info] Build succeeded; ${environment} copy complete: ${destination}`)
  return destination
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: npm run build:dev (or build:staging / build:prod)')
    buildRelease({ environment: process.argv[2] })
  } catch (error) {
    console.error(`[error] ${error.message}`)
    process.exitCode = 1
  }
}
