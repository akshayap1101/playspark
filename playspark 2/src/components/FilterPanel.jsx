import { useState } from 'react'

function ageLabel(age) {
  if (age < 2) {
    const months = Math.round(age * 12)
    return `${months} months`
  }
  return `${age.toFixed(age % 1 === 0 ? 0 : 1)} years`
}

const SEGMENTS = {
  type: [
    { value: 'either', label: 'Either' },
    { value: 'educational', label: 'Educational' },
    { value: 'fun', label: 'Fun' },
  ],
  assistance: [
    { value: 'either', label: "Doesn't matter" },
    { value: 'no', label: 'Independent play' },
    { value: 'yes', label: "I'll help" },
  ],
  gender: [
    { value: 'either', label: "Doesn't matter" },
    { value: 'girl', label: 'Girl' },
    { value: 'boy', label: 'Boy' },
  ],
}

function Segmented({ name, options, value, onChange }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`segmented-option ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function FilterPanel({ filters, onChange, onSubmit, matchCount }) {
  const [age, setAge] = useState(filters.age)

  const update = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="filter-panel">
      <div className="brand">
        <span className="brand-mark">✦</span>
        <h1>PlaySpark</h1>
      </div>
      <p className="tagline">Screen-free ideas in one tap.</p>

      <div className="field">
        <div className="field-label-row">
          <label htmlFor="age">Child's age</label>
          <span className="age-value">{ageLabel(age)}</span>
        </div>
        <input
          id="age"
          type="range"
          min="0.6"
          max="15"
          step="0.1"
          value={age}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            setAge(v)
            update({ age: v })
          }}
        />
      </div>

      <div className="field">
        <label>Type</label>
        <Segmented
          name="type"
          options={SEGMENTS.type}
          value={filters.type}
          onChange={(v) => update({ type: v })}
        />
      </div>

      <div className="field">
        <label>Parent assistance</label>
        <Segmented
          name="assistance"
          options={SEGMENTS.assistance}
          value={filters.assistance}
          onChange={(v) => update({ assistance: v })}
        />
      </div>

      <div className="field">
        <label>Gender <span className="hint">(content doesn't change — purely optional)</span></label>
        <Segmented
          name="gender"
          options={SEGMENTS.gender}
          value={filters.gender}
          onChange={(v) => update({ gender: v })}
        />
      </div>

      <button className="primary-btn" onClick={onSubmit}>
        Get an idea
      </button>
      {typeof matchCount === 'number' && (
        <p className="match-hint">{matchCount} idea{matchCount === 1 ? '' : 's'} match right now</p>
      )}
    </div>
  )
}
