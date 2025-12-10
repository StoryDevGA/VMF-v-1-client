/**
 * Home Page
 *
 * Landing page for the application
 */

import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import './Home.css'

function Home() {
  return (
    <div className="container home">
      <header className="home__header">
        <h1 className="text-fluid-xl">Transform the Way Your Organisation Thinks, Works, and Performs</h1>
        <p className="text-responsive-base home__subtitle">
          A smarter, measurable approach to digital adoption and operational efficiency—built to give leaders clarity, teams confidence, and organisations the ability to improve at scale.
        </p>
      </header>

      <Fieldset variant="default" gap="lg" className="home__section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">Value Proposition</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <p className="home__value-prop">
            Organisations invest heavily in technology, but struggle to see whether it is working as intended. Work slows down, friction accumulates, and insights remain buried in disconnected systems.
          </p>
          <p className="home__value-prop">
            We provide a measurable, structured way to understand how your workflows actually perform—and what needs to improve—so you can accelerate transformation with certainty rather than assumption.
          </p>
        </Fieldset.Content>
      </Fieldset>

      <Fieldset variant="default" gap="lg" className="home__section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">What We Deliver</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <div className="grid grid-cols-1 grid-md-2 home__delivery-grid">
            <Card variant="filled">
              <Card.Header>
                <h3>Clarity Where It Matters</h3>
              </Card.Header>
              <Card.Body>
                <p>
                  We quantify inefficiency at its source, revealing the steps, behaviours, and workflows that silently erode performance.
                </p>
              </Card.Body>
            </Card>

            <Card variant="filled">
              <Card.Header>
                <h3>Confidence in Every Decision</h3>
              </Card.Header>
              <Card.Body>
                <p>
                  With validated, finance-ready evidence, leaders can prioritise improvements and justify investment with precision.
                </p>
              </Card.Body>
            </Card>

            <Card variant="filled">
              <Card.Header>
                <h3>Predictable, Repeatable Improvement</h3>
              </Card.Header>
              <Card.Body>
                <p>
                  Our approach replaces reactive problem-solving with a governed model that continually measures, diagnoses, and improves operational performance.
                </p>
              </Card.Body>
            </Card>

            <Card variant="filled">
              <Card.Header>
                <h3>A System That Scales With You</h3>
              </Card.Header>
              <Card.Body>
                <p>
                  Whether you're optimising a single process or transforming enterprise-wide operations, our structured methodology adapts and matures with your organisation.
                </p>
              </Card.Body>
            </Card>
          </div>
        </Fieldset.Content>
      </Fieldset>

      <Fieldset variant="default" gap="lg" className="home__section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">Why It Works</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <p className="home__why-works">
            Digital adoption is no longer a training exercise—it's a measurable performance discipline.
          </p>
          <p className="home__why-works">
            By linking user behaviour, workflow execution, and operational outcomes into one cohesive system, we enable organisations to remove friction, accelerate delivery, and sustain long-term efficiency gains.
          </p>
        </Fieldset.Content>
      </Fieldset>

      <Fieldset variant="default" gap="lg" className="home__section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">Who We Help</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <ul className="home__help-list">
            <li>Finance & HR leaders seeking measurable ROI</li>
            <li>CIOs and transformation executives wanting stability and governance</li>
            <li>Product and operations teams needing deeper insight into workflow performance</li>
            <li>Shared services teams aiming to reduce burden and increase throughput</li>
            <li>Organisations preparing for AI-driven optimisation and automation</li>
          </ul>
        </Fieldset.Content>
      </Fieldset>

      <Fieldset variant="default" gap="lg" className="home__section home__outcome-section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">The Outcome</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <div className="home__outcomes">
            <p className="home__outcome-item">Faster workflows.</p>
            <p className="home__outcome-item">Lower operational cost.</p>
            <p className="home__outcome-item">More predictable releases.</p>
            <p className="home__outcome-item">Greater transformation resilience.</p>
            <p className="home__outcome-item">A clearer path to long-term, measurable improvement.</p>
          </div>
        </Fieldset.Content>
      </Fieldset>

    </div>
  )
}

export default Home
