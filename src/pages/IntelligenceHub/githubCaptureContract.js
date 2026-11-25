// Mirror the API-owned pinned root-README identity; this grants no access.
export const readGithubCapture = value => {
  const fields = ['contractVersion', 'owner', 'repository', 'path', 'commit']
  if (!value || Array.isArray(value) || Object.keys(value).length !== fields.length
    || !fields.every(key => Object.hasOwn(value, key))
    || value.contractVersion !== 'public-research-github-capture.v1'
    || typeof value.owner !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(value.owner)
    || typeof value.repository !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(value.repository)
    || ['.', '..'].includes(value.repository) || value.path !== 'README.md'
    || typeof value.commit !== 'string' || !/^[a-f0-9]{40}$/.test(value.commit)) return null
  return value
}
export const githubCaptureRequestUrl = value => readGithubCapture(value)
  ? `https://api.github.com/repos/${value.owner}/${value.repository}/contents/${value.path}?ref=${value.commit}` : null
export const githubCaptureCanonicalUrl = value => readGithubCapture(value)
  ? `https://github.com/${value.owner}/${value.repository}/blob/${value.commit}/${value.path}` : null
