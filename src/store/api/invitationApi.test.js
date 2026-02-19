import { describe, it, expect } from 'vitest'
import {
  invitationApi,
  useListInvitationsQuery,
  useLazyListInvitationsQuery,
  useCreateInvitationMutation,
  useGetInvitationQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from './invitationApi.js'

describe('invitationApi', () => {
  it('exposes invitation endpoints', () => {
    expect(invitationApi.endpoints).toHaveProperty('listInvitations')
    expect(invitationApi.endpoints).toHaveProperty('createInvitation')
    expect(invitationApi.endpoints).toHaveProperty('getInvitation')
    expect(invitationApi.endpoints).toHaveProperty('resendInvitation')
    expect(invitationApi.endpoints).toHaveProperty('revokeInvitation')
  })

  it('exports query hooks', () => {
    expect(typeof useListInvitationsQuery).toBe('function')
    expect(typeof useLazyListInvitationsQuery).toBe('function')
    expect(typeof useGetInvitationQuery).toBe('function')
  })

  it('exports mutation hooks', () => {
    expect(typeof useCreateInvitationMutation).toBe('function')
    expect(typeof useResendInvitationMutation).toBe('function')
    expect(typeof useRevokeInvitationMutation).toBe('function')
  })
})
