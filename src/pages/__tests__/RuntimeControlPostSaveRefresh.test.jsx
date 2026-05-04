import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RuntimeAgentListView } from '../SuperAdminAgents/RuntimeAgentListView.jsx'
import { FrameworkPackageListView } from '../SuperAdminFrameworkPackages/FrameworkPackageListView.jsx'
import { RuntimePathRegistryListView } from '../SuperAdminRuntimePathRegistry/RuntimePathRegistryListView.jsx'
import { SkillRoleRegistryListView } from '../SuperAdminSkillRoleRegistry/SkillRoleRegistryListView.jsx'
import { RuntimeSkillListView } from '../SuperAdminSkills/RuntimeSkillListView.jsx'
import { ValidationRegistryListView } from '../SuperAdminValidationRegistry/ValidationRegistryListView.jsx'
import { WorkflowPolicyListView } from '../SuperAdminWorkflowPolicies/WorkflowPolicyListView.jsx'

const noop = () => {}
const allOption = [{ value: '', label: 'All' }]
const commonListProps = {
  search: '',
  setSearch: noop,
  statusFilter: '',
  setStatusFilter: noop,
  setPage: noop,
  rows: [],
  currentPage: 1,
  totalPages: 1,
  isListLoading: true,
  isListFetching: true,
  showPostSaveRefresh: true,
  listAppError: null,
  onBackClick: noop,
  onCreateClick: noop,
  onEditClick: noop,
}

describe('Runtime Control post-save list refresh states', () => {
  it.each([
    {
      label: 'Framework Packages',
      message: 'Refreshing Framework Packages...',
      element: (
        <FrameworkPackageListView
          {...commonListProps}
          frameworkFilter=""
          setFrameworkFilter={noop}
          frameworkOptions={allOption}
          onCreatePackage={noop}
          onEditPackage={noop}
          activatePackage={noop}
        />
      ),
    },
    {
      label: 'Workflow Policies',
      message: 'Refreshing Workflow Policies...',
      element: (
        <WorkflowPolicyListView
          {...commonListProps}
          frameworkFilter=""
          setFrameworkFilter={noop}
          typeFilter=""
          setTypeFilter={noop}
          frameworkOptions={allOption}
          setWorkflowPolicyStatus={noop}
        />
      ),
    },
    {
      label: 'Runtime Paths',
      message: 'Refreshing Runtime Paths...',
      element: (
        <RuntimePathRegistryListView
          {...commonListProps}
          operationFilter=""
          setOperationFilter={noop}
          protectedFilter=""
          setProtectedFilter={noop}
          onCreatePath={noop}
          onEditPath={noop}
          onClonePath={noop}
          onActivatePath={noop}
          onDisablePath={noop}
          onDeprecatePath={noop}
        />
      ),
    },
    {
      label: 'Validation Registry',
      message: 'Refreshing Validation Registry...',
      element: (
        <ValidationRegistryListView
          {...commonListProps}
          frameworkFilter=""
          setFrameworkFilter={noop}
          categoryFilter=""
          setCategoryFilter={noop}
          severityFilter=""
          setSeverityFilter={noop}
          frameworks={allOption}
          setValidationStatus={noop}
          isMutating={false}
        />
      ),
    },
    {
      label: 'Skills',
      message: 'Refreshing Skills...',
      element: (
        <RuntimeSkillListView
          {...commonListProps}
          frameworkFilter=""
          setFrameworkFilter={noop}
          frameworkOptions={allOption}
          setSkillStatus={noop}
        />
      ),
    },
    {
      label: 'Agents',
      message: 'Refreshing Agents...',
      element: (
        <RuntimeAgentListView
          {...commonListProps}
          frameworkFilter=""
          setFrameworkFilter={noop}
          frameworkOptions={allOption}
          setAgentStatus={noop}
          validateAgent={noop}
          openTestDialog={noop}
        />
      ),
    },
    {
      label: 'Skill Roles',
      message: 'Refreshing Skill Roles...',
      element: (
        <SkillRoleRegistryListView
          {...commonListProps}
          sortValue="updatedAt:desc"
          setSortValue={noop}
          setRoleStatus={noop}
          isMutating={false}
        />
      ),
    },
  ])('shows a quiet post-save refresh state for $label', ({ element, message }) => {
    render(element)

    expect(screen.getByText(message)).toBeInTheDocument()
  })
})
