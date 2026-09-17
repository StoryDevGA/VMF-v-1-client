export const projectAction = (card) => ({
  label: card.nextAction,
  to: card.id ? `/app/runtime/${encodeURIComponent(String(card.id))}` : '/app/workspaces/vmf',
})

export const getWorkspaceCardKey = (card, index) => {
  if (!card) return `workspace-${index}`
  return card.id ?? card.identityKey ?? `workspace-${index}`
}
