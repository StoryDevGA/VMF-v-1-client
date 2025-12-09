import { useState, useMemo } from 'react'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Select } from '../../components/Select'
import { Radio } from '../../components/Radio'
import { Tickbox } from '../../components/Tickbox'
import { Button } from '../../components/Button'
import { VMFNavbar } from '../../components/VMFNavbar'
import { required, email, phone, minLength, maxLength, compose, validateForm } from '../../utils/validation'
import './VMF.css'

function VMFG() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    accountType: '',
    bio: '',
    newsletter: false,
    terms: false
  })

  const [errors, setErrors] = useState({})

  // Country options
  const countryOptions = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
    { value: 'jp', label: 'Japan' },
    { value: 'other', label: 'Other' },
  ]

  // Get country label from value
  const getCountryLabel = (value) => {
    const country = countryOptions.find(c => c.value === value)
    return country ? country.label : '-'
  }

  // Check if form is valid
  const isFormValid = useMemo(() => {
    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== null && error !== '')

    // Check if all required fields are filled
    const requiredFields = ['firstName', 'lastName', 'email', 'country', 'accountType', 'terms']
    const allRequiredFilled = requiredFields.every(field => {
      const value = formData[field]
      if (typeof value === 'boolean') return value === true
      return value !== '' && value !== null && value !== undefined
    })

    return !hasErrors && allRequiredFilled
  }, [formData, errors])

  // Define validation rules for each field
  const validationRules = {
    firstName: compose(
      (value) => required(value, 'First name'),
      minLength(2)
    ),
    lastName: compose(
      (value) => required(value, 'Last name'),
      minLength(2)
    ),
    email: compose(
      (value) => required(value, 'Email'),
      email
    ),
    phone: phone,
    country: (value) => required(value, 'Country'),
    accountType: (value) => required(value, 'Account type'),
    bio: maxLength(500),
    terms: (value) => {
      if (!value) return 'You must accept the terms and conditions'
      return null
    },
  }

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))

    // Real-time validation
    if (validationRules[field]) {
      const error = validationRules[field](value, field)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validate entire form
    const newErrors = validateForm(formData, validationRules)

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    console.log('Form submitted:', formData)
    alert('Form submitted successfully! Check console for data.')
  }

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: '',
      accountType: '',
      bio: '',
      newsletter: false,
      terms: false
    })
    setErrors({})
  }

  return (
    <div className="container vmf">
      <h1 className="vmf__title">VMF-G: Complete Form</h1>
      <p className="vmf__subtitle">Comprehensive form using all available components</p>

      <VMFNavbar />

      <Fieldset variant="outlined">
        <Fieldset.Legend>User Registration Form</Fieldset.Legend>
        <Fieldset.Content>
          <div className="vmf__split-layout">
            {/* Left Panel - Form Information */}
            <div className="vmf__split-left">
              <h3 className="vmf__form-section-title">Form Preview</h3>
              <div className="vmf__form-section">
                <h4>Personal Information</h4>
                <p><strong>First Name:</strong> {formData.firstName || '-'}</p>
                <p><strong>Last Name:</strong> {formData.lastName || '-'}</p>
                <p><strong>Email:</strong> {formData.email || '-'}</p>
                <p><strong>Phone:</strong> {formData.phone || '-'}</p>
                <p><strong>Country:</strong> {getCountryLabel(formData.country)}</p>
              </div>
              <div className="vmf__form-section">
                <h4>Account Type</h4>
                <p>{formData.accountType ? formData.accountType.charAt(0).toUpperCase() + formData.accountType.slice(1) : '-'}</p>
              </div>
              <div className="vmf__form-section">
                <h4>Bio</h4>
                <p>{formData.bio || '-'}</p>
              </div>
              <div className="vmf__form-section">
                <h4>Preferences</h4>
                <p><strong>Newsletter:</strong> {formData.newsletter ? 'Yes' : 'No'}</p>
                <p><strong>Terms Accepted:</strong> {formData.terms ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* Right Panel - Form */}
            <div className="vmf__split-right">
              <form onSubmit={handleSubmit} className="vmf__form">

            {/* Personal Information Section */}
            <div className="vmf__form-section">
              <h3 className="vmf__form-section-title">Personal Information</h3>

              <div className="vmf__form-grid">
                <Input
                  label="First Name"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  error={errors.firstName}
                  required
                  fullWidth
                />
                <Input
                  label="Last Name"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  error={errors.lastName}
                  required
                  fullWidth
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange('email')}
                error={errors.email}
                helperText="We'll never share your email with anyone else"
                required
                fullWidth
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={handleChange('phone')}
                error={errors.phone}
                helperText="Optional - for account recovery (min 10 digits)"
                fullWidth
              />

              <Select
                label="Country"
                value={formData.country}
                onChange={handleChange('country')}
                error={errors.country}
                required
                fullWidth
                placeholder="Select a country"
                options={countryOptions}
              />
            </div>

            {/* Account Type Section */}
            <div className="vmf__form-section">
              <h3 className="vmf__form-section-title">Account Type</h3>

              <Radio
                name="accountType"
                value="personal"
                label="Personal Account"
                checked={formData.accountType === 'personal'}
                onChange={handleChange('accountType')}
              />

              <Radio
                name="accountType"
                value="business"
                label="Business Account"
                checked={formData.accountType === 'business'}
                onChange={handleChange('accountType')}
              />

              <Radio
                name="accountType"
                value="enterprise"
                label="Enterprise Account"
                checked={formData.accountType === 'enterprise'}
                onChange={handleChange('accountType')}
              />

              {errors.accountType && (
                <div className="vmf__form-error">
                  {errors.accountType}
                </div>
              )}
            </div>

            {/* About You Section */}
            <div className="vmf__form-section">
              <h3 className="vmf__form-section-title">About You</h3>

              <Textarea
                label="Bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={handleChange('bio')}
                error={errors.bio}
                rows={6}
                helperText={`${formData.bio.length}/500 characters`}
                fullWidth
              />
            </div>

            {/* Preferences Section */}
            <div className="vmf__form-section">
              <h3 className="vmf__form-section-title">Preferences</h3>

              <Tickbox
                label="Subscribe to newsletter for updates and promotions"
                checked={formData.newsletter}
                onChange={handleChange('newsletter')}
              />

              <Tickbox
                label="I agree to the Terms and Conditions and Privacy Policy"
                checked={formData.terms}
                onChange={handleChange('terms')}
              />

              {errors.terms && (
                <div className="vmf__form-error">
                  {errors.terms}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="vmf__form-actions">
              <Button
                type="button"
                variant="outlined"
                onClick={handleReset}
              >
                Reset Form
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!isFormValid}
              >
                Submit Registration
              </Button>
            </div>
          </form>
            </div>
          </div>
        </Fieldset.Content>
      </Fieldset>
    </div>
  )
}

export default VMFG
