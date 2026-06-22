import { useEffect, useState } from 'react'
import { SURVEYS } from '../config/surveys.js'
import { BRAND } from '../config/brand.js'
import { createGrower, saveAnswer, fetchOverrides, fetchBuilder, isLive } from '../lib/store.js'
import { assembleSurveys } from '../lib/assemble.js'
import Question from './Question.jsx'

export default function SurveyApp() {
  const [phase, setPhase] = useState('loading') // loading | welcome | sectionIntro | questions | propertyDone | done
  const [surveys, setSurveys] = useState(SURVEYS)
  const [name, setName] = useState('')
  const [properties, setProperties] = useState([]) // property names entered up front
  const [propIndex, setPropIndex] = useState(0)
  const [grower, setGrower] = useState(null)       // grower row for the CURRENT property
  const [sectionIdx, setSectionIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [stack, setStack] = useState([])           // visited question ids in current section
  const [acked, setAcked] = useState(new Set())    // instructions read (persists across properties)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Load host edits + custom-built sections/questions, assemble the full survey.
  useEffect(() => {
    let active = true
    Promise.all([fetchOverrides(), fetchBuilder()])
      .then(([ov, custom]) => {
        if (!active) return
        setSurveys(assembleSurveys(SURVEYS, ov, custom))
      })
      .catch(() => {})
      .finally(() => active && setPhase('welcome'))
    return () => { active = false }
  }, [])

  const survey = surveys[sectionIdx]
  const multi = properties.length > 1
  const currentId = stack[stack.length - 1]
  const currentQ = survey?.questions.find((q) => q.id === currentId)

  if (phase === 'loading') {
    return <div className="container center muted" style={{ paddingTop: 80 }}>Loading…</div>
  }

  if (phase === 'welcome') {
    return <Welcome busy={busy} error={error} onStart={async (gName, propList) => {
      setError(''); setBusy(true)
      try {
        const g = await createGrower(gName, propList[0])
        setName(gName); setProperties(propList); setPropIndex(0); setGrower(g)
        setSectionIdx(0); setAnswers({}); setStack([]); setPhase('sectionIntro')
      } catch (e) {
        setError('Could not start. ' + (e.message || 'Please try again.'))
      } finally { setBusy(false) }
    }} />
  }

  if (phase === 'sectionIntro') {
    return (
      <SectionIntro
        section={survey} index={sectionIdx} total={surveys.length}
        multi={multi} property={properties[propIndex]} propIndex={propIndex} propTotal={properties.length}
        onBegin={() => { setStack([survey.questions[0].id]); setPhase('questions') }}
      />
    )
  }

  if (phase === 'propertyDone') {
    return (
      <PropertyDone
        done={propIndex + 1} total={properties.length} nextName={properties[propIndex + 1]} busy={busy}
        onContinue={async () => {
          setBusy(true); setError('')
          try {
            const np = propIndex + 1
            const g = await createGrower(name, properties[np])
            setPropIndex(np); setGrower(g); setSectionIdx(0); setAnswers({}); setStack([]); setPhase('sectionIntro')
          } catch (e) {
            setError('Could not continue. ' + (e.message || ''))
          } finally { setBusy(false) }
        }}
      />
    )
  }

  if (phase === 'done') return <Complete name={name} multi={multi} count={properties.length} />

  // ---- Questions ----
  const idxInList = survey.questions.findIndex((q) => q.id === currentId)
  const progress = Math.round(((idxInList + 1) / survey.questions.length) * 100)
  const needsAck = Boolean(currentQ.instructions) && !acked.has(currentQ.id)
  const answered = isAnswered(currentQ, answers[currentQ.id])
  const canContinue = !needsAck && (currentQ.required === false || answered)

  async function commitAndAdvance() {
    setError('')
    const value = answers[currentQ.id]
    setBusy(true)
    try {
      if (value !== undefined) await saveAnswer(grower.id, survey.id, currentQ.id, value)
    } catch (e) {
      setError('Could not save that answer. ' + (e.message || '')); setBusy(false); return
    }
    setBusy(false)

    let nextId
    if (typeof currentQ.branch === 'function') {
      const r = currentQ.branch(value, answers)
      if (r === 'END') return finishSection()
      if (typeof r === 'string') nextId = r
    }
    if (!nextId) {
      const next = survey.questions[idxInList + 1]
      if (!next) return finishSection()
      nextId = next.id
    }
    setStack((s) => [...s, nextId])
  }

  function finishSection() {
    if (surveys[sectionIdx + 1]) {
      setSectionIdx((i) => i + 1)
      setStack([])
      setPhase('sectionIntro')
    } else {
      // Last section of this property is done.
      if (propIndex + 1 < properties.length) setPhase('propertyDone')
      else setPhase('done')
    }
  }

  function back() {
    if (stack.length > 1) setStack((s) => s.slice(0, -1))
    else setPhase('sectionIntro')
  }

  return (
    <div className="container">
      <div className="eyebrow">
        {multi && <>Property {propIndex + 1} of {properties.length} · {properties[propIndex]} · </>}
        Section {sectionIdx + 1} of {surveys.length} · {survey.title}
      </div>
      <div className="progress"><span style={{ width: progress + '%' }} /></div>

      <div className="qcard">
        <div className="qsection">{currentQ.section}</div>
        <div className="qprompt">{currentQ.prompt}</div>
        {currentQ.help && <div className="qhelp">{currentQ.help}</div>}

        {currentQ.instructions && (
          <InstructionBox text={currentQ.instructions} needsAck={needsAck} onAck={() => setAcked((s) => new Set(s).add(currentQ.id))} />
        )}

        <div className={needsAck ? 'locked' : ''} aria-hidden={needsAck}>
          <Question q={currentQ} value={answers[currentQ.id]} onAnswer={(v) => setAnswers((a) => ({ ...a, [currentQ.id]: v }))} />
        </div>

        {error && <div className="banner" style={{ marginTop: 18 }}>{error}</div>}

        <div className="nav">
          <button className="btn ghost" onClick={back} disabled={busy}>← Back</button>
          <button className="btn" onClick={commitAndAdvance} disabled={busy || !canContinue}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>

      {needsAck && (
        <p className="muted center" style={{ marginTop: 14, fontSize: 14 }}>
          Please read the instructions above, then tap “I’ve read this” to answer.
        </p>
      )}
    </div>
  )
}

/* --------------------------------- screens -------------------------------- */

function SectionIntro({ section, index, total, multi, property, propIndex, propTotal, onBegin }) {
  return (
    <div className="container">
      <div className="section-hero">
        <div className="section-kicker">Section {index + 1} of {total}</div>
        <h1 className="section-title">{section.title}</h1>
        {multi && (
          <div className="prop-chip">Property {propIndex + 1} of {propTotal}: <b>{property}</b></div>
        )}
        {section.intro && <p className="section-intro-text">{section.intro}</p>}
        <button className="btn section-begin" onClick={onBegin}>
          {index === 0 ? 'Begin' : 'Start this section'} →
        </button>
      </div>
    </div>
  )
}

function PropertyDone({ done, total, nextName, onContinue, busy }) {
  return (
    <div className="container center">
      <div className="eyebrow">Property {done} of {total} complete ✓</div>
      <h1 style={{ fontSize: 32, margin: '8px 0 14px' }}>That property’s done.</h1>
      <p className="muted" style={{ maxWidth: 460, margin: '0 auto 22px' }}>
        Now let’s do the same for your next property. The questions are the same — just answer them
        for this property.
      </p>
      <div className="prop-chip big" style={{ marginBottom: 24 }}>{nextName}</div>
      <div>
        <button className="btn" onClick={onContinue} disabled={busy}>
          {busy ? 'Loading…' : `Continue to ${nextName}`} →
        </button>
      </div>
    </div>
  )
}

function InstructionBox({ text, needsAck, onAck }) {
  const [open, setOpen] = useState(true)
  if (!needsAck && !open) {
    return <button className="instr-toggle" onClick={() => setOpen(true)}>ⓘ View instructions</button>
  }
  return (
    <div className={'instr' + (needsAck ? ' must' : '')}>
      <div className="instr-head">
        <span className="instr-icon" aria-hidden="true">ⓘ</span>
        <span>Read before answering</span>
        {!needsAck && <button className="instr-close" onClick={() => setOpen(false)} aria-label="Hide instructions">×</button>}
      </div>
      <div className="instr-body">{text}</div>
      {needsAck && <button className="btn" style={{ marginTop: 14 }} onClick={onAck}>I’ve read this</button>}
    </div>
  )
}

function isAnswered(q, v) {
  if (q.type === 'info') return true
  if (v === undefined || v === null || v === '') return false
  if (Array.isArray(v)) return v.length > 0
  if (q.type === 'target') {
    return v && typeof v === 'object' &&
      typeof v.current === 'number' && !Number.isNaN(v.current) &&
      typeof v.target === 'number' && !Number.isNaN(v.target)
  }
  return true
}

function Welcome({ onStart, busy, error }) {
  const [name, setName] = useState('')
  const [props, setProps] = useState([''])

  const setProp = (i, v) => setProps((p) => p.map((x, idx) => (idx === i ? v : x)))
  const addProp = () => setProps((p) => [...p, ''])
  const removeProp = (i) => setProps((p) => p.filter((_, idx) => idx !== i))

  const allFilled = props.every((s) => s.trim().length > 0)
  const ready = name.trim().length > 0 && allFilled

  return (
    <div className="container">
      <div className="eyebrow">{BRAND.name} · Before we start</div>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Your environmental planning self-assessment</h1>
      <p className="muted" style={{ marginBottom: 14, maxWidth: 580 }}>
        This survey has two sections — tree-planting carbon eligibility, then productivity.
        Your answers save as you go and feed straight into the discussion we’ll have together.
      </p>
      <div className="banner" style={{ marginBottom: 22 }}>
        Please complete the survey <b>once for each property</b> you own or manage. List all your
        properties below and you’ll be guided through the questions for each one in turn.
      </div>

      <div className="qcard">
        <label className="qsection" htmlFor="g-name">Your name</label>
        <input id="g-name" className="field" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sam Patterson" style={{ marginBottom: 22 }} />

        <label className="qsection">Your properties</label>
        <p className="muted" style={{ fontSize: 14, margin: '0 0 12px' }}>
          Add every property you’d like to assess. Each one needs a name.
        </p>
        {props.map((p, i) => (
          <div className="prop-row" key={i}>
            <span className="prop-num mono">{i + 1}</span>
            <input className="field" value={p} onChange={(e) => setProp(i, e.target.value)}
              placeholder={`Property ${i + 1} name`} />
            {props.length > 1 && (
              <button className="prop-remove" onClick={() => removeProp(i)} aria-label={`Remove property ${i + 1}`}>×</button>
            )}
          </div>
        ))}
        <button className="btn subtle add-prop" onClick={addProp}>+ Add another property</button>

        {error && <div className="banner" style={{ marginTop: 18 }}>{error}</div>}
        <div className="nav">
          <span className="muted" style={{ fontSize: 13 }}>{isLive ? '' : 'Demo mode — answers stay on this device.'}</span>
          <button className="btn" disabled={busy || !ready}
            onClick={() => onStart(name.trim(), props.map((s) => s.trim()).filter(Boolean))}>
            {busy ? 'Starting…' : props.length > 1 ? `Start (${props.length} properties)` : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Complete({ name, multi, count }) {
  return (
    <div className="container center">
      <div className="eyebrow">All done</div>
      <h1 style={{ fontSize: 34, margin: '8px 0 14px' }}>Thanks{name ? ', ' + name.split(' ')[0] : ''}.</h1>
      <p className="muted" style={{ maxWidth: 480, margin: '0 auto 24px' }}>
        Your responses {multi ? `for all ${count} properties are` : 'are'} saved. We’ll bring the
        results together on screen and talk through what they mean.
      </p>
      <div className="qcard" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
        <div className="instr" style={{ margin: 0 }}>
          <div className="instr-head"><span className="instr-icon">ⓘ</span><span>One more check</span></div>
          <div className="instr-body">
            Have you completed this for <b>every</b> property you own or manage? If any property
            wasn’t covered, please run through the survey again for it by
            {' '}<button className="linkish" onClick={() => window.location.reload()}>starting again</button>.
          </div>
        </div>
        <p style={{ margin: '16px 0 0' }}>
          Otherwise you can close this tab, or hand the device to the next grower by starting again.
        </p>
      </div>
    </div>
  )
}
