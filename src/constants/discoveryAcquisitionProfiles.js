export const DISCOVERY_ACQUISITION_PROFILES = Object.freeze({
  STANDARD: 'STANDARD',
  ENHANCED: 'ENHANCED',
  STRATEGIC: 'STRATEGIC',
})

export const DISCOVERY_ACQUISITION_PROFILE_OPTIONS = Object.freeze([
  { value: DISCOVERY_ACQUISITION_PROFILES.STANDARD, label: 'Standard Acquisition' },
  {
    value: DISCOVERY_ACQUISITION_PROFILES.ENHANCED,
    label: 'Enhanced Acquisition',
  },
  {
    value: DISCOVERY_ACQUISITION_PROFILES.STRATEGIC,
    label: 'Strategic Acquisition (Coming Soon)',
    disabled: true,
  },
])

export const DISCOVERY_ACQUISITION_PROFILE_GUIDANCE = Object.freeze({
  [DISCOVERY_ACQUISITION_PROFILES.STANDARD]: {
    summary: 'Good for quick discovery.',
    minimumRecommendedInputs: [
      'Website URL',
      'Company name',
      'Product / offer',
      'Notes or document',
    ],
    additionalUsefulInputs: [
      'Market / region',
      'Uploaded document',
    ],
  },
  [DISCOVERY_ACQUISITION_PROFILES.ENHANCED]: {
    summary: 'Best for customer-ready VMF work.',
    minimumRecommendedInputs: [
      'Website URL',
      'Company name',
      'Product / offer',
      'Notes or document',
    ],
    additionalUsefulInputs: [
      'Product pages',
      'Sales deck',
      'Customer proof',
      'Case studies',
      'Discovery notes',
    ],
  },
  [DISCOVERY_ACQUISITION_PROFILES.STRATEGIC]: {
    summary: 'Best for board-level or strategic outputs.',
    minimumRecommendedInputs: [
      'Website URL',
      'Company name',
      'Product / offer',
      'Notes or document',
    ],
    additionalUsefulInputs: [
      'Market evidence',
      'Competitor information',
      'Economic or ROI evidence',
      'Investor material',
      'Customer proof',
      'Strategic notes',
    ],
  },
})
