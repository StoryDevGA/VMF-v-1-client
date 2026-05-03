# CLAUDE.md - VMF-v-1-client

Codebase instructions and context for Claude Code assistance in the VMF v1 client frontend.

## Working Principles

1. **Don't assume. Don't hide confusion. Surface tradeoffs.**
   - Ask for clarification when requirements are ambiguous.
   - Explicitly surface design tradeoffs and ask for direction rather than making assumptions.
   - If a decision has downsides, make them visible.

2. **Minimum code that solves the problem. Nothing speculative.**
   - Write only what the task requires.
   - Don't add abstraction layers, helper functions, or components for hypothetical future use.
   - No feature flags, dead code branches, or "nice-to-haves" unless explicitly requested.

3. **Touch only what you must. Clean up only your own mess.**
   - Don't refactor unrelated code while fixing a bug or adding a feature.
   - Don't rename components, reorganize imports, or improve patterns outside the scope of the current task.
   - Fix only the mess you create; leave existing technical debt alone unless it directly blocks the task.

4. **Define success criteria. Loop until verified.**
   - Before starting, clarify what "done" means for this task.
   - Test the feature in a browser and verify it works end-to-end.
   - Don't consider it complete until all success criteria are met and no regressions are detected.

## Tech Stack

- **Framework:** React 18+ with Hooks
- **Build Tool:** Vite
- **Styling:** CSS (no preprocessors in this project)
- **State Management:** Local component state + RTK Query (Redux store for API)
- **Routing:** React Router v7
- **Form Validation:** Schema-based (custom helpers)
- **Testing:** Vitest + React Testing Library
- **Linting:** ESLint

## Key Patterns

### Component Structure
- **Page Components:** In `src/pages/` with barrel exports (`index.js`)
- **Dual Export:** Named export + default export for flexibility
- **Local State:** Use `useState` for UI state, don't over-engineer
- **Props Drilling:** Accept as necessary; extract shared logic into custom hooks if it becomes complex

### Form Patterns
- Schema-based validation with error object tracking
- Field-level error messages displayed inline
- Toast notifications for async operations (success, error, info)
- Form state persisted only during user interaction, not localStorage

### API Integration
- **RTK Query** for data fetching and caching
- **Mock mode** for development/testing (non-destructive to real API)
- Mock mutations should validate the same contract as live API
- Always test form submissions against both mock and real API behavior

### Styling
- CSS files colocated with components
- BEM naming convention for class names
- No inline styles except for dynamic values
- Responsive design: mobile-first approach

## File Structure

```
src/
├── pages/                  # Page/route components (feature bundles)
│   ├── PageName/
│   │   ├── PageName.jsx
│   │   ├── PageName.test.jsx
│   │   ├── PageName.css
│   │   └── index.js       # Barrel export
├── components/             # Shared UI components (if any)
├── hooks/                  # Custom React hooks
├── store/                  # Redux store + RTK Query
│   ├── api/               # API definitions (queries, mutations)
│   └── slices/            # Redux slices (if used)
├── utils/                  # Utility functions
├── constants/              # App-wide constants
└── App.jsx                 # Root component
```

## Before Building UI Components

Make sure you understand:
- What data the component needs
- How errors should be displayed
- Whether validation is client-side only or server-driven
- What happens on loading/error states
- Whether the form should preserve state across navigation
- Accessibility requirements (ARIA labels, semantic HTML, keyboard nav)

## Testing Expectations

- Unit tests for form validation logic
- Integration tests for page interactions (user events, navigation)
- Test both success and error paths
- Verify form submission payloads match API expectations
- Test accessibility (keyboard nav, screen reader hints)
- Run dev server and manually test before marking complete

## ESLint & Code Quality

- Fix eslint errors in files you touch
- Don't disable rules globally; discuss with the team if a rule seems problematic
- Prefer explicit over implicit (e.g., `onChange={(e) => setState(e.target.value)}` over magic)

## Browser & Mobile Testing

- Test in Chrome/Firefox/Safari (if available)
- Test responsive design at 375px (mobile), 768px (tablet), 1920px (desktop)
- Verify touch interactions work on mobile
- Check console for errors/warnings while testing

## Git Workflow

- Prefer creating new commits over amending
- Include context in commit messages
- Reference task or issue numbers when applicable
- Test locally before pushing

## Debugging Tips

- Use `console.log()` and browser DevTools liberally during development
- Check Network tab in DevTools for API calls and payloads
- Watch component re-renders (React DevTools Profiler)
- Verify mock API matches expected behavior vs live API
