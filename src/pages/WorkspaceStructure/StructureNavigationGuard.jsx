import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'

// View tabs retain the same draft; every other route change requires a decision.
function sameSectionView(current, next) {
  if (current.pathname !== next.pathname) return false
  const a = new URLSearchParams(current.search), b = new URLSearchParams(next.search)
  a.delete('sectionView'); b.delete('sectionView'); a.sort(); b.sort()
  return a.toString() === b.toString()
}

export function StructureNavigationGuard({ draftRef, busy = false }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (draftRef.current.dirty || draftRef.current.busy) && !sameSectionView(currentLocation, nextLocation))
  useEffect(() => {
    const protect = event => {
      if (!draftRef.current.dirty && !draftRef.current.busy) return
      event.preventDefault(); event.returnValue = ''
    }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [draftRef])
  return <ConfirmationDialog open={blocker.state === 'blocked'} title="Unsaved section context"
    message="Discard your unsaved context and staged files and leave this section?" detail="Your saved context and extracted evidence will remain available. Wait for any active operation to finish."
    confirmLabel="Discard and leave" cancelLabel="Keep editing" loading={busy}
    onCancel={() => blocker.reset?.()} onConfirm={() => { if (!draftRef.current.busy) { draftRef.current.discard?.(); blocker.proceed?.() } }} />
}
