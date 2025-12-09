import { Fieldset } from '../../components/Fieldset'
import { Card } from '../../components/Card'
import { Avatar } from '../../components/Avatar'
import { Spinner } from '../../components/Spinner'
import { VMFNavbar } from '../../components/VMFNavbar'
import './VMF.css'

function VMFG() {
  return (
    <div className="container vmf">
      <h1 className="vmf__title">VMF-G: Advanced Components</h1>
      <p className="vmf__subtitle">Card, Avatar, Spinner</p>

      <VMFNavbar />

      <Fieldset variant="outlined">
        <Fieldset.Legend>Advanced Components Showcase</Fieldset.Legend>
        <Fieldset.Content>
          <div className="vmf__split-layout">
            <div className="vmf__split-left">
              <h3>Cards</h3>
              <Card>
                <Card.Header>
                  <h4>Default Card</h4>
                </Card.Header>
                <Card.Body>
                  <p>This is a basic card with header and body.</p>
                </Card.Body>
              </Card>

              <Card variant="outlined" style={{ marginTop: '16px' }}>
                <Card.Header>
                  <h4>Outlined Card</h4>
                </Card.Header>
                <Card.Body>
                  <p>This card has an outlined variant style.</p>
                </Card.Body>
              </Card>

              <h3 style={{ marginTop: '24px' }}>Spinners</h3>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
              </div>
            </div>

            <div className="vmf__split-right">
              <h3>Avatars</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Avatar size="sm">JD</Avatar>
                  <span>Small Avatar</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Avatar size="md">JD</Avatar>
                  <span>Medium Avatar</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Avatar size="lg">JD</Avatar>
                  <span>Large Avatar</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Avatar size="xl">JD</Avatar>
                  <span>Extra Large Avatar</span>
                </div>
              </div>
            </div>
          </div>
        </Fieldset.Content>
      </Fieldset>
    </div>
  )
}

export default VMFG
