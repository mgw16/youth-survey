/* ============================================================================
   store.js  —  one tidy place for all data in/out.

   Two modes, chosen automatically:
     • LIVE  : VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
               Reads/writes Supabase, and the dashboard updates in real time.
     • DEMO  : env vars blank. Everything is kept in this browser only
               (localStorage), pre-seeded with fake growers so the dashboard
               isn't empty. Nothing leaves the device.
   The rest of the app never needs to know which mode it's in.
   ========================================================================== */

import { supabase, isLive } from './supabaseClient'

export { isLive }

/* ----------------------------- DEMO MODE ---------------------------------- */

const DEMO_KEY = 'wcs_demo_v2'

function demoSeed() {
  // Six fake growers so the ranking/charts have something to show.
  const now = Date.now()
  const g = (i, name, property) => ({
    id: 'demo-' + i,
    name,
    property_name: property,
    created_at: new Date(now - (6 - i) * 60000).toISOString(),
  })
  const growers = [
    g(1, 'Sam Patterson', 'Bramble Downs (demo)'),
    g(2, 'Avery Quinn', 'Riverview (demo)'),
    g(3, 'Kim Nguyen', 'Tableland Park (demo)'),
    g(4, 'The Liston Family', 'Wandilla (demo)'),
    g(5, 'Sam Patterson', 'Spring Creek (demo)'),
    g(6, 'Jordan Hartley', 'Boorowa Station (demo)'),
  ]
  const r = (grower_id, survey_id, answers) =>
    Object.entries(answers).map(([question_id, value]) => ({
      id: `${grower_id}-${survey_id}-${question_id}`,
      grower_id,
      survey_id,
      question_id,
      value,
      answered_at: new Date(now).toISOString(),
    }))
  const responses = [
    ...r('demo-1', 'tree_planting', {
      tp_forest_free: 'yes', tp_consent: 'yes', tp_tenure: 'yes',
      tp_permanence: '100', tp_area: '50+', tp_risks: 'low',
    }),
    ...r('demo-1', 'productivity', {
      pr_weaning_target: { current: 90, target: 105 },
      pr_weight_target: { current: 24, target: 31 },
    }),
    ...r('demo-2', 'tree_planting', {
      tp_forest_free: 'yes', tp_consent: 'unsure', tp_tenure: 'yes',
      tp_permanence: '25', tp_area: '21-50', tp_risks: 'some',
    }),
    ...r('demo-2', 'productivity', {
      pr_weaning_target: { current: 85, target: 95 },
      pr_weight_target: { current: 22, target: 26 },
    }),
    ...r('demo-3', 'tree_planting', {
      tp_forest_free: 'no', tp_consent: 'unsure', tp_tenure: 'yes',
      tp_permanence: 'unsure', tp_area: '0-10', tp_risks: 'notassessed',
    }),
    ...r('demo-3', 'productivity', {
      pr_weaning_target: { current: 80, target: 100 },
      pr_weight_target: { current: 20, target: 28 },
    }),
    ...r('demo-4', 'tree_planting', {
      tp_forest_free: 'yes', tp_consent: 'no', tp_tenure: 'no',
      tp_permanence: 'no', tp_area: '11-20', tp_risks: 'unsure',
    }),
    ...r('demo-4', 'productivity', {
      pr_weaning_target: { current: 88, target: 92 },
    }),
    ...r('demo-5', 'tree_planting', {
      tp_forest_free: 'yes', tp_consent: 'yes', tp_tenure: 'yes',
      tp_permanence: '100', tp_area: '50+', tp_risks: 'low',
    }),
    ...r('demo-5', 'productivity', {
      pr_weaning_target: { current: 95, target: 110 },
      pr_weight_target: { current: 26, target: 30 },
    }),
    ...r('demo-6', 'productivity', {
      pr_weaning_target: { current: 82, target: 96 },
      pr_weight_target: { current: 23, target: 27 },
    }),
  ]
  // overrides: { "survey_id:question_id": { prompt, help, instructions, optionLabels:{value:label} } }
  return { growers, responses, overrides: {}, customSections: [], customQuestions: [] }
}

function demoLoad() {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!parsed.overrides) parsed.overrides = {}
      if (!parsed.customSections) parsed.customSections = []
      if (!parsed.customQuestions) parsed.customQuestions = []
      return parsed
    }
  } catch (e) { /* ignore */ }
  const seeded = demoSeed()
  demoSave(seeded)
  return seeded
}

function demoSave(data) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(data)) } catch (e) { /* ignore */ }
  // Let any open dashboard tab in this browser refresh.
  window.dispatchEvent(new CustomEvent('wcs-demo-change'))
}

/* --------------------------- PUBLIC API ----------------------------------- */

export async function createGrower(name, propertyName) {
  if (isLive) {
    const { data, error } = await supabase
      .from('growers')
      .insert({ name, property_name: propertyName || null })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const db = demoLoad()
  const grower = {
    id: 'g-' + Date.now(),
    name,
    property_name: propertyName || null,
    created_at: new Date().toISOString(),
  }
  db.growers.push(grower)
  demoSave(db)
  return grower
}

export async function saveAnswer(growerId, surveyId, questionId, value) {
  if (isLive) {
    // Upsert so re-answering a question overwrites rather than duplicates.
    const { error } = await supabase
      .from('responses')
      .upsert(
        { grower_id: growerId, survey_id: surveyId, question_id: questionId, value },
        { onConflict: 'grower_id,survey_id,question_id' }
      )
    if (error) throw error
    return
  }
  const db = demoLoad()
  const key = `${growerId}-${surveyId}-${questionId}`
  const existing = db.responses.find((x) => x.id === key)
  if (existing) existing.value = value
  else db.responses.push({ id: key, grower_id: growerId, survey_id: surveyId, question_id: questionId, value, answered_at: new Date().toISOString() })
  demoSave(db)
}

export async function fetchAll() {
  if (isLive) {
    const [{ data: growers, error: e1 }, { data: responses, error: e2 }] = await Promise.all([
      supabase.from('growers').select('*').order('created_at', { ascending: true }),
      supabase.from('responses').select('*'),
    ])
    if (e1) throw e1
    if (e2) throw e2
    return { growers: growers || [], responses: responses || [] }
  }
  return demoLoad()
}

// Calls `onChange` whenever data changes. Returns an unsubscribe function.
export function subscribe(onChange) {
  if (isLive) {
    const channel = supabase
      .channel('wcs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'growers' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_sections' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_questions' }, onChange)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const handler = () => onChange()
  window.addEventListener('wcs-demo-change', handler)
  window.addEventListener('storage', handler) // changes from other tabs
  return () => {
    window.removeEventListener('wcs-demo-change', handler)
    window.removeEventListener('storage', handler)
  }
}

// Used by a "reset demo" button on the dashboard (demo mode only).
export function resetDemo() {
  const seeded = demoSeed()
  demoSave(seeded)
}

/* ----------------------- QUESTION TEXT OVERRIDES -------------------------- */
// Lets you reword questions from the dashboard WITHOUT changing question ids,
// so answers from earlier wording stay mapped to the same question.

// Returns { "survey_id:question_id": { prompt?, help?, instructions?, optionLabels? } }
export async function fetchOverrides() {
  if (isLive) {
    const { data, error } = await supabase.from('question_overrides').select('*')
    if (error) throw error
    const map = {}
    for (const row of data || []) {
      map[`${row.survey_id}:${row.question_id}`] = {
        prompt: row.prompt || undefined,
        help: row.help || undefined,
        instructions: row.instructions || undefined,
        optionLabels: row.option_labels || undefined,
      }
    }
    return map
  }
  return demoLoad().overrides || {}
}

export async function saveOverride(surveyId, questionId, fields) {
  if (isLive) {
    const { error } = await supabase.from('question_overrides').upsert(
      {
        survey_id: surveyId,
        question_id: questionId,
        prompt: fields.prompt ?? null,
        help: fields.help ?? null,
        instructions: fields.instructions ?? null,
        option_labels: fields.optionLabels ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'survey_id,question_id' }
    )
    if (error) throw error
    return
  }
  const db = demoLoad()
  db.overrides = db.overrides || {}
  db.overrides[`${surveyId}:${questionId}`] = fields
  demoSave(db)
}

/* ------------------- CUSTOM SECTIONS & QUESTIONS (builder) ----------------- */
// New sections/questions you build in the dashboard. They collect answers but
// do not feed the eligibility scoring (that stays in code).

export async function fetchBuilder() {
  if (isLive) {
    const [{ data: sections, error: e1 }, { data: questions, error: e2 }] = await Promise.all([
      supabase.from('custom_sections').select('*'),
      supabase.from('custom_questions').select('*'),
    ])
    if (e1) throw e1
    if (e2) throw e2
    return { sections: sections || [], questions: questions || [] }
  }
  const db = demoLoad()
  return { sections: db.customSections || [], questions: db.customQuestions || [] }
}

export async function saveCustomSection(section) {
  if (isLive) {
    const { error } = await supabase.from('custom_sections').upsert(section, { onConflict: 'section_id' })
    if (error) throw error
    return
  }
  const db = demoLoad()
  const i = db.customSections.findIndex((s) => s.section_id === section.section_id)
  if (i >= 0) db.customSections[i] = { ...db.customSections[i], ...section }
  else db.customSections.push({ created_at: new Date().toISOString(), ...section })
  demoSave(db)
}

export async function deleteCustomSection(sectionId) {
  if (isLive) {
    await supabase.from('custom_questions').delete().eq('section_id', sectionId)
    const { error } = await supabase.from('custom_sections').delete().eq('section_id', sectionId)
    if (error) throw error
    return
  }
  const db = demoLoad()
  db.customSections = db.customSections.filter((s) => s.section_id !== sectionId)
  db.customQuestions = db.customQuestions.filter((q) => q.section_id !== sectionId)
  demoSave(db)
}

export async function saveCustomQuestion(question) {
  if (isLive) {
    const { error } = await supabase.from('custom_questions').upsert(question, { onConflict: 'question_id' })
    if (error) throw error
    return
  }
  const db = demoLoad()
  const i = db.customQuestions.findIndex((q) => q.question_id === question.question_id)
  if (i >= 0) db.customQuestions[i] = { ...db.customQuestions[i], ...question }
  else db.customQuestions.push({ created_at: new Date().toISOString(), ...question })
  demoSave(db)
}

export async function deleteCustomQuestion(questionId) {
  if (isLive) {
    const { error } = await supabase.from('custom_questions').delete().eq('question_id', questionId)
    if (error) throw error
    return
  }
  const db = demoLoad()
  db.customQuestions = db.customQuestions.filter((q) => q.question_id !== questionId)
  demoSave(db)
}
