import { Fieldset } from '../../components/Fieldset'
import { VMFNavbar } from '../../components/VMFNavbar'
import { Status } from '../../components/Status'
import { Card } from '../../components/Card'
import './VMF.css'

function VMF() {
  return (
    <div className="container vmf">
      <h1 className="vmf__title">VMF Dashboard</h1>
      <p className="vmf__subtitle">Virtual Management Framework</p>

      <VMFNavbar />

      <Fieldset variant="outlined" gap="md" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <Fieldset.Legend>System Status</Fieldset.Legend>
        <Fieldset.Content>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', alignItems: 'flex-start' }}>
            <Status variant="success" pulse>API Server</Status>
            <Status variant="success">Database</Status>
            <Status variant="warning">Cache</Status>
            <Status variant="info" pulse>Processing</Status>
            <Status variant="error">Email Service</Status>
          </div>
        </Fieldset.Content>
      </Fieldset>

      <Fieldset variant="outlined">
        <Fieldset.Legend>Main Workspace</Fieldset.Legend>
        <Fieldset.Content>
          <div className="vmf__split-layout">
            <div className="vmf__split-left">
              <h3>Left Panel (1/3)</h3>
              <p>This is filler content for the left side panel.</p>
              <ul>
                <li>Navigation item 1</li>
                <li>Navigation item 2</li>
                <li>Navigation item 3</li>
                <li>Navigation item 4</li>
              </ul>
            </div>
            <div className="vmf__split-right">
              <h3>Right Panel (2/3)</h3>
              <p>This is filler content for the right side panel.</p>
              <p>This larger area will contain the main content.</p>
              <div className="vmf__content-placeholder">
                <p>Content block 1</p>
              </div>
              <div className="vmf__content-placeholder">
                <p>Content block 2</p>
              </div>
              <div className="vmf__content-placeholder">
                <p>Content block 3</p>
              </div>
            </div>
          </div>
        </Fieldset.Content>
      </Fieldset>
    </div>
  )
}

export default VMF
