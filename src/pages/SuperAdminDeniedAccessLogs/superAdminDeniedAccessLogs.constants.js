export const INITIAL_FILTERS = {
  actorUserId: '',
  startDate: '',
  endDate: '',
}

export const toStartOfDayIso = (dateValue) => {
  if (!dateValue) return ''
  const date = new Date(`${dateValue}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export const toEndOfDayIso = (dateValue) => {
  if (!dateValue) return ''
  const date = new Date(`${dateValue}T23:59:59.999Z`)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export const getActorDisplay = (row) => {
  if (row?.actor?.name) return row.actor.name
  if (row?.actor?.email) return row.actor.email
  if (typeof row?.actorUserId === 'string' && row.actorUserId) return row.actorUserId
  if (row?.actorUserId?._id) return row.actorUserId._id
  return '--'
}
