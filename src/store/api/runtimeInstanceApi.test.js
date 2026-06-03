import { describe, expect, it } from 'vitest'
import {
  buildAcceptRuntimeDiscoveryQuery,
  buildAcceptRuntimeSectionQuery,
  buildCreateRuntimeInstanceQuery,
  buildExecuteRuntimeActionQuery,
  buildMutateRuntimeStateQuery,
  buildRuntimeInstanceDetailQuery,
  buildRuntimeInstanceListQuery,
  buildRuntimeEvidenceQuery,
  buildRuntimeRendererQuery,
  buildResetRuntimeDiscoveryQuery,
  buildReviewRuntimeDiscoveryEvidenceQuery,
  buildReviewRuntimeSectionEvidenceQuery,
  buildUpdateRuntimeDiscoveryInputsQuery,
  buildUpdateRuntimeSectionEvidenceQuery,
  DEFAULT_RUNTIME_INSTANCE_TYPE,
  getAcceptRuntimeDiscoveryInvalidationTags,
  getAcceptRuntimeSectionInvalidationTags,
  getCreateRuntimeInstanceInvalidationTags,
  getExecuteRuntimeActionInvalidationTags,
  getMutateRuntimeStateInvalidationTags,
  getRuntimeInstanceDetailTags,
  getRuntimeInstanceListTags,
  getRuntimeRendererTags,
  getResetRuntimeDiscoveryInvalidationTags,
  getReviewRuntimeDiscoveryEvidenceInvalidationTags,
  getReviewRuntimeSectionEvidenceInvalidationTags,
  getUpdateRuntimeDiscoveryInputsInvalidationTags,
  getUpdateRuntimeSectionEvidenceInvalidationTags,
  runtimeInstanceApi,
  runtimeInstanceListTag,
  useAcceptRuntimeDiscoveryMutation,
  useAcceptRuntimeSectionMutation,
  useCreateRuntimeInstanceMutation,
  useExecuteRuntimeActionMutation,
  useGetRuntimeEvidenceQuery,
  useGetRuntimeInstanceQuery,
  useGetRuntimeRendererQuery,
  useListRuntimeInstancesQuery,
  useMutateRuntimeStateMutation,
  useResetRuntimeDiscoveryMutation,
  useReviewRuntimeDiscoveryEvidenceMutation,
  useReviewRuntimeSectionEvidenceMutation,
  useUpdateRuntimeSectionEvidenceMutation,
  useUpdateRuntimeDiscoveryInputsMutation,
} from './runtimeInstanceApi.js'

describe('runtimeInstanceApi', () => {
  it('registers expected endpoint definitions', () => {
    expect(runtimeInstanceApi.endpoints).toHaveProperty('listRuntimeInstances')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('createRuntimeInstance')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeInstance')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('getRuntimeRenderer')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('mutateRuntimeState')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('updateRuntimeDiscoveryInputs')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('acceptRuntimeDiscovery')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('resetRuntimeDiscovery')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('reviewRuntimeDiscoveryEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('updateRuntimeSectionEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('reviewRuntimeSectionEvidence')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('acceptRuntimeSection')
    expect(runtimeInstanceApi.endpoints).toHaveProperty('executeRuntimeAction')
  })

  it('exports runtime instance hooks', () => {
    expect(typeof useListRuntimeInstancesQuery).toBe('function')
    expect(typeof useCreateRuntimeInstanceMutation).toBe('function')
    expect(typeof useGetRuntimeInstanceQuery).toBe('function')
    expect(typeof useGetRuntimeEvidenceQuery).toBe('function')
    expect(typeof useGetRuntimeRendererQuery).toBe('function')
    expect(typeof useMutateRuntimeStateMutation).toBe('function')
    expect(typeof useUpdateRuntimeDiscoveryInputsMutation).toBe('function')
    expect(typeof useAcceptRuntimeDiscoveryMutation).toBe('function')
    expect(typeof useResetRuntimeDiscoveryMutation).toBe('function')
    expect(typeof useReviewRuntimeDiscoveryEvidenceMutation).toBe('function')
    expect(typeof useUpdateRuntimeSectionEvidenceMutation).toBe('function')
    expect(typeof useReviewRuntimeSectionEvidenceMutation).toBe('function')
    expect(typeof useAcceptRuntimeSectionMutation).toBe('function')
    expect(typeof useExecuteRuntimeActionMutation).toBe('function')
  })

  it('exposes endpoint initiate functions', () => {
    expect(typeof runtimeInstanceApi.endpoints.listRuntimeInstances.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.createRuntimeInstance.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeInstance.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.getRuntimeRenderer.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.mutateRuntimeState.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.updateRuntimeDiscoveryInputs.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.acceptRuntimeDiscovery.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.resetRuntimeDiscovery.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.reviewRuntimeDiscoveryEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.updateRuntimeSectionEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.reviewRuntimeSectionEvidence.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.acceptRuntimeSection.initiate).toBe('function')
    expect(typeof runtimeInstanceApi.endpoints.executeRuntimeAction.initiate).toBe('function')
  })

  it('builds the list query with the required runtime instance filters', () => {
    expect(buildRuntimeInstanceListQuery({
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      runtimeType: 'VALUE_NARRATIVE',
      q: 'Northwind',
      status: 'ACTIVE',
      page: 2,
      pageSize: 25,
    })).toBe(
      '/runtime-instances?customerId=cust-1&tenantId=tenant-1&runtimeType=VALUE_NARRATIVE&q=Northwind&status=ACTIVE&page=2&pageSize=25',
    )
  })

  it('builds create and detail runtime instance requests', () => {
    const body = {
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      runtimeType: 'VALUE_NARRATIVE',
      frameworkPackageId: 'pkg-1',
      name: 'Northwind Value Narrative',
    }

    expect(buildCreateRuntimeInstanceQuery({ body })).toEqual({
      url: '/runtime-instances',
      method: 'POST',
      body,
    })
    expect(buildRuntimeInstanceDetailQuery({ runtimeInstanceId: 'value-narrative-001' }))
      .toBe('/runtime-instances/value-narrative-001')
    expect(buildRuntimeInstanceDetailQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001')
    expect(buildRuntimeRendererQuery({ runtimeInstanceId: 'value-narrative-001' }))
      .toBe('/runtime-instances/value-narrative-001/renderer')
    expect(buildRuntimeRendererQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/renderer')
    expect(buildRuntimeEvidenceQuery({ runtimeInstanceId: 'value narrative/001' }))
      .toBe('/runtime-instances/value%20narrative%2F001/evidence')
    expect(buildMutateRuntimeStateQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        operation: 'WRITE',
        value: 'Updated problem',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/data',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        operation: 'WRITE',
        value: 'Updated problem',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildExecuteRuntimeActionQuery({
      runtimeInstanceId: 'value narrative/001',
      actionKey: 'SUBMIT_FOR_REVIEW',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/actions/SUBMIT_FOR_REVIEW',
      method: 'POST',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildUpdateRuntimeDiscoveryInputsQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        inputs: {
          companyName: 'Acme',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/discovery-inputs',
      method: 'PATCH',
      body: {
        inputs: {
          companyName: 'Acme',
        },
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildAcceptRuntimeDiscoveryQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/discovery-acceptance',
      method: 'PATCH',
      body: {
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildResetRuntimeDiscoveryQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        confirmReset: true,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'USER_REQUESTED_DISCOVERY_RESET',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/discovery-reset',
      method: 'PATCH',
      body: {
        confirmReset: true,
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
        reason: 'USER_REQUESTED_DISCOVERY_RESET',
      },
    })
    expect(buildReviewRuntimeDiscoveryEvidenceQuery({
      runtimeInstanceId: 'value narrative/001',
      evidenceObjectId: 'evidence/company',
      body: {
        reviewStatus: 'REJECTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/discovery-evidence/evidence%2Fcompany/review',
      method: 'PATCH',
      body: {
        reviewStatus: 'REJECTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildUpdateRuntimeSectionEvidenceQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        documentSources: [
          { fileName: 'value-notes.md', textContent: 'Value evidence.' },
        ],
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/section-evidence',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        documentSources: [
          { fileName: 'value-notes.md', textContent: 'Value evidence.' },
        ],
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildReviewRuntimeSectionEvidenceQuery({
      runtimeInstanceId: 'value narrative/001',
      evidenceObjectId: 'section/evidence',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        reviewStatus: 'ACCEPTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/section-evidence/section%2Fevidence/review',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.value_drivers',
        sectionKey: 'value_drivers',
        reviewStatus: 'ACCEPTED',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
    expect(buildAcceptRuntimeSectionQuery({
      runtimeInstanceId: 'value narrative/001',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })).toEqual({
      url: '/runtime-instances/value%20narrative%2F001/section-acceptance',
      method: 'PATCH',
      body: {
        runtimePath: 'framework_state.sections.customer_problem',
        sectionKey: 'customer_problem',
        expectedUpdatedAt: '2026-05-19T08:00:00.000Z',
      },
    })
  })

  it('provides and invalidates runtime instance cache tags by runtime type and id', () => {
    const listTags = getRuntimeInstanceListTags({
      data: [
        { id: 'runtime-1', runtimeInstanceKey: 'value-narrative-001' },
        { _id: 'runtime-2', runtimeInstanceKey: 'value-narrative-002' },
        { runtimeInstanceKey: 'value-narrative-003' },
      ],
    }, null, { runtimeType: 'VALUE_NARRATIVE' })

    expect(listTags).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      { type: 'RuntimeInstance', id: 'runtime-2' },
      { type: 'RuntimeInstance', id: 'value-narrative-002' },
      { type: 'RuntimeInstance', id: 'value-narrative-003' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getRuntimeInstanceListTags(undefined, null, { runtimeType: 'DEAL_ANALYSIS' }))
      .toEqual([runtimeInstanceListTag('DEAL_ANALYSIS')])
    expect(getCreateRuntimeInstanceInvalidationTags(null, null, {
      body: { runtimeType: 'VALUE_NARRATIVE' },
    })).toEqual([runtimeInstanceListTag('VALUE_NARRATIVE')])
    expect(getCreateRuntimeInstanceInvalidationTags(null, null, {
      body: { name: 'Defaulted Value Narrative' },
    })).toEqual([runtimeInstanceListTag(DEFAULT_RUNTIME_INSTANCE_TYPE)])
    expect(getRuntimeInstanceDetailTags({
      data: { id: 'runtime-1', runtimeInstanceKey: 'value-narrative-001' },
    }, null, { runtimeInstanceId: 'value-narrative-001' })).toEqual([
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      { type: 'RuntimeInstance', id: 'runtime-1' },
    ])
    expect(getRuntimeRendererTags({
      data: {
        runtimeInstance: { id: 'runtime-1', runtimeInstanceKey: 'value-narrative-001' },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
    ])
    expect(getMutateRuntimeStateInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getExecuteRuntimeActionInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getUpdateRuntimeDiscoveryInputsInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getAcceptRuntimeDiscoveryInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getResetRuntimeDiscoveryInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getReviewRuntimeDiscoveryEvidenceInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getUpdateRuntimeSectionEvidenceInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getReviewRuntimeSectionEvidenceInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
    expect(getAcceptRuntimeSectionInvalidationTags({
      data: {
        runtimeInstance: {
          id: 'runtime-1',
          runtimeInstanceKey: 'value-narrative-001',
          runtimeType: 'VALUE_NARRATIVE',
        },
      },
    }, null, { runtimeInstanceId: 'runtime-1' })).toEqual([
      { type: 'RuntimeInstance', id: 'runtime-1' },
      { type: 'RuntimeInstance', id: 'value-narrative-001' },
      runtimeInstanceListTag('VALUE_NARRATIVE'),
    ])
  })
})
