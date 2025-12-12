/**
 * BrandSwitcher Component
 *
 * Simple component for manually selecting brand themes.
 * Uses localStorage to persist selection.
 */

import { useState, useEffect } from 'react'
import './BrandSwitcher.css'

const BRANDS = [
  { id: 'default', name: 'Default', theme: null },
  { id: 'corporate', name: 'Corporate Blue', theme: 'brand-corporate' },
  { id: 'vibrant', name: 'Vibrant Coral', theme: 'brand-vibrant' },
  { id: 'emerald', name: 'Emerald Green', theme: 'brand-emerald' },
  { id: 'royal', name: 'Royal Purple', theme: 'brand-royal' },
  { id: 'warm', name: 'Warm Amber', theme: 'brand-warm' },
]

export function BrandSwitcher() {
  const [selectedBrand, setSelectedBrand] = useState(() => {
    // Load from localStorage or default
    return localStorage.getItem('selected-brand') || 'default'
  })

  useEffect(() => {
    // Apply theme to document
    const brand = BRANDS.find(b => b.id === selectedBrand)
    if (brand) {
      if (brand.theme) {
        document.documentElement.setAttribute('data-theme', brand.theme)
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
      localStorage.setItem('selected-brand', selectedBrand)
    }
  }, [selectedBrand])

  return (
    <div className="brand-switcher">
      <label htmlFor="brand-select" className="brand-switcher__label">
        Brand Theme
      </label>
      <select
        id="brand-select"
        className="brand-switcher__select"
        value={selectedBrand}
        onChange={(e) => setSelectedBrand(e.target.value)}
      >
        {BRANDS.map(brand => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>
    </div>
  )
}
