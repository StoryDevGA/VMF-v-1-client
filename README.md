# StoryLineOS Client

React application built with Vite, featuring a comprehensive design system and reusable UI components.

## Technology Stack

- **React 19.2** - Modern React with hooks
- **Vite 7.2** - Fast build tool and dev server with HMR
- **React Router** - Client-side routing
- **ESLint** - Code linting and quality
- **Vitest** - Unit testing
- **Testing Library** - Component testing

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm test         # Run tests
```

## Project Structure

```
client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── router/         # React Router configuration
│   ├── styles/         # Global styles and design tokens
│   └── utils/          # Utility functions
└── public/             # Static assets
```

## Design System

The project uses a comprehensive design system with CSS custom properties for:
- **Spacing Scale**: `2xs` (2px) through `3xl` (64px)
- **Typography**: Font families, sizes, weights, and line heights
- **Colors**: Semantic color tokens for consistent theming
- **Borders**: Border widths and radius
- **Shadows**: Elevation levels
- **Z-Index Scale**: Layering system
- **Transitions**: Animation timing

## Components

All components follow these principles:
- **Accessible**: WCAG-compliant with proper ARIA attributes
- **Responsive**: Mobile-first design approach
- **Composable**: Flexible and reusable
- **Tested**: Comprehensive test coverage

### Available Components
- Button (with variants, sizes, loading states)
- Input (with floating labels and validation)
- Textarea (multi-line input with validation)
- Select (dropdown with options)
- Radio & Tickbox (form controls)
- Card (content containers)
- Dialog (modals and popups)
- Accordion (collapsible sections)
- Fieldset (form grouping)
- Link (internal and external navigation)
- Avatar (user images)
- Spinner (loading indicators)
- Status (circle indicators with optional text)
- Tooltip (contextual help)
- Toaster (notifications)
- And more...

## Recent Updates

### 2025-12-10

#### Components
- **Status Component** with circle indicator and optional inline text
  - Five variants (success, warning, error, info, neutral)
  - Three sizes (sm, md, lg)
  - Optional pulse animation
  - Full accessibility support with role="status"
  - Comprehensive test coverage (32 tests)

### 2025-12-09

#### Design System
- Added `--spacing-2xs` (0.125rem / 2px) to the design system spacing scale for more granular spacing control

#### Components
- **Textarea Component** with floating label animation
  - Supports multiple variants (default, outlined, filled)
  - Multiple sizes (sm, md, lg)
  - Error states and helper text
  - Resize options (both, horizontal, vertical, none)
  - Full accessibility support

#### Form Validation
- Created reusable validation utility (`/src/utils/validation.js`)
  - Core validators: `required`, `email`, `phone`, `minLength`, `maxLength`, `pattern`, `matches`, `range`, `url`
  - `compose()` function for combining multiple validators
  - `validateForm()` for validating entire form objects
  - `validateField()` for validating single fields

#### VMF-G Form Page
- Built comprehensive user registration form demonstrating all form components
  - Split-view layout with live form preview (33% left panel) and form (67% right panel)
  - Real-time validation with error messages
  - Form fields: First Name, Last Name, Email, Phone, Country, Account Type, Bio, Newsletter, Terms
  - Character counter for bio field (0/500)
  - Submit button disabled until all validation passes
  - Responsive design that stacks on mobile

### Changed

- **Button Component**: Reduced padding across all sizes and devices
  - Small: `2px vertical, 4px horizontal` (reduced from 4px/8px)
  - Medium: `4px vertical, 8px horizontal` (reduced from 8px/16px)
  - Large: `8px vertical, 16px horizontal` (reduced from 16px/24px)
  - Desktop medium: `4px vertical, 16px horizontal` (reduced from 8px/24px)
  - Desktop large: `8px vertical, 24px horizontal` (reduced from 16px/32px)

- **Fieldset Component**: Reduced padding across all devices
  - Mobile: `16px` (reduced from 24px)
  - Tablet: `24px` (reduced from 32px)
  - Desktop: `24px` (reduced from 32px vertical, 48px horizontal)

- **Select Component**:
  - Fixed examples in Components page - added proper options arrays to all Select examples
  - Updated VMF-G form to use `options` prop instead of children pattern
  - Added helper function to display country labels instead of codes in form preview

### Fixed

- Fixed mobile overflow issues with Input and Textarea components
  - Changed Input container from `inline-flex` to `flex`
  - Added `min-width: 0` to prevent flex item overflow
  - Added `box-sizing: border-box` to textarea

- Fixed VMF-G form preview to show formatted values:
  - Country now displays full name (e.g., "United States") instead of code (e.g., "us")
  - Account type properly capitalized
  - Boolean fields (newsletter, terms) show "Yes"/"No"

### Improved

- All Select component examples now have functional options instead of empty arrays
- Form validation provides immediate feedback with clear error messages
- Buttons and fieldsets now have more compact, modern spacing
- Consistent API usage across all Select components (using `options` prop)

## Configuration

### Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### ESLint

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
