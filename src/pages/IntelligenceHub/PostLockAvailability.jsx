import { Card } from '../../components/Card'
import { Status } from '../../components/Status'
import { postLockOperationalExplanations } from './lockBasisModel.js'
import usePostLockAvailability from './usePostLockAvailability.js'

const titles = {
  CHECKING: 'Checking post-lock availability',
  DENIED: 'Availability read denied',
  STALE: 'Availability needs refreshing',
  UNAVAILABLE: 'Availability could not be verified',
}

/** The default consumer remains read-only. */
export default function PostLockAvailability(props) {
  const { model, checking, active } = usePostLockAvailability(props)
  return active ? <PostLockAvailabilityDisplay model={model} checking={checking} /> : null
}

export function PostLockAvailabilityDisplay({ model, checking, submissionEnabled = false }) {
  const title = titles[model.state] || (model.data.recording.eligibility === 'BLOCKED'
    ? 'Post-lock submission unavailable' : 'Recording prerequisites verified for this read')
  const variant = model.state === 'VERIFIED' ? model.data.recording.eligibility === 'BLOCKED' ? 'warning' : 'info'
    : checking ? 'neutral' : model.state === 'STALE' ? 'warning' : 'error'
  return <Card variant="outlined" role="status" aria-label="Post-lock evidence availability" aria-busy={checking}>
    <Card.Body>
      <Status size="sm" showIcon announce={false} variant={variant}>{title}</Status>
      {postLockOperationalExplanations(model).map(text => <p key={text}>{submissionEnabled
        && model.state === 'VERIFIED' && model.data.recording.eligibility === 'ELIGIBLE_AS_READ'
        && text === 'An explicit evidence submission requires fresh server checks. This screen does not submit evidence.'
        ? 'An explicit evidence submission requires fresh server checks. Inspect the supplied candidate and reason in the separate form below.' : text}</p>)}
    </Card.Body>
  </Card>
}
