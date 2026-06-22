/* ============================================================================
   surveys.js  —  THE ONLY FILE YOU NEED TO EDIT TO CHANGE QUESTIONS
   ============================================================================
   You can also reword questions live from the dashboard (✎ Edit questions) —
   that keeps answers mapped to the same question. Use THIS file to add/remove
   questions or change logic and eligibility rules.

   QUESTION SHAPE
   {
     id, section, type, prompt,
     help:         'grey note under the prompt' (optional),
     instructions: 'floating box the grower MUST read before answering' (optional),
     options:      [...] (choice/scale/target types),
     required:     true by default; set false to allow skipping,
     branch:       (answer, answers) => 'questionId' | 'END' | undefined (optional),
   }

   TYPES: 'yes_no' | 'yes_no_unsure' | 'single_choice' | 'multi_choice' |
          'scale' | 'number' | 'text' | 'target'
   'target' -> current value + target slider with live improvement.
               answer is {current, target}. options: {unit, currentLabel,
               targetLabel, min, max, step, direction:'increase'|'decrease',
               currentDefault}

   evaluate(answers) -> { status:'eligible'|'ineligible'|'review', score:0..100,
                          band:'High'|'Medium'|'Low', reasons:[], flags:[] }
   ========================================================================== */

const yes = (v) => v === 'yes'
const no = (v) => v === 'no'
const round = (n) => Math.round((Number(n) || 0) * 10) / 10

/* ========================================================================== */
/*  SURVEY 1 — TREE PLANTING  (finalised: Environmental Planting / ACCU)       */
/*  Source: Tree_planting_farmer_questionnaire_FINAL_DRAFT.docx                */
/* ========================================================================== */

const treePlanting = {
  id: 'tree_planting',
  title: 'Environmental Planting — Carbon Project Self-Assessment',
  intro:
    'This questionnaire helps you think through the key considerations before committing to an Environmental Planting carbon project under the Australian Carbon Credit Unit (ACCU) Scheme. There are no right or wrong answers — the purpose is to identify where you may need more information or advice. Any “No” or “Unsure” is worth discussing further with Landcare Australia or an independent advisor.',
  accent: '#2f6b46',

  questions: [
    {
      id: 'tp_forest_free',
      section: 'Q1 · Land-use history',
      type: 'yes_no_unsure',
      prompt: 'Has the land you are considering for planting been free of forest cover for at least the past 7 years?',
      instructions:
        'Why this matters: Under the Clean Energy Regulator (CER) rules, planting areas must have been without forest cover for at least 5 years, and there must not have been any clearing of native forest within the past 7 years. This is a fundamental eligibility requirement for any Environmental Planting carbon project.',
      help:
        'If native forest has been cleared on the proposed area in the last 7 years, the land is likely ineligible. A site visit by Landcare Australia can verify land-use history using the National Forest and Sparse Woody Vegetation dataset.',
    },
    {
      id: 'tp_consent',
      section: 'Q2 · Eligible interest holders',
      type: 'yes_no_unsure',
      prompt: 'Can you identify and obtain consent from all eligible interest holders in the project area?',
      instructions:
        'Why this matters: The ACCU Scheme requires consent from every person or organisation with an eligible interest in the project area before it can earn ACCUs. Eligible interest holders include mortgagees (e.g. your bank), lessees, Native Title holders, and easement holders (e.g. electricity transmission). Consent cannot be withdrawn once the project is registered. Free, prior and informed consent (FPIC) applies to First Nations eligible interest holders.',
      help:
        'Start identifying eligible interest holders early — obtaining all consents can take considerable time. Check your land title for easements and encumbrances. If the land is subject to Native Title, you will need to engage the relevant Traditional Owner group.',
    },
    {
      id: 'tp_tenure',
      section: 'Q3 · Tenure',
      type: 'yes_no_unsure',
      prompt: 'Do you have clear and unencumbered tenure (ownership) over the proposed project area?',
      instructions:
        'Why this matters: Tenure establishes the legal ownership and land-use rights needed for a carbon project. Without clear tenure, a project cannot be registered and permanence obligations cannot be enforced. The proponent must demonstrate they have the legal right to carry out the project and to be issued ACCUs.',
      help:
        'If you lease the land, you will need the landowner’s consent and a long-term lease covering the permanence period. Independent legal advice is recommended to confirm your legal right to undertake the project.',
    },
    {
      id: 'tp_permanence',
      section: 'Q4 · Permanence',
      type: 'single_choice',
      prompt: 'Are you prepared to commit the planted area to a permanence obligation of either 25 or 100 years?',
      instructions:
        'Why this matters: Environmental planting projects require a legally binding permanence period. A 25-year permanence period yields fewer ACCUs, but a shorter obligation may better suit your circumstances. You cannot harvest or clear the planted vegetation during this period.',
      help:
        'This is a long-term commitment registered on your land title. Consider how it fits with your succession plans, future land-use intentions, and financial goals. Independent legal and financial advice is strongly recommended.',
      options: [
        { value: '25', label: 'Yes – 25 years' },
        { value: '100', label: 'Yes – 100 years' },
        { value: 'no', label: 'No' },
        { value: 'unsure', label: 'Unsure' },
      ],
    },
    {
      id: 'tp_area',
      section: 'Q5 · Planting area',
      type: 'single_choice',
      prompt: 'How much area would you expect to have available to plant to trees in the next 3 years?',
      instructions:
        'Why this matters: The scale of planting directly affects the project’s carbon yield, financial viability, and operational costs. Larger areas generally deliver better economies of scale for site preparation, planting, and ongoing management. Your available area helps determine whether a standalone project is viable or whether aggregation with neighbouring properties may be beneficial.',
      help:
        'There is no strict minimum area, but very small plantings may not generate enough ACCUs to justify registration and management costs. The economics of your situation will be worked through in the full-feasibility phase.',
      options: [
        { value: '0-10', label: '0–10 ha' },
        { value: '11-20', label: '11–20 ha' },
        { value: '21-50', label: '21–50 ha' },
        { value: '50+', label: 'More than 50 ha' },
      ],
    },
    {
      id: 'tp_risks',
      section: 'Q6 · Site risks',
      type: 'single_choice',
      prompt: 'Are you aware of site-level risks that may affect the project, such as bushfire, flooding, steep terrain, or infrastructure (e.g. transmission lines)?',
      instructions:
        'Why this matters: Environmental risks can significantly impact carbon stores and project viability. Bushfire can destroy above-ground biomass, flooding can damage seedlings and cause erosion, steep slopes can restrict machinery access, and infrastructure such as transmission lines may require future clearing that violates permanence obligations. A 5% reversal buffer is deducted from ACCUs for natural disturbance, but this does not insure the proponent against loss of income or re-establishment costs.',
      help:
        'A site visit will confirm on-ground conditions. Fire-resilient species selection, flood-adapted planting designs, and excluding infrastructure corridors from the planting zone can all help. You can discuss site-specific strategies with Landcare Australia during the feasibility stage.',
      options: [
        { value: 'low', label: 'Yes – low risk' },
        { value: 'some', label: 'Yes – some risks identified' },
        { value: 'notassessed', label: 'No – not yet assessed' },
        { value: 'unsure', label: 'Unsure' },
      ],
    },
    {
      id: 'tp_notes',
      section: 'Your notes',
      type: 'text',
      prompt: 'Any questions, concerns, or discussion points to raise with Landcare Australia or your advisor?',
      required: false,
    },
  ],

  evaluate(answers) {
    const reasons = []
    const flags = []

    // --- Hard eligibility gates ---
    if (no(answers.tp_forest_free)) {
      return { status: 'ineligible', score: 0,
        reasons: ['Land not free of forest cover for 7 years — fails the core CER land-use rule.'], flags: [] }
    }
    if (no(answers.tp_tenure)) {
      return { status: 'ineligible', score: 0,
        reasons: ['No clear tenure — a project cannot be registered without it.'], flags: ['Check whether a long-term lease + landowner consent is possible.'] }
    }
    if (answers.tp_permanence === 'no') {
      return { status: 'ineligible', score: 10,
        reasons: ['Not prepared to commit to a 25 or 100-year permanence period.'], flags: [] }
    }

    // --- Scoring for those who clear the gates ---
    let score = 0
    if (yes(answers.tp_forest_free)) score += 22
    else flags.push('Land-use history unconfirmed (answered Unsure on Q1).')

    if (yes(answers.tp_tenure)) score += 18
    else flags.push('Tenure not confirmed (Q3).')

    if (yes(answers.tp_consent)) score += 15
    else if (no(answers.tp_consent)) { reasons.push('Cannot yet obtain all eligible-interest-holder consents.'); flags.push('Eligible interest holder consents outstanding (Q2).') }
    else flags.push('Unsure about eligible interest holder consents (Q2).')

    if (answers.tp_permanence === '100') score += 20
    else if (answers.tp_permanence === '25') score += 14
    else flags.push('Permanence commitment not yet decided (Q4).')

    const areaPoints = { '50+': 20, '21-50': 15, '11-20': 10, '0-10': 5 }
    score += areaPoints[answers.tp_area] || 0
    if (answers.tp_area === '0-10') flags.push('Small area — check it generates enough ACCUs to be viable.')

    const riskPoints = { low: 10, some: 6, notassessed: 2, unsure: 0 }
    score += riskPoints[answers.tp_risks] || 0
    if (answers.tp_risks === 'notassessed' || answers.tp_risks === 'unsure') flags.push('Site risks not yet assessed (Q6).')

    score = Math.min(100, score)

    // Eligible only when the four core checks are clean.
    const coreClean =
      yes(answers.tp_forest_free) && yes(answers.tp_tenure) &&
      yes(answers.tp_consent) && (answers.tp_permanence === '25' || answers.tp_permanence === '100')

    const status = coreClean ? 'eligible' : 'review'
    const band = score >= 70 ? 'High' : score >= 45 ? 'Medium' : 'Low'
    if (status === 'eligible') reasons.unshift('Meets the core eligibility checks (land history, tenure, consents, permanence).')

    return { status, score, band, reasons, flags }
  },
}

/* ========================================================================== */
/*  SURVEY 2 — PRODUCTIVITY  (finalised: two improvement targets)             */
/*  Both questions use the target slider so the improvement is calculated and */
/*  shown live as the grower slides.                                          */
/* ========================================================================== */

const productivity = {
  id: 'productivity',
  title: 'Productivity Improvement Targets',
  intro:
    'Two quick targets. Lifting weaning rate and sale weight spreads each animal’s emissions over more product, which lowers emission intensity. Set where you are now and where you’d like to get to — the improvement is calculated for you.',
  accent: '#a9762f',

  questions: [
    {
      id: 'pr_weaning_target',
      section: 'Weaning rate',
      type: 'target',
      prompt: 'How much improvement could you expect to see in weaning rate, to help deliver emission-intensity reductions?',
      help: 'Enter your current weaning rate, then slide to a realistic target.',
      instructions:
        'Weaning rate here means lambs weaned per ewe joined, as a percentage (it can be over 100% with multiples). Lifting weaning rate means more lambs from the same breeding flock, so the flock’s emissions are spread across more product — lowering emission intensity per kg. Enter your current rate, then slide to a target you’d realistically aim for.',
      options: {
        unit: '%',
        currentLabel: 'Current weaning rate',
        targetLabel: 'Target weaning rate',
        min: 50,
        max: 170,
        step: 1,
        direction: 'increase',
        currentDefault: 90,
      },
    },
    {
      id: 'pr_weight_target',
      section: 'Lamb sale weight',
      type: 'target',
      prompt: 'How much improvement could you expect to see in lamb sale weights, to help deliver emission-intensity reductions?',
      help: 'Enter your current lamb sale weight, then slide to a target.',
      instructions:
        'Use the lamb class you sell most of. Heavier sale weights for a similar input spread the animal’s emissions over more kilograms of product, lowering emission intensity. Enter your current average sale weight, then slide to a realistic target.',
      options: {
        unit: 'kg',
        currentLabel: 'Current lamb sale weight',
        targetLabel: 'Target lamb sale weight',
        min: 15,
        max: 60,
        step: 0.5,
        direction: 'increase',
        currentDefault: 24,
      },
    },
  ],

  evaluate(answers) {
    const reasons = []
    const flags = []
    const pcts = []

    const calc = (v) => {
      if (!v || typeof v !== 'object' || typeof v.current !== 'number' || typeof v.target !== 'number' || v.current === 0) return null
      const delta = v.target - v.current
      return { delta, pct: (delta / v.current) * 100 }
    }

    const w = calc(answers.pr_weaning_target)
    if (w) {
      const a = answers.pr_weaning_target
      reasons.push(`Weaning rate: ${a.current}% → ${a.target}% (${w.delta >= 0 ? '+' : ''}${round(w.delta)} pts, ${w.pct >= 0 ? '+' : ''}${round(w.pct)}%).`)
      pcts.push(w.pct)
    }
    const s = calc(answers.pr_weight_target)
    if (s) {
      const a = answers.pr_weight_target
      reasons.push(`Lamb sale weight: ${a.current}kg → ${a.target}kg (${s.delta >= 0 ? '+' : ''}${round(s.delta)}kg, ${s.pct >= 0 ? '+' : ''}${round(s.pct)}%).`)
      pcts.push(s.pct)
    }

    // Score = average targeted % improvement (a proxy for the size of the
    // emission-intensity opportunity). Higher = bigger opportunity to discuss.
    const avgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0
    const score = Math.max(0, Math.min(100, Math.round(avgPct)))
    const band = avgPct >= 15 ? 'High' : avgPct >= 7 ? 'Medium' : 'Low'

    if (!pcts.length) flags.push('No targets entered yet.')

    return { status: 'review', score, band, reasons, flags }
  },
}

export const SURVEYS = [treePlanting, productivity]
export const SURVEYS_BY_ID = Object.fromEntries(SURVEYS.map((s) => [s.id, s]))
export const WORKSHOP_NAME = 'Woolgrower Environmental Planning Workshop'
