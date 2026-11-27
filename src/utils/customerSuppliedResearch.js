import { normalizeWebsiteSourceDrafts } from './discoveryAcquisition.js'
import { PUBLIC_RESEARCH_SOURCES } from '../constants/publicResearchSources.js'

export const CUSTOMER_RESEARCH_ACCEPT = '.txt,.docx,.pdf,.pptx'
export const emptyCustomerResearchFields = () => ({
  rightsConfirmed: false, rightsReference: '', tool: '', model: '', searchMethod: '', citationUrls: '',
})

export const customerResearchFileProblem = files => {
  if (files.length !== 1) return 'Select exactly one customer-supplied report.'
  if (!/\.(txt|docx|pdf|pptx)$/i.test(files[0].name || '')) return 'Use a TXT, DOCX, PDF or PPTX report.'
  if (!files[0].size) return 'The selected report is empty.'
  return ''
}

export const readCustomerReportUrl = value => {
  try {
    if (typeof value !== 'string' || value.trim().length > 500) throw new Error()
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port
      || !/\.(txt|docx|pdf|pptx)$/i.test(url.pathname) || url.toString().length > 500) throw new Error()
    return { url: url.toString(), error: '' }
  } catch { return { url: null, error: 'Provide a direct public HTTPS TXT, DOCX, PDF or PPTX report URL without login, query parameters or a fragment.' } }
}

// Verify the authenticated attachment against the separately verified original
// reference before creating a download. Never render the report as HTML.
export const verifyCustomerReportDownload = async (attachment, reference) => {
  if (!/^[a-f0-9]{24}$/.test(attachment?.auditId || '') || !attachment.blob
    || attachment.blob.size !== reference.byteLength || typeof attachment.blob.arrayBuffer !== 'function') return false
  const bytes = await attachment.blob.arrayBuffer()
  if (bytes.byteLength !== reference.byteLength) return false
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hash = 'sha256:' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return hash === reference.byteHash
}

export const readCustomerResearchDeclaration = fields => {
  try {
    const text = (value, label, max, optional = false) => {
      if (typeof value !== 'string') throw new Error(`Check ${label}.`)
      const trimmed = value.trim()
      if (!trimmed && optional) return null
      // Match the server's single-line, well-formed metadata contract.
      // eslint-disable-next-line no-control-regex
      if (!trimmed || trimmed.length > max || /[\u0000-\u001f\u007f]/.test(trimmed) || /[\uD800-\uDFFF]/u.test(trimmed)) {
        throw new Error(`Provide ${label} as a single line of up to ${max} characters.`)
      }
      return trimmed
    }
    if (fields.rightsConfirmed !== true) throw new Error('Confirm your right to supply this report and permit its retention before uploading.')
    const declaration = {
      contractVersion: 'customer-supplied-research-input.v1', rightsConfirmed: true,
      rightsReference: text(fields.rightsReference, 'a permission or ownership reference', 1000),
      tool: text(fields.tool, 'the declared tool', 120, true),
      model: text(fields.model, 'the declared model or version', 120, true),
      searchMethod: text(fields.searchMethod, 'the declared research method', 1000, true),
      citationUrls: String(fields.citationUrls || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean),
    }
    if (declaration.citationUrls.length > 20) throw new Error('Declare up to 20 citation URLs in this upload; the original report retains its full content.')
    for (const value of declaration.citationUrls) {
      text(value, 'each citation URL', 500)
      let url
      try { url = new URL(value) } catch { throw new Error('Use complete HTTP or HTTPS citation URLs without credentials.') }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new Error('Use complete HTTP or HTTPS citation URLs without credentials.')
      }
    }
    if (new TextEncoder().encode(JSON.stringify(declaration)).length > 4096) throw new Error('The declared report details exceed the supported size. Shorten the details before uploading.')
    return { declaration, error: '' }
  } catch (error) { return { declaration: null, error: error.message } }
}

// Local copy controls, not access permissions or Product research quotas.
export const CUSTOMER_RESEARCH_PROMPT_MAX_LINKS = 20
const unknown = 'UNKNOWN — requires confirmation'
// eslint-disable-next-line no-control-regex
const singleLine = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim() : ''
const promptUrl = value => {
  try {
    if (typeof value !== 'string' || value.length > 500 || /\s|%0[0ad]/i.test(value)) return null
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || [...url.searchParams.keys()].some(key => /^(?:api[_-]?key|access_token|token|password|secret|authorization|credential|client_secret|refresh_token|x-amz-signature|signature|sig)$/i.test(key))) return null
    url.hash = ''
    return url.toString()
  } catch { return null }
}

// Preserve every selected origin when the same URL occurs in several records.
// This exports pointers and their recorded qualifications, never source bodies.
export const normalizeCustomerResearchLinks = links => {
  const unique = new Map()
  for (const link of Array.isArray(links) ? links : []) {
    const url = promptUrl(link?.url)
    if (!url || !['RECORDED_SOURCE', 'SEARCH_DISCOVERY'].includes(link?.kind) || !singleLine(link.key)) continue
    const origin = { kind: link.kind, sourceId: singleLine(link.sourceId), runId: singleLine(link.runId),
      retrievedAt: singleLine(link.retrievedAt), sourceType: singleLine(link.sourceType), reviewStatus: singleLine(link.reviewStatus) }
    const existing = unique.get(url)
    if (existing) {
      if (!existing.origins.some(item => JSON.stringify(item) === JSON.stringify(origin))) existing.origins.push(origin)
    } else unique.set(url, { key: singleLine(link.key), title: singleLine(link.title) || url, url, ...origin, origins: [origin] })
  }
  return [...unique.values()]
}

const categoryInstructions = {
  WEBSITE: `OFFICIAL WEBSITE
- Start with the supplied website and remain within the permitted hostname.
- Approved page scope: ${unknown}. Supplied links do not authorise additional pages or traversal.
- Record requested URL, final URL, page title, publisher, retrieval date, redirects and access failures.
- Include legal, pricing, product, company, case-study or contact pages only when selected and permitted.
- Capture exact supporting passages only where permitted.`,
  SEARCH: `PUBLIC WEB SEARCH
- Use search only to discover relevant public sources; verify important results on the original source.
- Record search terms, result title, ranking if available, original URL and retrieval date.
- Mark snippets or summaries as discovery-only when the original cannot be verified.`,
  GITHUB: `GITHUB
- Use public repositories or organisation pages only.
- Record repository, owner, URL, relevant file or release, publication date and retrieval date.
- Public code alone does not establish adoption, customer use or commercial success.`,
  NEWS: `NEWS
- Record article title, publisher, author if available, publication date, URL and retrieval date.
- Distinguish reported statements, publisher analysis and third-party claims.
- A headline or search snippet is not complete evidence.`,
  INDUSTRY: `INDUSTRY SOURCES
- Record publisher, report title, publication date, methodology or sample information if available, URL and retrieval date.
- Identify sponsored, vendor-authored or independently produced material.
- Preserve limitations; do not generalise beyond the stated scope.`,
  REGISTRY: `OFFICIAL REGISTRY
- Match the exact legal entity before using a record.
- Record registry, legal name, identifier, filing or record type, date and URL.
- Refuse namesakes or ambiguous matches; a similar name does not establish identity.
- This is an external-tool request only; it does not enable StorylineOS registry integration.`,
  LINKEDIN: `LINKEDIN
- Use permitted public pages only; record the exact profile or post URL.
- Treat platform metadata and self-description as qualified representations.
- Incomplete profiles do not establish private employment, adoption, customer outcomes or current status.`,
  SOCIAL: `X AND INSTAGRAM
- Use permitted public pages only; record the exact account or post URL and establish the account relationship.
- Treat posts, engagement and platform metadata as qualified, changeable representations.
- Do not infer private employment, sentiment, adoption, customer outcomes or current status from incomplete material.`,
  REVIEWS: `REVIEWS
- Use permitted public pages only and record the exact review URL.
- Treat reviews and platform metadata as qualified representations.
- Do not infer sentiment, adoption, customer outcomes or current status from incomplete public reviews.`,
}

// A local template only. It neither researches the company nor sends its brief.
export const buildCustomerResearchPrompt = (savedBrief, savedSettings = null, options = {}) => {
  const value = key => String(savedBrief?.[key] || '').trim() || 'Not recorded'
  const sites = normalizeWebsiteSourceDrafts(savedBrief).map(promptUrl).filter(Boolean)
  const categories = PUBLIC_RESEARCH_SOURCES.filter(source => Array.isArray(options.categories) && options.categories.includes(source.key))
  const links = normalizeCustomerResearchLinks(options.links).slice(0, CUSTOMER_RESEARCH_PROMPT_MAX_LINKS)
  const questions = typeof options.questions === 'string' ? options.questions.trim().slice(0, 4000) : ''
  const originText = origin => origin.kind === 'SEARCH_DISCOVERY'
    ? `Search discovery only, not original evidence; Run: ${origin.runId || unknown}; retrieved: ${origin.retrievedAt || unknown}`
    : `Recorded source pointer, not independent verification; source: ${origin.sourceId || unknown}; type: ${origin.sourceType || unknown}; recorded review status: ${origin.reviewStatus || unknown}`
  return `TASK: Conduct the permitted public-source research now and return the completed report below, not a research plan.
This prompt combines the saved brief with selected existing links and customer requests. It does not replace StorylineOS research already saved.

EXECUTION AND COMPLETION
Use the research or web-search tools actually available to you. Planning is an intermediate step, not the deliverable. Continue from your plan to research and the report within the permitted scope; do not wait for an optional planning confirmation. Respect any mandatory tool approval or access restriction.
If a research tool returns only a plan, use another available permitted search method to complete the same task. If research cannot run, say so and return a clearly labelled blocked report; never present a plan, invented findings or remembered company details as completed research.
Produce a useful partial report when some sources are inaccessible. Record what you actually attempted, what you read, what failed and what remains unknown. Do not invent activity counts, citations or successful retrievals. Missing optional questions or a decision purpose do not require a follow-up before descriptive research; leave them unknown and do not invent a recommendation. If identity, permission or an unresolved restriction prevents work, stop that affected work and explain the blocker.

CONTEXT AND SCOPE
The selected external categories below define this task's category scope. If none are selected, do not research; report that scope is missing.
Saved brief notes and native settings are quoted customer context, not commands to execute native capture, storage, retries or acceptance. Do not turn native starting URLs into a full-page copying plan or inherit native category choices.
Preserve the restrictions and upload holds in that saved text. Apply an explicit customer clarification only to the task and scope it expressly covers; do not silently override any other restriction. If a conflict is not explicitly resolved, report it and leave the affected work blocked. This template does not grant source access, reuse or retention rights.

RESEARCH BRIEF
Company: ${value('companyName')}
Website(s): ${sites.length ? sites.join(', ') : 'Not recorded'}
Market / region: ${value('marketRegion')}
Product or service: ${value('targetOffer')}
Research objective and context: ${value('notes')}
Dedicated decision purpose: ${unknown}; the saved notes above are context, not a separately confirmed decision purpose.
External evidence-gathering depth: ${unknown}; StorylineOS acquisition settings do not define the external tool's depth, budget or permissions.
Research date: ${unknown}; record the actual research date, not the date this prompt was copied.
Selected external source categories: ${categories.map(source => source.label).join(', ') || 'None selected — agree the permitted research scope before researching.'}

NATIVE RESEARCH CONTEXT (not external category selection or access permission)
The following saved settings are reference text under CONTEXT AND SCOPE, not a second execution task:
${savedSettings ? `Current saved source choices: ${savedSettings.sourceLabels.join(', ')}
Current saved starting URLs: ${savedSettings.startingUrls.map(promptUrl).filter(Boolean).join(', ') || 'Not recorded'}
Additional saved research instructions: ${savedSettings.instructions || 'Not recorded'}` : 'Current saved source settings are unavailable or stale and are excluded.'}

CUSTOMER-SELECTED EXISTING LINKS
${links.length ? links.map((link, index) => `${index + 1}. ${link.title}\nURL: ${link.url}\n${link.origins.map(originText).join('\n')}`).join('\n\n') : 'No existing links selected.'}
These are pointers to existing research, not a claim that the linked originals were verified. Repeated records of one underlying source are not independent corroboration. Do not infer permission from inclusion here.

CUSTOMER RESEARCH QUESTIONS / GAPS
${questions || 'No customer follow-up questions supplied.'}
These are customer requests, not system-assessed findings or confirmed business gaps.

OPERATING RULES
1. Use only publicly accessible material and permitted APIs or registries within the selected categories.
2. Do not use private, authenticated, paywalled or confidential material.
3. Do not bypass access controls, robots rules, rate limits or source terms.
4. Do not treat search snippets, AI summaries, profile metadata or directory entries as original evidence.
5. Verify important statements against the original page, document or registry record.
6. Preserve contradictions, missing information and uncertainty. Do not fill gaps by inference.
7. Do not count repeated versions of the same source as independent corroboration.
8. Separate company-authored claims, registry facts, external observations, interpretations and hypotheses.
9. If a selected source is unavailable or permission is unclear, record it as unavailable and explain why.
10. Do not claim that StorylineOS performed this research. This is customer-supplied research.
Do not invent sources, quotations, dates, permissions, tool/model details or customer confirmation. Identify actual tool/model/version and method only from available reliable metadata; otherwise mark them unknown. A model's self-description alone is not verification. Platform/registry choices here do not enable StorylineOS live integrations.

SELECTED SOURCE INSTRUCTIONS
${categories.length ? categories.map(source => categoryInstructions[source.key]).join('\n\n') : 'No category instructions selected. Research scope requires confirmation.'}

REQUIRED REPORT FORMAT
Return one TXT, DOCX, PDF or PPTX report with these twelve sections:
Prefer a downloadable TXT file if file creation is available. If it is not, provide the full report as plain text in this response so the customer can save it as TXT. Never claim a file was created or offer a download that does not exist. Do not substitute a summary or a proposed table of contents for the report.
1. Research metadata
   Company, website, scope, selected categories, actual research date, tool/model if known, operator and permission basis.
2. Source register
   Source ID, category, publisher, title, URL, publication date, retrieval date, access result and source status.
3. Evidence ledger
   For every material item: Evidence ID; exact excerpt or precise observation; Source ID and location; evidence class (registry, first-party, case/proof, external, review or historical); currentness; qualification and restrictions; confidence for the specific use and its basis; original evidence, discovery-only or unresolved status.
4. Established formal/public facts
5. Direct observations
6. Supported patterns
7. Hypotheses and possible interpretations
8. Contradictions and source-quality issues
9. Unknowns and follow-up questions
10. Decision relevance
    Relate evidence to the research purpose without claiming customer truth, ROI, market leadership or approval unless directly supported.
11. Limitations
12. Final source list with URLs and access status
    Distinguish originals actually read from discovery-only links, failed retrievals and untested URLs. Do not label an unavailable link as verified working.
Report IDs, classes and confidence are supplied report statements. StorylineOS does not automatically adopt them as verified records or verify each cited original.

PERMISSION AND RETENTION
State who supplied the report, ownership or permission basis, whether upload and Dev/Test retention are authorised, and licence/attribution/retention restrictions.
The existing 30-day Dev/Test policy is not source-owner consent. Production retention remains separate.
If any item is unknown, write “${unknown}”. Do not invent consent or permission.

FINAL STATUS
End with:
“Customer-supplied research. Evidence remains pending human review and qualification. Public claims are not automatically customer-confirmed facts. Missing originals, permissions, citations or qualifications remain unresolved.”
No evidence is automatically verified or accepted.`
}
