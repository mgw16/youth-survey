/* Apply saved wording overrides to a question.
   IMPORTANT: only TEXT changes (prompt, help, instructions, and the visible
   LABELS of options). The question id and each option's stored `value` never
   change — that's what keeps older answers mapped to the same question. */

export function applyOverride(question, override) {
  if (!override) return question
  const next = { ...question }
  if (override.prompt) next.prompt = override.prompt
  if (override.help !== undefined) next.help = override.help
  if (override.instructions !== undefined) next.instructions = override.instructions
  if (override.optionLabels && Array.isArray(question.options)) {
    next.options = question.options.map((o) =>
      override.optionLabels[o.value] ? { ...o, label: override.optionLabels[o.value] } : o
    )
  }
  return next
}

// Key used in the overrides map.
export const ovKey = (surveyId, questionId) => `${surveyId}:${questionId}`
