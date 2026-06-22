/* Assembles the survey growers see (and the dashboard reads) from three layers:
   1. base    — the finalised questions + eligibility rules defined in code
   2. overrides— host-edited WORDING of base questions (ids stay fixed)
   3. custom   — brand-new sections & questions built from the dashboard

   Custom questions collect data but do not feed the eligibility scoring — that
   stays in code so the ACCU/productivity logic can't be broken by accident. */

import { applyOverride, ovKey } from './overrides.js'

const byPos = (a, b) =>
  ((a.position ?? 0) - (b.position ?? 0)) || String(a.created_at || '').localeCompare(String(b.created_at || ''))

const neutralEvaluate = () => ({ status: 'review', score: 0, band: null, reasons: [], flags: [] })

export function normalizeCustomQuestion(cq, parentTitle) {
  return {
    id: cq.question_id,
    section: cq.section_label || parentTitle,
    type: cq.type,
    prompt: cq.prompt || '',
    help: cq.help || undefined,
    instructions: cq.instructions || undefined,
    options: cq.options || undefined,
    required: cq.type === 'info' ? false : true,
    custom: true,
  }
}

// base: the code-defined SURVEYS array
// overrides: { "sectionId:questionId": {prompt,help,instructions,optionLabels} }
// custom: { sections: [...rows], questions: [...rows] }
export function assembleSurveys(base, overrides = {}, custom = { sections: [], questions: [] }) {
  const baseAssembled = base.map((s) => ({
    ...s,
    questions: s.questions.map((q) => applyOverride(q, overrides[ovKey(s.id, q.id)])),
  }))

  const customSections = (custom.sections || []).slice().sort(byPos).map((cs) => ({
    id: cs.section_id,
    title: cs.title,
    intro: cs.intro || '',
    custom: true,
    questions: [],
    evaluate: neutralEvaluate,
  }))

  const all = [...baseAssembled, ...customSections]
  const byId = Object.fromEntries(all.map((s) => [s.id, s]))

  for (const cq of (custom.questions || []).slice().sort(byPos)) {
    const sec = byId[cq.section_id]
    if (sec) sec.questions.push(normalizeCustomQuestion(cq, sec.title))
  }

  // A section with no questions would break the grower flow, so only surface
  // sections that actually have at least one question.
  return all.filter((s) => s.questions.length > 0)
}
