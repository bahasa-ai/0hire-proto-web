const TASK_KEYWORDS =
  /\b(create|draft|build|make|generate|write|design|prepare|send|summarize|compile|set up)\b/i

export function isTaskOriented(text: string): boolean {
  return TASK_KEYWORDS.test(text)
}

// Per-agent step libraries — 5 plain-English steps each.
export const AGENT_STEPS: Record<string, Array<string>> = {
  'chief-of-staff': [
    'Reviewing your request',
    'Scanning team priorities',
    'Drafting action plan',
    'Coordinating across departments',
    'Preparing summary',
  ],
  'designer': [
    'Reviewing brand guidelines',
    'Searching design references',
    'Generating initial concepts',
    'Applying design system tokens',
    'Exporting deliverables',
  ],
  'finance': [
    'Pulling financial data',
    'Running scenario analysis',
    'Building the model',
    'Cross-checking against budget',
    'Compiling final report',
  ],
  'legal': [
    'Reviewing applicable regulations',
    'Checking existing templates',
    'Drafting document structure',
    'Applying standard clauses',
    'Flagging items for review',
  ],
}

export function getAgentSteps(agentId: string): Array<string> {
  return AGENT_STEPS[agentId] ?? AGENT_STEPS['chief-of-staff']
}
