import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Fieldset } from '../../components/Fieldset'
import './DeniedAccessFilters.css'

export function DeniedAccessFilters({
  draftFilters,
  setDraftFilters,
  isFetching,
  onApply,
  onReset,
}) {
  return (
    <Fieldset className="super-admin-denied-logs__fieldset">
      <Fieldset.Legend className="super-admin-denied-logs__legend">
        <h2 className="super-admin-denied-logs__section-title">Filters</h2>
      </Fieldset.Legend>
      <Card variant="elevated" className="super-admin-denied-logs__card">
        <Card.Body>
          <p className="super-admin-denied-logs__section-subtitle">
            Narrow logs by actor and date range.
          </p>
          <form
            className="super-admin-denied-logs__filters"
            onSubmit={(event) => {
              event.preventDefault()
              onApply()
            }}
            noValidate
          >
            <Input
              id="denied-actor-user-id"
              label="Actor User ID"
              value={draftFilters.actorUserId}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  actorUserId: event.target.value,
                }))
              }
              fullWidth
            />
            <Input
              id="denied-start-date"
              type="date"
              label="Start Date"
              value={draftFilters.startDate}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              fullWidth
            />
            <Input
              id="denied-end-date"
              type="date"
              label="End Date"
              value={draftFilters.endDate}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              fullWidth
            />
            <div className="super-admin-denied-logs__filter-actions">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isFetching}
              >
                Apply
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                disabled={isFetching}
                onClick={onReset}
              >
                Reset
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Fieldset>
  )
}
