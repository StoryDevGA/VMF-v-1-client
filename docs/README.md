# StoryLineOS Client Documentation

This directory contains all documentation for the VMF-v1 client application.

## Directory Structure

```
docs/
├── README.md                          # This file
├── routing.md                         # Routing and navigation
├── components/                        # Component documentation
│   ├── accordion.md                   # Accordion component
│   ├── avatar.md                      # Avatar component
│   ├── button.md                      # Button component
│   ├── card.md                        # Card component
│   ├── dialog.md                      # Dialog component
│   ├── fieldset.md                    # Fieldset component
│   ├── footer.md                      # Footer component
│   ├── header.md                      # Header component
│   ├── input.md                       # Input component
│   ├── link.md                        # Link component
│   ├── radio.md                       # Radio component
│   ├── select.md                      # Select component
│   ├── spinner.md                     # Spinner component
│   ├── tickbox.md                     # Tickbox component
│   ├── tooltip.md                     # Tooltip component
│   └── toaster.md                     # Toaster component
└── design-system/                     # Design system documentation
    ├── css-design-system.md           # CSS design tokens and architecture
    ├── responsive-design.md           # Responsive design patterns and utilities
    └── theming.md                     # Theme system and color scheme switching
```

## Documentation Index

### Application
- **[Routing](./routing.md)** - React Router setup, lazy loading, navigation, and adding new routes

### Design System
- **[CSS Design System](./design-system/css-design-system.md)** - Design tokens, color system, typography, spacing, and more
- **[Responsive Design](./design-system/responsive-design.md)** - Mobile-first approach, breakpoints, and responsive utilities
- **[Theming System](./design-system/theming.md)** - How to modify and swap color schemes easily

### Component Framework
- **[Accordion](./components/accordion.md)** - Accessible accordion component with smooth animations and keyboard navigation
- **[Avatar](./components/avatar.md)** - User profile pictures with initials, sizes, shapes, and status indicators
- **[Button](./components/button.md)** - Accessible button component with variants, sizes, and states
- **[Card](./components/card.md)** - Professional card component with variants, sections, and responsive layouts
- **[Dialog](./components/dialog.md)** - Native HTML dialog component with animations, focus management, and multiple sizes
- **[Fieldset](./components/fieldset.md)** - Native fieldset component with border-breaking legend and flex content layout
- **[Footer](./components/footer.md)** - Responsive footer with sections, links, and copyright
- **[Header](./components/header.md)** - Responsive header with logo and navigation
- **[Input](./components/input.md)** - Input component with floating label animation and very light placeholder text
- **[Link](./components/link.md)** - Smart link component for internal routing and external navigation
- **[Radio](./components/radio.md)** - Custom-styled, accessible radio button component
- **[Select](./components/select.md)** - Custom-styled select dropdown with helper/error states
- **[Spinner](./components/spinner.md)** - Simple, accessible loading spinner
- **[Tickbox](./components/tickbox.md)** - Custom-styled, accessible checkbox component
- **[Tooltip](./components/tooltip.md)** - Accessible tooltip with hover/focus triggers, positioning, and theming
- **[Toaster](./components/toaster.md)** - Accessible toast notifications with variants and positioning

### Testing
_(Documentation will be added as testing patterns are established)_

## Contributing to Documentation

When creating new documentation:

1. Place it in the appropriate subdirectory
2. Use descriptive filenames (kebab-case)
3. Update this README with a link
4. Follow the existing documentation style
5. Include code examples where applicable

## Documentation Standards

- ✅ Use Markdown format (.md)
- ✅ Include table of contents for long documents
- ✅ Provide practical code examples
- ✅ Document both what and why
- ✅ Keep documentation in sync with code
- ✅ Use clear, concise language
