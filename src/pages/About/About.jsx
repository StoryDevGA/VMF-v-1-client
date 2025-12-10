/**
 * About Page
 *
 * Information about the project
 */

import { Fieldset } from '../../components/Fieldset'
import './About.css'

function About() {
  return (
    <div className="container about">
      <h1 className="text-fluid-xl">About</h1>

      <Fieldset variant="default" gap="lg" className="about__section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">Our Mission</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <p className="about__text">
            To give organisations a measurable, structured, and repeatable way to improve how people work—so every decision, every release, and every process is supported by evidence, not assumption.
          </p>
        </Fieldset.Content>
      </Fieldset>

      <Fieldset variant="default" gap="lg" className="about__section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">Our Philosophy</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <p className="about__text">
            Most organisations aren't suffering from a lack of data—they're suffering from a lack of clarity.
          </p>
          <p className="about__text">
            Dashboards show activity, but not efficiency. Reports highlight issues, but not their root causes.
          </p>
          <p className="about__text">
            We believe the most effective way to improve performance is to understand it in terms everyone recognises: time, friction, and measurable outcomes.
          </p>
          <p className="about__text">
            This perspective allows teams to move beyond anecdote and reactive problem-solving toward a governed, high-fidelity model of operational excellence.
          </p>
        </Fieldset.Content>
      </Fieldset>

      <Fieldset variant="default" gap="lg" className="about__section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">What Makes Us Different</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <p className="about__text">
            We don't sell software fragments, one-off fixes, or dashboard bundles.
          </p>
          <p className="about__text">
            We provide an end-to-end methodology that:
          </p>
          <ul className="about__list">
            <li>Measures how workflows truly perform</li>
            <li>Identifies the real behavioural and process drivers behind inefficiency</li>
            <li>Validates improvements with financial proof</li>
            <li>Enables predictive insight</li>
            <li>Builds internal capability that lasts</li>
          </ul>
          <p className="about__text">
            This creates a consistent, evidence-driven approach that aligns executives, teams, and partners around one shared model of performance.
          </p>
        </Fieldset.Content>
      </Fieldset>

      <Fieldset variant="default" gap="lg" className="about__section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">Our Commitment</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <p className="about__text">
            We design every engagement to be measurable, transparent, and aligned to the outcomes that matter most: efficiency, stability, and strategic value.
          </p>
          <p className="about__text">
            Our goal is to help you build a resilient, scalable operating model—not to create long-term dependency.
          </p>
        </Fieldset.Content>
      </Fieldset>

      <Fieldset variant="default" gap="lg" className="about__section">
        <Fieldset.Legend>
          <h2 className="text-responsive-md">The Future We're Building</h2>
        </Fieldset.Legend>
        <Fieldset.Content>
          <p className="about__text">
            As organisations prepare for AI-enabled operations, validated, high-quality data becomes essential.
          </p>
          <p className="about__text">
            Our methodology provides the structure, insight, and governance required to support this evolution—ensuring that automation and AI are grounded in the reality of how your people and systems actually work.
          </p>
        </Fieldset.Content>
      </Fieldset>
    </div>
  )
}

export default About
