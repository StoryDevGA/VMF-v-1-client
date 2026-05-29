export const DISCOVERY_ACQUISITION_PROFILES = Object.freeze({
  STANDARD: 'STANDARD',
  ENHANCED: 'ENHANCED',
  STRATEGIC: 'STRATEGIC',
})

export const DISCOVERY_ACQUISITION_PROFILE_OPTIONS = Object.freeze([
  { value: DISCOVERY_ACQUISITION_PROFILES.STANDARD, label: 'Standard Acquisition' },
  {
    value: DISCOVERY_ACQUISITION_PROFILES.ENHANCED,
    label: 'Enhanced Acquisition (Coming Soon)',
    disabled: true,
  },
  {
    value: DISCOVERY_ACQUISITION_PROFILES.STRATEGIC,
    label: 'Strategic Acquisition (Coming Soon)',
    disabled: true,
  },
])
