import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const DEFAULT_POST_SAVE_STATE_KEYS = ['runtimeControlSaved']

export function usePostSaveListRefreshState(isLoading, stateKeys = DEFAULT_POST_SAVE_STATE_KEYS) {
  const location = useLocation()
  const navigate = useNavigate()
  const keys = Array.isArray(stateKeys) ? stateKeys : [stateKeys]
  const returnedFromSave = keys.some((key) => Boolean(location.state?.[key]))

  useEffect(() => {
    if (!returnedFromSave || isLoading) return
    navigate(location.pathname, { replace: true, state: null })
  }, [isLoading, location.pathname, navigate, returnedFromSave])

  return returnedFromSave && isLoading
}

export default usePostSaveListRefreshState
