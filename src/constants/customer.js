/**
 * Customer domain constants
 *
 * Topology → VMF policy defaults used when creating new customers.
 * Extracted from UI components to keep business rules centralised.
 *
 * @module constants/customer
 */

export const DEFAULT_VMF_POLICY = {
  SINGLE_TENANT: 'SINGLE',
  MULTI_TENANT: 'PER_TENANT_SINGLE',
}
