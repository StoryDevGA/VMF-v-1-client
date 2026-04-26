/**
 * TabView Component
 *
 * A fully accessible, responsive tab navigation component for organizing content.
 *
 * Features:
 * - Tab selection with visual active state indicator
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Full ARIA support for accessibility
 * - Responsive design (stacks on mobile if needed)
 * - Smooth transitions between tabs
 * - Customizable variants and orientations
 * - Optional even-width tab distribution (evenTabs)
 *
 * @param {object} props
 * @param {React.ReactNode} props.children Tab content via TabView.Tab children
 * @param {number} [props.defaultActiveTab=0] Default active tab index (uncontrolled mode)
 * @param {number} [props.activeTab] Active tab index (controlled mode)
 * @param {'default'|'pills'|'boxed'} [props.variant='default'] Visual styling variant
 * @param {'horizontal'|'vertical'} [props.orientation='horizontal'] Orientation for tab navigation
 * @param {'sm'|'md'} [props.size='md'] Tab size
 * @param {boolean} [props.evenTabs=false] When true (horizontal only), tabs distribute evenly and wrap onto multiple rows
 * @param {(nextIndex:number)=>void} [props.onTabChange] Callback invoked when tab changes
 * @param {string} [props.aria-label] Applied to the tablist element (`role="tablist"`)
 *
 * @example
 * <TabView defaultActiveTab={0}>
 *   <TabView.Tab label="Profile">
 *     <p>Profile content here</p>
 *   </TabView.Tab>
 *   <TabView.Tab label="Settings">
 *     <p>Settings content here</p>
 *   </TabView.Tab>
 *   <TabView.Tab label="Notifications">
 *     <p>Notifications content here</p>
 *   </TabView.Tab>
 * </TabView>
 *
 * @example
 * <TabView variant="pills" orientation="vertical">
 *   <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
 *   <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
 * </TabView>
 *
 * @example
 * <TabView variant="pills" evenTabs aria-label="Editor sections">
 *   <TabView.Tab label="Basic">...</TabView.Tab>
 *   <TabView.Tab label="Execution">...</TabView.Tab>
 * </TabView>
 */

import { Children, useId, useRef, useState } from 'react'
import './TabView.css'

const clampTabIndex = (index, tabCount) => {
  if (tabCount <= 0) return 0
  const normalizedIndex = Number.isInteger(index) ? index : 0
  return Math.min(Math.max(normalizedIndex, 0), tabCount - 1)
}

export function TabView({
  children,
  defaultActiveTab = 0,
  activeTab: controlledActiveTab,
  variant = 'default',
  orientation = 'horizontal',
  size = 'md',
  evenTabs = false,
  onTabChange,
  className = '',
  ...props
}) {
  const { ['aria-label']: ariaLabel, ...rootProps } = props
  const tabViewId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const idBase = `tabview-${tabViewId}`
  const tabs = Children.toArray(children)
  const totalTabs = tabs.length
  const isControlled = controlledActiveTab !== undefined
  const [internalActiveTab, setInternalActiveTab] = useState(
    clampTabIndex(defaultActiveTab, totalTabs),
  )
  const tabRefs = useRef([])

  const activeTab = clampTabIndex(
    isControlled ? controlledActiveTab : internalActiveTab,
    totalTabs,
  )

  const selectTab = (index) => {
    if (totalTabs === 0) return
    const nextIndex = clampTabIndex(index, totalTabs)

    if (!isControlled) {
      setInternalActiveTab(nextIndex)
    }

    onTabChange?.(nextIndex)
    return nextIndex
  }

  const handleTabClick = (index) => {
    selectTab(index)
  }

  const handleKeyDown = (event, currentIndex) => {
    if (totalTabs === 0) return

    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal') {
          event.preventDefault()
          newIndex = currentIndex === totalTabs - 1 ? 0 : currentIndex + 1
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          event.preventDefault()
          newIndex = currentIndex === 0 ? totalTabs - 1 : currentIndex - 1
        }
        break
      case 'ArrowDown':
        if (orientation === 'vertical') {
          event.preventDefault()
          newIndex = currentIndex === totalTabs - 1 ? 0 : currentIndex + 1
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical') {
          event.preventDefault()
          newIndex = currentIndex === 0 ? totalTabs - 1 : currentIndex - 1
        }
        break
      case 'Home':
        event.preventDefault()
        newIndex = 0
        break
      case 'End':
        event.preventDefault()
        newIndex = totalTabs - 1
        break
      default:
        return
    }

    const selectedIndex = selectTab(newIndex)
    if (selectedIndex !== undefined) {
      tabRefs.current[selectedIndex]?.focus()
    }
  }

  const tabViewClasses = [
    'tabview',
    `tabview--${variant}`,
    `tabview--${orientation}`,
    `tabview--${size}`,
    evenTabs && 'tabview--even-tabs',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={tabViewClasses} {...rootProps}>
      <div
        className="tabview__tablist"
        role="tablist"
        aria-orientation={orientation}
        aria-label={ariaLabel}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTab
          const tabClasses = [
            'tabview__tab',
            isActive && 'tabview__tab--active'
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={index}
              ref={(el) => (tabRefs.current[index] = el)}
              role="tab"
              type="button"
              className={tabClasses}
              aria-selected={isActive}
              aria-controls={`${idBase}-tabpanel-${index}`}
              id={`${idBase}-tab-${index}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabClick(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.props.label}
            </button>
          )
        })}
      </div>

      <div className="tabview__content">
        {tabs.map((tab, index) => {
          const isActive = index === activeTab
          return (
            <div
              key={index}
              role="tabpanel"
              id={`${idBase}-tabpanel-${index}`}
              aria-labelledby={`${idBase}-tab-${index}`}
              className={`tabview__panel ${isActive ? 'tabview__panel--active' : ''}`}
              hidden={!isActive}
              tabIndex={0}
            >
              {tab.props.children}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// eslint-disable-next-line no-unused-vars
TabView.Tab = function TabViewTab({ children, label }) {
  return null
}

export default TabView
