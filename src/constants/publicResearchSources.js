export const PUBLIC_RESEARCH_SOURCES = Object.freeze([
  { key: 'WEBSITE', label: 'Official website', boundary: 'Public representation, not independent proof of outcomes.' },
  { key: 'SEARCH', label: 'Public web search', boundary: 'Discovery only; snippets and AI summaries are not source evidence.' },
  { key: 'REGISTRY', label: 'Official corporate registry', boundary: 'Legal identity and supported filings, not commercial validation.' },
  { key: 'GITHUB', label: 'GitHub', boundary: 'Public code does not establish adoption or customer outcomes.' },
  { key: 'LINKEDIN', label: 'LinkedIn', boundary: 'Public profiles and hiring signals remain qualified representations.' },
  { key: 'SOCIAL', label: 'X and Instagram', boundary: 'Public account relationships must be established; posts and engagement can change.' },
  { key: 'NEWS', label: 'News', boundary: 'Reporting needs attribution, publication dates and supporting originals.' },
  { key: 'REVIEWS', label: 'Reviews', boundary: 'Reviewer statements are attributed claims, not verified customer outcomes.' },
  { key: 'INDUSTRY', label: 'Industry sources', boundary: 'Market context does not establish facts about the target company.' },
])
