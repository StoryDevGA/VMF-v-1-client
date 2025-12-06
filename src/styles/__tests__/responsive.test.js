/**
 * Responsive Design Tests
 *
 * Purpose: Verify responsive utilities and mobile-first approach
 * Tests utility classes, breakpoints, and responsive behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Responsive Design System', () => {
  let testElement

  beforeEach(() => {
    testElement = document.createElement('div')
    document.body.appendChild(testElement)
  })

  afterEach(() => {
    document.body.removeChild(testElement)
  })

  describe('Container Utility', () => {
    it('should apply container styles', () => {
      testElement.className = 'container'
      const styles = getComputedStyle(testElement)

      expect(styles.width).toBeTruthy()
      expect(styles.marginLeft).toBe('auto')
      expect(styles.marginRight).toBe('auto')
    })

    it('should have responsive padding', () => {
      testElement.className = 'container'
      const styles = getComputedStyle(testElement)

      // Should have padding from design tokens
      expect(styles.paddingLeft).toBeTruthy()
      expect(styles.paddingRight).toBeTruthy()
    })
  })

  describe('Grid Utilities', () => {
    it('should apply grid display', () => {
      testElement.className = 'grid'
      const styles = getComputedStyle(testElement)

      expect(styles.display).toBe('grid')
    })

    it('should apply grid-cols-1', () => {
      testElement.className = 'grid grid-cols-1'
      const styles = getComputedStyle(testElement)

      expect(styles.gridTemplateColumns).toBeTruthy()
    })

    it('should apply grid-cols-2', () => {
      testElement.className = 'grid grid-cols-2'
      const styles = getComputedStyle(testElement)

      expect(styles.gridTemplateColumns).toBeTruthy()
    })
  })

  describe('Flexbox Utilities', () => {
    it('should apply flex display', () => {
      testElement.className = 'flex'
      const styles = getComputedStyle(testElement)

      expect(styles.display).toBe('flex')
    })

    it('should apply flex-col', () => {
      testElement.className = 'flex flex-col'
      const styles = getComputedStyle(testElement)

      expect(styles.flexDirection).toBe('column')
    })

    it('should apply flex-wrap', () => {
      testElement.className = 'flex flex-wrap'
      const styles = getComputedStyle(testElement)

      expect(styles.flexWrap).toBe('wrap')
    })
  })

  describe('Display Utilities', () => {
    it('should hide mobile content by default', () => {
      testElement.className = 'hidden-mobile'
      const styles = getComputedStyle(testElement)

      expect(styles.display).toBe('none')
    })

    it('should show mobile content by default', () => {
      testElement.className = 'visible-mobile'
      const styles = getComputedStyle(testElement)

      expect(styles.display).toBe('block')
    })

    it('should hide tablet content by default', () => {
      testElement.className = 'hidden-tablet'
      const styles = getComputedStyle(testElement)

      expect(styles.display).toBe('none')
    })
  })

  describe('Aspect Ratio Utilities', () => {
    it('should apply aspect-video ratio', () => {
      testElement.className = 'aspect-video'
      const styles = getComputedStyle(testElement)

      expect(styles.aspectRatio).toBe('16 / 9')
    })

    it('should apply aspect-square ratio', () => {
      testElement.className = 'aspect-square'
      const styles = getComputedStyle(testElement)

      expect(styles.aspectRatio).toBe('1 / 1')
    })

    it('should apply aspect-portrait ratio', () => {
      testElement.className = 'aspect-portrait'
      const styles = getComputedStyle(testElement)

      expect(styles.aspectRatio).toBe('3 / 4')
    })
  })

  describe('Responsive Image Utilities', () => {
    it('should apply img-responsive styles', () => {
      testElement.className = 'img-responsive'
      const styles = getComputedStyle(testElement)

      expect(styles.maxWidth).toBe('100%')
      expect(styles.height).toBe('auto')
      expect(styles.display).toBe('block')
    })
  })

  describe('Text Utilities', () => {
    it('should apply text-nowrap', () => {
      testElement.className = 'text-nowrap'
      const styles = getComputedStyle(testElement)

      expect(styles.whiteSpace).toBe('nowrap')
    })

    it('should apply text-truncate', () => {
      testElement.className = 'text-truncate'
      const styles = getComputedStyle(testElement)

      expect(styles.overflow).toBe('hidden')
      expect(styles.textOverflow).toBe('ellipsis')
      expect(styles.whiteSpace).toBe('nowrap')
    })

    it('should center text on mobile', () => {
      testElement.className = 'text-center-mobile'
      const styles = getComputedStyle(testElement)

      expect(styles.textAlign).toBe('center')
    })
  })

  describe('Responsive Typography', () => {
    it('should apply responsive XL text size', () => {
      testElement.className = 'text-responsive-xl'
      const styles = getComputedStyle(testElement)

      expect(styles.fontSize).toBeTruthy()
      expect(styles.lineHeight).toBeTruthy()
    })

    it('should apply responsive LG text size', () => {
      testElement.className = 'text-responsive-lg'
      const styles = getComputedStyle(testElement)

      expect(styles.fontSize).toBeTruthy()
      expect(styles.lineHeight).toBeTruthy()
    })
  })

  describe('Responsive Spacing', () => {
    it('should apply responsive padding', () => {
      testElement.className = 'p-responsive'
      const styles = getComputedStyle(testElement)

      expect(styles.padding).toBeTruthy()
    })

    it('should apply responsive margin', () => {
      testElement.className = 'm-responsive'
      const styles = getComputedStyle(testElement)

      expect(styles.margin).toBeTruthy()
    })
  })

  describe('Mobile-First Approach', () => {
    it('should define mobile styles first (base styles)', () => {
      // Base styles should be applied without media queries
      testElement.className = 'grid'
      const styles = getComputedStyle(testElement)

      // Grid should work on all screen sizes
      expect(styles.display).toBe('grid')
    })

    it('should use CSS custom properties for consistency', () => {
      const computedStyles = getComputedStyle(document.documentElement)

      // Breakpoints should be defined
      expect(computedStyles.getPropertyValue('--breakpoint-sm')).toBeTruthy()
      expect(computedStyles.getPropertyValue('--breakpoint-md')).toBeTruthy()
      expect(computedStyles.getPropertyValue('--breakpoint-lg')).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should maintain block display for screen readers', () => {
      // Even hidden elements should be accessible
      testElement.className = 'sr-only'
      const styles = getComputedStyle(testElement)

      // Should be visually hidden but accessible
      expect(styles.position).toBe('absolute')
    })
  })
})
