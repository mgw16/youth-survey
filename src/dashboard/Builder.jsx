import { useState } from 'react'
import { SURVEYS } from '../config/surveys.js'
import { ovKey } from '../lib/overrides.js'
import {
  saveOverride, saveCustomSection, deleteCustomSection,
  saveCustomQuestion, deleteCustomQuestion,
} from '../lib/store.js'

const TYPES = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'yes_no_unsure', label: 'Yes / No / Unsure' },
  { value: 'single_choice', label: 'Multiple choice (pick one)' },
  { value: 'multi_choice', label: 'Multiple choice (pick many)' },
  { value: 'scale', label: 'Rating scale (1–5)' },
  { value: 'number', label: 'Number' },
  { value: 'target', label: 'Target slider (current → target, shows improvement)' },
  { value: 'text', label: 'Free text' },
  { value: 'info', label: 'Information / instructions (no answer)' },
]
const typeLabel = (t) => (TYPES.find((x) => x.value === t)?.label || t)
const hasOptions = (t) => t === 'single_choice' || t === 'multi_choice'
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export default function Builder({ overrides, custom, reload }) {
  const baseSections = SURVEYS.map((s) => ({ id: s.id, title: s.title, isBase: true, base: s }))
  const customSections = (custom.sections || [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((cs) => ({ id: cs.section_id, title: cs.title, intro: cs.intro, isBase: false, row: cs }))
  const allSections = [...baseSections, ...customSections]

  const questionsFor = (sectionId) =>
    (custom.questions || [])
      .filter((q) => q.section_id === sectionId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <div>
      <div className="banner" style={{ background: '#e9f0ea', borderColor: '#2f6b46', color: '#215034' }}>
        Build the survey here. <b>Reword</b> any existing question (its id stays fixed, so answers
        already collected stay matched). <b>Add</b> new questions and new sections of any type —
        these collect answers but don’t change the eligibility scoring. Changes are live for growers
        as soon as you save.
      </div>

      {allSections.map((sec) => (
        <SectionBlock
          key={sec.id}
          sec={sec}
          overrides={overrides}
          customQuestions={questionsFor(sec.id)}
          reload={reload}
        />
      ))}

      <AddSection nextPosition={customSections.length} reload={reload} />
    </div>
  )
}

function SectionBlock({ sec, overrides, customQuestions, reload }) {
  const [adding, setAdding] = useState(false)
  const [editingSection, setEditingSection] = useState(false)

  async function removeSection() {
    if (!confirm(`Delete the section “${sec.title}” and all its custom questions? This cannot be undone.`)) return
    await deleteCustomSection(sec.id)
    reload()
  }

  async function move(idx, dir) {
    const a = customQuestions[idx]
    const b = customQuestions[idx + dir]
    if (!a || !b) return
    await saveCustomQuestion({ ...a, position: b.position ?? 0 })
    await saveCustomQuestion({ ...b, position: a.position ?? 0 })
    reload()
  }

  return (
    <div className="bsection">
      <div className="bsection-head">
        <h3>{sec.title} {sec.isBase ? <span className="badge">built-in</span> : <span className="badge custom">custom section</span>}</h3>
        {!sec.isBase && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn subtle small" onClick={() => setEditingSection((v) => !v)}>{editingSection ? 'Close' : 'Edit section'}</button>
            <button className="btn subtle small danger" onClick={removeSection}>Delete section</button>
          </div>
        )}
      </div>

      {editingSection && !sec.isBase && (
        <EditSection row={sec.row} reload={reload} onDone={() => setEditingSection(false)} />
      )}

      {/* Base questions — reword only */}
      {sec.isBase && sec.base.questions.map((q) => (
        <BaseQuestionRow key={q.id} survey={sec.base} q={q} override={overrides[ovKey(sec.id, q.id)] || {}} reload={reload} />
      ))}

      {/* Custom questions — full edit/delete/reorder */}
      {customQuestions.map((cq, i) => (
        <CustomQuestionRow
          key={cq.question_id}
          cq={cq}
          canUp={i > 0}
          canDown={i < customQuestions.length - 1}
          onMove={(dir) => move(i, dir)}
          reload={reload}
        />
      ))}

      {adding ? (
        <QuestionForm
          sectionId={sec.id}
          nextPosition={customQuestions.length}
          onCancel={() => setAdding(false)}
          onSaved={() => { setAdding(false); reload() }}
        />
      ) : (
        <button className="btn subtle small add-q" onClick={() => setAdding(true)}>+ Add a question to this section</button>
      )}
    </div>
  )
}

/* ---------------------- base question (reword only) ----------------------- */

function BaseQuestionRow({ survey, q, override, reload }) {
  const [prompt, setPrompt] = useState(override.prompt ?? q.prompt)
  const [help, setHelp] = useState(override.help ?? q.help ?? '')
  const [instructions, setInstructions] = useState(override.instructions ?? q.instructions ?? '')
  const [optionLabels, setOptionLabels] = useState(() => {
    const base = {}
    if (Array.isArray(q.options)) for (const o of q.options) base[o.value] = override.optionLabels?.[o.value] ?? o.label
    return base
  })
  const [state, setState] = useState('idle') // idle | saving | saved

  async function save() {
    setState('saving')
    const fields = {
      prompt: prompt !== q.prompt ? prompt : undefined,
      help: help !== (q.help ?? '') ? help : undefined,
      instructions: instructions !== (q.instructions ?? '') ? instructions : undefined,
      optionLabels: Array.isArray(q.options)
        ? Object.fromEntries(q.options.filter((o) => optionLabels[o.value] !== o.label).map((o) => [o.value, optionLabels[o.value]]))
        : undefined,
    }
    if (fields.optionLabels && Object.keys(fields.optionLabels).length === 0) fields.optionLabels = undefined
    await saveOverride(survey.id, q.id, fields)
    setState('saved'); reload()
  }

  return (
    <div className="qed">
      <h4>{q.section} · <span className="qid">{q.id}</span> · {typeLabel(q.type)} <span className="badge">built-in</span></h4>
      <label>Question text</label>
      <textarea className="field" rows={2} value={prompt} onChange={(e) => { setPrompt(e.target.value); setState('idle') }} />
      <label>Helper text (optional)</label>
      <input className="field" value={help} onChange={(e) => { setHelp(e.target.value); setState('idle') }} />
      <label>Instructions box (optional — must be read before answering)</label>
      <textarea className="field" rows={2} value={instructions} onChange={(e) => { setInstructions(e.target.value); setState('idle') }} />
      {Array.isArray(q.options) && (
        <>
          <label>Answer labels (the value on the left never changes)</label>
          {q.options.map((o) => (
            <div className="opt-row" key={o.value}>
              <span className="val">{o.value}</span>
              <input className="field" value={optionLabels[o.value]} onChange={(e) => { setOptionLabels((m) => ({ ...m, [o.value]: e.target.value })); setState('idle') }} />
            </div>
          ))}
        </>
      )}
      <div className="qed-actions">
        <button className="btn small" onClick={save} disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save wording'}</button>
        {state === 'saved' && <span className="saved">✓ Saved</span>}
      </div>
    </div>
  )
}

/* ------------------------- custom question (full) ------------------------- */

function CustomQuestionRow({ cq, canUp, canDown, onMove, reload }) {
  const [editing, setEditing] = useState(false)
  async function remove() {
    if (!confirm('Delete this question? Any answers already given to it will no longer be shown.')) return
    await deleteCustomQuestion(cq.question_id)
    reload()
  }
  if (editing) {
    return (
      <QuestionForm
        sectionId={cq.section_id}
        existing={cq}
        onCancel={() => setEditing(false)}
        onSaved={() => { setEditing(false); reload() }}
      />
    )
  }
  return (
    <div className="qed custom">
      <h4>
        <span className="badge custom">custom</span> {typeLabel(cq.type)} · <span className="qid">{cq.question_id}</span>
      </h4>
      <div className="cq-prompt">{cq.prompt || <span className="muted">（no question text yet）</span>}</div>
      <div className="qed-actions">
        <button className="btn subtle small" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn subtle small" onClick={() => onMove(-1)} disabled={!canUp}>↑</button>
        <button className="btn subtle small" onClick={() => onMove(1)} disabled={!canDown}>↓</button>
        <button className="btn subtle small danger" onClick={remove}>Delete</button>
      </div>
    </div>
  )
}

/* ---------------------- add / edit a custom question ---------------------- */

function QuestionForm({ sectionId, existing, nextPosition = 0, onSaved, onCancel }) {
  const isEdit = Boolean(existing)
  const [type, setType] = useState(existing?.type || 'single_choice')
  const [prompt, setPrompt] = useState(existing?.prompt || '')
  const [help, setHelp] = useState(existing?.help || '')
  const [instructions, setInstructions] = useState(existing?.instructions || '')
  const [options, setOptions] = useState(() => {
    if (existing && Array.isArray(existing.options)) return existing.options
    return [{ value: uid('o_'), label: '' }, { value: uid('o_'), label: '' }]
  })
  const [cfg, setCfg] = useState(() => (existing && existing.options && !Array.isArray(existing.options)) ? existing.options : defaultConfig(existing?.type || 'single_choice'))
  const [busy, setBusy] = useState(false)

  function changeType(t) {
    setType(t)
    if (!Array.isArray(cfg)) setCfg(defaultConfig(t))
  }

  async function save() {
    setBusy(true)
    let opts
    if (hasOptions(type)) opts = options.filter((o) => o.label.trim()).map((o) => ({ value: o.value, label: o.label.trim() }))
    else if (type === 'scale' || type === 'number' || type === 'target') opts = cfg
    const row = {
      question_id: existing?.question_id || uid('cq_'),
      section_id: sectionId,
      type,
      prompt: prompt.trim(),
      help: help.trim() || null,
      instructions: instructions.trim() || null,
      options: opts || null,
      position: existing?.position ?? nextPosition,
    }
    await saveCustomQuestion(row)
    setBusy(false)
    onSaved()
  }

  const ready = prompt.trim().length > 0 && (!hasOptions(type) || options.filter((o) => o.label.trim()).length >= 2)

  return (
    <div className="qform">
      <div className="qform-head">{isEdit ? 'Edit question' : 'New question'}</div>

      <label>Type</label>
      {isEdit ? (
        <div className="field readonly">{typeLabel(type)} <span className="muted">(type can’t change once created)</span></div>
      ) : (
        <select className="field" value={type} onChange={(e) => changeType(e.target.value)}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      )}

      <label>{type === 'info' ? 'Statement / heading' : 'Question text'}</label>
      <textarea className="field" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={type === 'info' ? 'e.g. Please read the following before the next questions…' : 'Type the question…'} />

      <label>{type === 'info' ? 'Body text (optional)' : 'Helper text (optional)'}</label>
      <input className="field" value={help} onChange={(e) => setHelp(e.target.value)} />

      {type !== 'info' && (
        <>
          <label>Instructions box (optional — must be read before answering)</label>
          <textarea className="field" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </>
      )}

      {hasOptions(type) && <OptionEditor options={options} setOptions={setOptions} />}
      {type === 'scale' && <ScaleConfig cfg={cfg} setCfg={setCfg} />}
      {type === 'number' && <NumberConfig cfg={cfg} setCfg={setCfg} />}
      {type === 'target' && <TargetConfig cfg={cfg} setCfg={setCfg} />}

      <div className="qed-actions">
        <button className="btn small" onClick={save} disabled={busy || !ready}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add question'}</button>
        <button className="btn subtle small" onClick={onCancel}>Cancel</button>
        {!ready && <span className="muted" style={{ fontSize: 13 }}>{hasOptions(type) ? 'Add question text and at least two options.' : 'Add question text.'}</span>}
      </div>
    </div>
  )
}

function defaultConfig(type) {
  if (type === 'scale') return { min: 1, max: 5, minLabel: '', maxLabel: '' }
  if (type === 'number') return { unit: '', min: undefined, max: undefined }
  if (type === 'target') return { unit: '', currentLabel: 'Current', targetLabel: 'Target', min: 0, max: 100, step: 1, direction: 'increase', currentDefault: 0 }
  return undefined
}

function OptionEditor({ options, setOptions }) {
  const setLabel = (i, v) => setOptions((o) => o.map((x, idx) => (idx === i ? { ...x, label: v } : x)))
  const add = () => setOptions((o) => [...o, { value: uid('o_'), label: '' }])
  const remove = (i) => setOptions((o) => o.filter((_, idx) => idx !== i))
  return (
    <div>
      <label>Answer options</label>
      {options.map((o, i) => (
        <div className="opt-row" key={o.value}>
          <input className="field" value={o.label} onChange={(e) => setLabel(i, e.target.value)} placeholder={`Option ${i + 1}`} />
          {options.length > 2 && <button className="prop-remove" onClick={() => remove(i)} aria-label="Remove option">×</button>}
        </div>
      ))}
      <button className="btn subtle small" onClick={add}>+ Add option</button>
    </div>
  )
}

function ScaleConfig({ cfg, setCfg }) {
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  return (
    <div className="cfg-grid">
      <div><label>Lowest number</label><input className="field" type="number" value={cfg.min} onChange={(e) => set('min', Number(e.target.value))} /></div>
      <div><label>Highest number</label><input className="field" type="number" value={cfg.max} onChange={(e) => set('max', Number(e.target.value))} /></div>
      <div><label>Label for lowest</label><input className="field" value={cfg.minLabel} onChange={(e) => set('minLabel', e.target.value)} placeholder="e.g. Not confident" /></div>
      <div><label>Label for highest</label><input className="field" value={cfg.maxLabel} onChange={(e) => set('maxLabel', e.target.value)} placeholder="e.g. Very confident" /></div>
    </div>
  )
}

function NumberConfig({ cfg, setCfg }) {
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  return (
    <div className="cfg-grid">
      <div><label>Unit (optional)</label><input className="field" value={cfg.unit || ''} onChange={(e) => set('unit', e.target.value)} placeholder="e.g. ha, kg" /></div>
      <div><label>Minimum (optional)</label><input className="field" type="number" value={cfg.min ?? ''} onChange={(e) => set('min', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
      <div><label>Maximum (optional)</label><input className="field" type="number" value={cfg.max ?? ''} onChange={(e) => set('max', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
    </div>
  )
}

function TargetConfig({ cfg, setCfg }) {
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  return (
    <div className="cfg-grid">
      <div><label>Unit</label><input className="field" value={cfg.unit || ''} onChange={(e) => set('unit', e.target.value)} placeholder="e.g. kg, %" /></div>
      <div><label>Direction</label>
        <select className="field" value={cfg.direction} onChange={(e) => set('direction', e.target.value)}>
          <option value="increase">Higher is better</option>
          <option value="decrease">Lower is better</option>
        </select>
      </div>
      <div><label>“Current” label</label><input className="field" value={cfg.currentLabel} onChange={(e) => set('currentLabel', e.target.value)} /></div>
      <div><label>“Target” label</label><input className="field" value={cfg.targetLabel} onChange={(e) => set('targetLabel', e.target.value)} /></div>
      <div><label>Slider minimum</label><input className="field" type="number" value={cfg.min} onChange={(e) => set('min', Number(e.target.value))} /></div>
      <div><label>Slider maximum</label><input className="field" type="number" value={cfg.max} onChange={(e) => set('max', Number(e.target.value))} /></div>
      <div><label>Step size</label><input className="field" type="number" value={cfg.step} onChange={(e) => set('step', Number(e.target.value))} /></div>
      <div><label>Starting “current” value</label><input className="field" type="number" value={cfg.currentDefault} onChange={(e) => set('currentDefault', Number(e.target.value))} /></div>
    </div>
  )
}

/* ----------------------------- sections ----------------------------------- */

function AddSection({ nextPosition, reload }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [intro, setIntro] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    await saveCustomSection({ section_id: uid('sec_'), title: title.trim(), intro: intro.trim() || null, position: nextPosition })
    setBusy(false); setOpen(false); setTitle(''); setIntro(''); reload()
  }
  if (!open) return <button className="btn add-section" onClick={() => setOpen(true)}>+ Add a new section</button>
  return (
    <div className="qform">
      <div className="qform-head">New section</div>
      <label>Section title</label>
      <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Soil &amp; ground cover" />
      <label>Intro text shown on the section’s opening screen (optional)</label>
      <textarea className="field" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} />
      <div className="qed-actions">
        <button className="btn small" onClick={save} disabled={busy || !title.trim()}>{busy ? 'Adding…' : 'Add section'}</button>
        <button className="btn subtle small" onClick={() => setOpen(false)}>Cancel</button>
        <span className="muted" style={{ fontSize: 13 }}>It appears after the built-in sections, once it has a question.</span>
      </div>
    </div>
  )
}

function EditSection({ row, reload, onDone }) {
  const [title, setTitle] = useState(row.title)
  const [intro, setIntro] = useState(row.intro || '')
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    await saveCustomSection({ ...row, title: title.trim(), intro: intro.trim() || null })
    setBusy(false); reload(); onDone()
  }
  return (
    <div className="qform">
      <label>Section title</label>
      <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>Intro text (optional)</label>
      <textarea className="field" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} />
      <div className="qed-actions">
        <button className="btn small" onClick={save} disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save section'}</button>
        <button className="btn subtle small" onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}
