const getDetailMessage = (value) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = getDetailMessage(item)
      if (message) return message
    }
    return ''
  }

  if (value && typeof value === 'object') {
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message.trim()
    }

    for (const nestedValue of Object.values(value)) {
      const message = getDetailMessage(nestedValue)
      if (message) return message
    }
  }

  return ''
}

export const getRuntimeControlFieldErrorMap = (
  appError,
  knownFieldNames = [],
  { fallbackMessage = '' } = {},
) => {
  const details = appError?.details
  const errorMessage = String(fallbackMessage || appError?.message || '').trim()
  const fieldName = String(details?.field ?? '').trim()

  if (fieldName && errorMessage) {
    return { [fieldName]: errorMessage }
  }

  if (!details || typeof details !== 'object') {
    return {}
  }

  const fieldErrors = {}

  for (const knownFieldName of knownFieldNames) {
    const message = getDetailMessage(details?.[knownFieldName])
    if (message) {
      fieldErrors[knownFieldName] = message
    }
  }

  return fieldErrors
}
