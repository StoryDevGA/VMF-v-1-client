# Routing

## Overview

The application uses **React Router v6** with lazy-loaded routes for optimal performance and code splitting.

## Architecture

```
src/
├── router/
│   ├── index.jsx              # Router configuration with lazy loading
│   └── __tests__/
│       └── router.test.jsx    # Router tests
├── pages/
│   ├── Home/
│   │   ├── Home.jsx           # Home page component
│   │   └── index.js           # Barrel export
│   ├── Components/
│   │   ├── Components.jsx     # Components showcase page
│   │   └── index.js
│   └── About/
│       ├── About.jsx          # About page
│       └── index.js
└── components/
    └── Navigation/
        ├── Navigation.jsx     # Navigation component
        ├── Navigation.css     # Navigation styles
        └── index.js
```

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Home | Landing page |
| `/components` | Components | Component showcase |
| `/about` | About | About the project |

## Features

### ✅ Lazy Loading

All routes are lazy-loaded using `React.lazy()` for automatic code splitting:

```jsx
const Home = lazy(() => import('../pages/Home'))
const Components = lazy(() => import('../pages/Components'))
const About = lazy(() => import('../pages/About'))
```

**Benefits:**
- Faster initial page load
- Smaller initial bundle size
- Only load page code when needed
- Better performance metrics

### ✅ Loading States

A loading indicator is shown while lazy-loaded pages are loading:

```jsx
<Suspense fallback={<LoadingFallback />}>
  <Outlet />
</Suspense>
```

### ✅ Nested Routes

Router uses a root layout pattern with navigation:

```jsx
{
  path: '/',
  element: <RootLayout />,  // Navigation + Suspense
  children: [
    { index: true, element: <Home /> },
    { path: 'components', element: <Components /> },
    { path: 'about', element: <About /> },
  ]
}
```

### ✅ Active Link Highlighting

Navigation automatically highlights the active route:

```jsx
<NavLink
  to="/components"
  className={({ isActive }) =>
    isActive ? 'nav__link nav__link--active' : 'nav__link'
  }
>
  Components
</NavLink>
```

## Adding New Routes

### 1. Create Page Component

```jsx
// src/pages/NewPage/NewPage.jsx
function NewPage() {
  return (
    <div className="container">
      <h1>New Page</h1>
      <p>Content here...</p>
    </div>
  )
}

export default NewPage
```

```js
// src/pages/NewPage/index.js
export { default } from './NewPage'
```

### 2. Add Lazy Import

In `src/router/index.jsx`:

```jsx
const NewPage = lazy(() => import('../pages/NewPage'))
```

### 3. Add Route

```jsx
{
  path: '/',
  element: <RootLayout />,
  children: [
    // ... existing routes
    {
      path: 'new-page',
      element: <NewPage />,
    },
  ]
}
```

### 4. Add Navigation Link

In `src/components/Navigation/Navigation.jsx`:

```jsx
<li role="none">
  <NavLink
    to="/new-page"
    className={({ isActive }) =>
      isActive ? 'nav__link nav__link--active' : 'nav__link'
    }
    role="menuitem"
  >
    New Page
  </NavLink>
</li>
```

### 5. Add Tests

```jsx
it('should render new page at /new-page', async () => {
  const testRouter = createMemoryRouter(router.routes, {
    initialEntries: ['/new-page'],
  })

  render(<RouterProvider router={testRouter} />)
  expect(await screen.findByText(/New Page/i)).toBeInTheDocument()
})
```

## Navigation Component

### Features

- ✅ **Sticky positioning** - Stays at top while scrolling
- ✅ **Active link highlighting** - Shows current page
- ✅ **Responsive** - Optimized for all screen sizes
- ✅ **Accessible** - Proper ARIA roles and keyboard navigation
- ✅ **Theme-aware** - Adapts to theme changes

### Usage

Navigation is automatically included in the root layout:

```jsx
function RootLayout() {
  return (
    <>
      <Navigation />
      <main>
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </>
  )
}
```

### Customization

Modify navigation styles in `src/components/Navigation/Navigation.css`:

```css
.nav {
  /* Customize appearance */
  background-color: var(--color-surface);
  border-bottom: var(--border-width-thin) solid var(--color-border);
}

.nav__link--active {
  /* Customize active state */
  color: var(--color-primary-600);
}
```

## Programmatic Navigation

### Using useNavigate Hook

```jsx
import { useNavigate } from 'react-router-dom'

function MyComponent() {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate('/components')
  }

  return <button onClick={handleClick}>Go to Components</button>
}
```

### Using Link Component

```jsx
import { Link } from 'react-router-dom'

function MyComponent() {
  return (
    <Link to="/about">
      Learn More
    </Link>
  )
}
```

### With Button Component

```jsx
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'

function MyComponent() {
  return (
    <Link to="/components" style={{ textDecoration: 'none' }}>
      <Button variant="primary">
        View Components
      </Button>
    </Link>
  )
}
```

## Route Parameters

### Dynamic Routes

```jsx
{
  path: 'component/:id',
  element: <ComponentDetail />,
}
```

### Accessing Parameters

```jsx
import { useParams } from 'react-router-dom'

function ComponentDetail() {
  const { id } = useParams()

  return <div>Component ID: {id}</div>
}
```

## 404 / Not Found

To add a 404 page:

```jsx
{
  path: '*',
  element: <NotFound />,
}
```

## Best Practices

### ✅ DO

- Use lazy loading for all page-level routes
- Use NavLink for navigation to get active state
- Provide meaningful loading states
- Test route rendering
- Use semantic HTML in page components
- Keep routes flat when possible

### ❌ DON'T

- Don't lazy load small utility components
- Don't forget to add Suspense boundaries
- Don't use `<a>` tags for internal navigation (use `<Link>`)
- Don't duplicate navigation logic
- Don't hardcode URLs (use route constants for larger apps)

## Performance

### Code Splitting

Each route is automatically code-split:

```
dist/
├── assets/
│   ├── Home-[hash].js        # Only loaded on home page
│   ├── Components-[hash].js  # Only loaded on components page
│   └── About-[hash].js       # Only loaded on about page
```

### Bundle Analysis

Check bundle sizes:
```bash
npm run build
```

View the `dist/` folder to see individual chunk sizes.

## Accessibility

Navigation follows WCAG guidelines:

- ✅ Semantic HTML (`<nav>`, `<ul>`, `<li>`)
- ✅ ARIA roles (`navigation`, `menubar`, `menuitem`)
- ✅ Keyboard navigation (Tab, Enter)
- ✅ Focus indicators
- ✅ Active state announcement

## Testing

Run routing tests:
```bash
npm test router
```

Tests cover:
- Route rendering
- Navigation presence
- Lazy loading
- Active link states

## Migration from Hash Router

If upgrading from hash routing (`#/path`):

```jsx
// Before (HashRouter)
import { HashRouter } from 'react-router-dom'

// After (BrowserRouter)
import { createBrowserRouter } from 'react-router-dom'
```

**Note:** Browser router requires server configuration for production (see deployment docs).

## Related Documentation

- [React Router v6 Docs](https://reactrouter.com/)
- [Code Splitting](https://react.dev/reference/react/lazy)
- [Suspense](https://react.dev/reference/react/Suspense)
