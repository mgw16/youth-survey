import { useState, useEffect } from 'react'

// Renders one question and reports answers up via onAnswer.
// `value` is the current answer (or undefined).
export default function Question({ q, value, onAnswer }) {
  switch (q.type) {
    case 'yes_no':
      return <ChoiceButtons q={q} value={value} onAnswer={onAnswer} options={[
        { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
    case 'yes_no_unsure':
      return <ChoiceButtons q={q} value={value} onAnswer={onAnswer} options={[
        { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unsure', label: 'Unsure' }]} />
    case 'single_choice':
      return <ChoiceButtons q={q} value={value} onAnswer={onAnswer} options={q.options} />
    case 'multi_choice':
      return <MultiChoice q={q} value={value} onAnswer={onAnswer} />
    case 'scale':
      return <Scale q={q} value={value} onAnswer={onAnswer} />
    case 'number':
      return <NumberField q={q} value={value} onAnswer={onAnswer} />
    case 'target':
      return <Target q={q} value={value} onAnswer={onAnswer} />
    case 'info':
      return (
        <p className="info-note">
          This is an information step — read the above, then continue.
        </p>
      )
    case 'text':
      return <TextField q={q} value={value} onAnswer={onAnswer} />
    default:
      return <p className="muted">Unsupported question type: {q.type}</p>
  }
}

function ChoiceButtons({ value, onAnswer, options }) {
  return (
    <div className="choices">
      {options.map((o) => (
        <button
          key={o.value}
          className={'choice' + (value === o.value ? ' selected' : '')}
          onClick={() => onAnswer(o.value)}
        >
          <span>{o.label}</span>
          {value === o.value && <span className="tick">✓</span>}
        </button>
      ))}
    </div>
  )
}

function MultiChoice({ value, onAnswer, q }) {
  const selected = Array.isArray(value) ? value : []
  const toggle = (v) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
    onAnswer(next)
  }
  return (
    <div className="choices">
      {q.options.map((o) => (
        <button
          key={o.value}
          className={'choice' + (selected.includes(o.value) ? ' selected' : '')}
          onClick={() => toggle(o.value)}
        >
          <span>{o.label}</span>
          {selected.includes(o.value) && <span className="tick">✓</span>}
        </button>
      ))}
    </div>
  )
}

function Scale({ value, onAnswer, q }) {
  const o = q.options || {}
  const min = o.min ?? 1
  const max = o.max ?? 5
  const nums = []
  for (let i = min; i <= max; i++) nums.push(i)
  return (
    <div>
      <div className="scale">
        {nums.map((n) => (
          <button key={n} className={value === n ? 'selected' : ''} onClick={() => onAnswer(n)}>{n}</button>
        ))}
      </div>
      <div className="scale-labels">
        <span>{o.minLabel || min}</span>
        <span>{o.maxLabel || max}</span>
      </div>
    </div>
  )
}

function NumberField({ value, onAnswer, q }) {
  const [local, setLocal] = useState(value ?? '')
  useEffect(() => { setLocal(value ?? '') }, [value])
  const o = q.options || {}
  return (
    <div className="field-row">
      <input
        className="field"
        type="number"
        inputMode="decimal"
        min={o.min}
        max={o.max}
        value={local}
        placeholder="Enter a number"
        onChange={(e) => {
          setLocal(e.target.value)
          onAnswer(e.target.value === '' ? undefined : Number(e.target.value))
        }}
      />
      {o.unit && <span className="unit">{o.unit}</span>}
    </div>
  )
}

function Target({ value, onAnswer, q }) {
  const o = q.options || {}
  const min = o.min ?? 0
  const max = o.max ?? 100
  const step = o.step ?? 1
  const unit = o.unit || ''
  const direction = o.direction || 'increase'

  const v = value && typeof value === 'object' ? value : {}
  const [current, setCurrent] = useState(v.current ?? o.currentDefault ?? '')
  const [target, setTarget] = useState(v.target ?? v.current ?? o.currentDefault ?? min)

  const push = (c, t) => {
    const cNum = c === '' ? undefined : Number(c)
    onAnswer({ current: cNum, target: Number(t) })
  }

  const curNum = current === '' ? null : Number(current)
  const tgtNum = Number(target)
  const hasBoth = curNum != null && !Number.isNaN(curNum) && !Number.isNaN(tgtNum)
  const delta = hasBoth ? (direction === 'decrease' ? curNum - tgtNum : tgtNum - curNum) : 0
  const pct = hasBoth && curNum !== 0 ? (delta / curNum) * 100 : 0
  const improving = delta > 0

  return (
    <div className="target">
      <label className="target-label">{o.currentLabel || 'Current'}</label>
      <div className="field-row" style={{ marginBottom: 22 }}>
        <input
          className="field"
          type="number"
          inputMode="decimal"
          value={current}
          placeholder="Current value"
          onChange={(e) => { setCurrent(e.target.value); push(e.target.value, target) }}
          style={{ maxWidth: 200 }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>

      <label className="target-label">{o.targetLabel || 'Target'}</label>
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={target}
        onChange={(e) => { setTarget(e.target.value); push(current, e.target.value) }}
      />
      <div className="slider-scale">
        <span>{min}{unit}</span>
        <span className="target-value">{tgtNum}{unit}</span>
        <span>{max}{unit}</span>
      </div>

      <div className={'improvement' + (hasBoth ? (improving ? ' up' : delta < 0 ? ' down' : '') : ' is-muted')}>
        {!hasBoth ? (
          <span>Enter your current value and slide to a target to see the change.</span>
        ) : delta === 0 ? (
          <span>No change from current.</span>
        ) : (
          <span>
            <b>{improving ? 'Improvement' : 'Change'}: {improving ? '+' : ''}{round(delta)}{unit}</b>
            {' '}({improving ? '+' : ''}{round(pct)}%) {direction === 'decrease' ? 'reduction' : 'lift'} from {round(curNum)}{unit} to {round(tgtNum)}{unit}
          </span>
        )}
      </div>
    </div>
  )
}

function round(n) { return Math.round(n * 10) / 10 }

function TextField({ value, onAnswer }) {
  const [local, setLocal] = useState(value ?? '')
  useEffect(() => { setLocal(value ?? '') }, [value])
  return (
    <textarea
      className="field"
      rows={4}
      value={local}
      placeholder="Type your answer…"
      onChange={(e) => { setLocal(e.target.value); onAnswer(e.target.value || undefined) }}
    />
  )
}
