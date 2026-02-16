/**
 * Home Page
 *
 * Structured placeholder page based on early UX wireframe.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdAutoGraph, MdHandshake, MdInsights } from 'react-icons/md'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Select } from '../../components/Select'
import pinwheelIcon from '../../assets/images/icons/pinwheel.svg'
import './Home.css'

const TENANTS = [
  {
    value: 'tenant-alpha',
    label: 'Tenant name',
    description: 'Description of tenant/product/division',
  },
  {
    value: 'tenant-beta',
    label: 'Product division',
    description: 'Description of tenant/product/division',
  },
  {
    value: 'tenant-gamma',
    label: 'Regional business unit',
    description: 'Description of tenant/product/division',
  },
]

const HOME_CARDS = [
  {
    title: 'Value Message Framework',
    description: 'Your framework to better storytelling.',
    action: 'Build Framework',
    to: '/app/framework',
    icon: <MdAutoGraph aria-hidden="true" />,
  },
  {
    title: 'Deal Making',
    description: 'Analyse and improve your deal pipeline.',
    action: 'View Pipeline',
    to: '/app/deals',
    icon: <MdHandshake aria-hidden="true" />,
  },
  {
    title: 'Analytics',
    description: 'Review performance metrics, trends, and forecasts.',
    action: 'View Analytics',
    to: '/app/views',
    icon: <MdInsights aria-hidden="true" />,
  },
]

function Home() {
  const navigate = useNavigate()
  const [selectedTenant, setSelectedTenant] = useState(TENANTS[0].value)

  const tenant = useMemo(
    () => TENANTS.find((item) => item.value === selectedTenant) ?? TENANTS[0],
    [selectedTenant],
  )

  return (
    <section className="home" aria-label="Home">
      <header className="home__header">
        <h1 className="home__title">Welcome to StoryLineOS</h1>
        <p className="home__subtitle">Streamline your value messaging and deal-making with data-driven insights.</p>
      </header>

      <div className="home__grid">
        <Fieldset
          variant="default"
          gap="lg"
          className="home__section home__section--logo"
        >
          <Fieldset.Legend className="home__legend">
            <h2 className="home__section-title">StoryLineOS</h2>
          </Fieldset.Legend>
          <Fieldset.Content className="home__logo-content">
            <img src={pinwheelIcon} alt="StoryLineOS logo" className="home__logo-image" />
          </Fieldset.Content>
        </Fieldset>

        <Fieldset
          variant="default"
          gap="lg"
          className="home__section home__section--tenant"
        >
          <Fieldset.Legend className="home__legend">
            <h2 className="home__section-title">Select Tenant</h2>
          </Fieldset.Legend>
          <Fieldset.Content className="home__tenant-content">
            <Select
              id="home-tenant"
              label="Tenant"
              value={selectedTenant}
              onChange={(event) => setSelectedTenant(event.target.value)}
              options={TENANTS.map((item) => ({ value: item.value, label: item.label }))}
              helperText="All workflows will use this tenant's data"
              className="home__tenant-select"
            />
            <p className="home__tenant-name">{tenant.label}</p>
            <p className="home__tenant-description">{tenant.description}</p>
          </Fieldset.Content>
        </Fieldset>

        <Fieldset
          variant="default"
          gap="lg"
          className="home__section home__section--wide"
        >
          <Fieldset.Legend className="home__legend">
            <h2 className="home__section-title">Core Workflows</h2>
          </Fieldset.Legend>
          <Fieldset.Content className="home__cards" role="list">
            {HOME_CARDS.map((card) => (
              <Card
                key={card.title}
                variant="default"
                className="home__card"
                role="listitem"
              >
                <Card.Header className="home__card-header">
                  <span className="home__card-icon">{card.icon}</span>
                  <h3 className="home__card-title">{card.title}</h3>
                </Card.Header>
                <Card.Body className="home__card-body">
                  <p className="home__card-description">{card.description}</p>
                </Card.Body>
                <Card.Footer className="home__card-footer">
                  <Button variant="outline" size="sm" onClick={() => navigate(card.to)}>
                    {card.action}
                  </Button>
                </Card.Footer>
              </Card>
            ))}
          </Fieldset.Content>
        </Fieldset>
      </div>
    </section>
  )
}

export default Home
