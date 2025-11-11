export type TemplateId = 'game' | 'sequence' | 'pattern'

export type ParsedResult = {
  template: string
  confidence: number
  parsedConstraint: string | null
  parameters: Record<string, unknown>
  alternatives: Array<{ reason: string; parsedConstraint: string; confidence: number }>
  debug?: Record<string, unknown>
}
