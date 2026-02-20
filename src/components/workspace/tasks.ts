export type TaskStatus =
  | 'scheduled'
  | 'in-progress'
  | 'needs-input'
  | 'done'
  | 'failed'
export type AgentStatus = 'idle' | 'working' | 'needs-input' | 'failed'

export interface Task {
  id: string
  agentId: string
  title: string
  description: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export type AgentTaskMap = Record<string, Array<Task>>

export function deriveAgentStatus(tasks: Array<Task>): AgentStatus {
  if (tasks.some(t => t.status === 'failed')) return 'failed'
  if (tasks.some(t => t.status === 'needs-input')) return 'needs-input'
  if (tasks.some(t => t.status === 'in-progress' || t.status === 'scheduled'))
    return 'working'
  return 'idle'
}

export const SECTION_ORDER: Array<TaskStatus> = [
  'needs-input',
  'in-progress',
  'scheduled',
  'done',
  'failed',
]

export const AGENT_TASKS: AgentTaskMap = {
  'chief-of-staff': [
    {
      id: 'cs-01',
      agentId: 'chief-of-staff',
      title: 'Prepare Q1 Board Update Deck',
      description:
        'Compile OKR progress, hiring pipeline status, and SOC 2 timeline for the upcoming board call.',
      status: 'in-progress',
      createdAt: '2026-02-17T09:00:00Z',
      updatedAt: '2026-02-19T08:30:00Z',
    },
    {
      id: 'cs-02',
      agentId: 'chief-of-staff',
      title: 'Coordinate Senior Engineer Interview Loop',
      description:
        'Schedule panel interviews with Priya, Marcus, and two senior ICs for the open Senior Engineer role.',
      status: 'in-progress',
      createdAt: '2026-02-14T10:00:00Z',
      updatedAt: '2026-02-18T16:00:00Z',
    },
    {
      id: 'cs-03',
      agentId: 'chief-of-staff',
      title: 'Draft Series B Narrative Outline',
      description:
        'Create a first-pass narrative arc for the Series B deck — growth story, market timing, team.',
      status: 'scheduled',
      createdAt: '2026-02-19T08:00:00Z',
      updatedAt: '2026-02-19T08:00:00Z',
    },
    {
      id: 'cs-04',
      agentId: 'chief-of-staff',
      title: 'Q4 2025 OKR Retrospective',
      description:
        'Summarize Q4 OKR outcomes across Sales, Engineering, and CS for the all-hands recap.',
      status: 'done',
      createdAt: '2026-01-28T09:00:00Z',
      updatedAt: '2026-02-05T17:00:00Z',
    },
    {
      id: 'cs-05',
      agentId: 'chief-of-staff',
      title: 'Head of Marketing Job Description',
      description:
        'Draft and circulate the Head of Marketing JD for Alex and Marcus to review before posting.',
      status: 'done',
      createdAt: '2026-02-10T09:00:00Z',
      updatedAt: '2026-02-13T15:00:00Z',
    },
  ],

  'designer': [
    {
      id: 'de-01',
      agentId: 'designer',
      title: 'Mobile App v1 Final Polish Pass',
      description:
        'Apply final spacing, icon refinements, and dark mode fixes before the Q1 2026 mobile launch.',
      status: 'needs-input',
      createdAt: '2026-02-18T11:00:00Z',
      updatedAt: '2026-02-19T09:15:00Z',
    },
    {
      id: 'de-02',
      agentId: 'designer',
      title: 'Series B Pitch Deck Slide Design',
      description:
        'Design the visual layout and data viz slides for the Series B fundraising deck.',
      status: 'in-progress',
      createdAt: '2026-02-17T10:00:00Z',
      updatedAt: '2026-02-19T08:00:00Z',
    },
    {
      id: 'de-03',
      agentId: 'designer',
      title: 'Clarity Design System Token Audit',
      description:
        'Audit the Clarity Figma token library against the shipped product to surface any drift.',
      status: 'scheduled',
      createdAt: '2026-02-19T09:00:00Z',
      updatedAt: '2026-02-19T09:00:00Z',
    },
    {
      id: 'de-04',
      agentId: 'designer',
      title: 'Website Homepage Refresh',
      description:
        'Update hero copy and hero illustration to reflect the Series A announcement messaging.',
      status: 'done',
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-02-01T16:00:00Z',
    },
  ],

  'finance': [
    {
      id: 'fi-01',
      agentId: 'finance',
      title: 'January 2026 MRR Reconciliation',
      description:
        'Reconcile Stripe MRR against the financial model — flag any discrepancies before the board call.',
      status: 'in-progress',
      createdAt: '2026-02-03T09:00:00Z',
      updatedAt: '2026-02-19T08:00:00Z',
    },
    {
      id: 'fi-02',
      agentId: 'finance',
      title: 'Q4 2025 Churn Analysis',
      description:
        'Model the 2 churned accounts (~$180K ARR) to identify whether it was price, product, or support.',
      status: 'in-progress',
      createdAt: '2026-02-10T10:00:00Z',
      updatedAt: '2026-02-18T14:00:00Z',
    },
    {
      id: 'fi-03',
      agentId: 'finance',
      title: 'Series B Financial Model — Base/Bull/Bear',
      description:
        'Build three-scenario ARR and burn model to anchor the $22–28M raise target with defensible math.',
      status: 'scheduled',
      createdAt: '2026-02-19T09:00:00Z',
      updatedAt: '2026-02-19T09:00:00Z',
    },
    {
      id: 'fi-04',
      agentId: 'finance',
      title: 'AWS Cost Optimization Review',
      description:
        'Audit $28K/mo AWS spend — identify Reserved Instance or Savings Plan opportunities.',
      status: 'scheduled',
      createdAt: '2026-02-17T09:00:00Z',
      updatedAt: '2026-02-17T09:00:00Z',
    },
    {
      id: 'fi-05',
      agentId: 'finance',
      title: 'Series A Post-Close Cap Table Update',
      description:
        'Finalize cap table in Carta reflecting all Series A conversions and new option grants.',
      status: 'done',
      createdAt: '2026-01-10T09:00:00Z',
      updatedAt: '2026-01-22T17:00:00Z',
    },
  ],

  'legal': [
    {
      id: 'le-01',
      agentId: 'legal',
      title: 'Clearfield Analytics DPA & Security Addendum',
      description:
        "Review Clearfield's security addendum and finalize the outstanding DPA to unblock their renewal.",
      status: 'needs-input',
      createdAt: '2026-02-12T10:00:00Z',
      updatedAt: '2026-02-19T09:00:00Z',
    },
    {
      id: 'le-02',
      agentId: 'legal',
      title: 'Contractor IP Assignment Follow-Up',
      description:
        '2 outstanding contractor IP assignment agreements need signatures before further core product contribution.',
      status: 'in-progress',
      createdAt: '2026-02-15T09:00:00Z',
      updatedAt: '2026-02-18T11:00:00Z',
    },
    {
      id: 'le-03',
      agentId: 'legal',
      title: 'SOC 2 Type II Audit Preparation',
      description:
        'Review Vanta controls checklist and flag any gaps before the audit window opens in Q3 2026.',
      status: 'scheduled',
      createdAt: '2026-02-19T09:00:00Z',
      updatedAt: '2026-02-19T09:00:00Z',
    },
    {
      id: 'le-04',
      agentId: 'legal',
      title: 'SaaS MSA Template Refresh',
      description:
        'Update the MSA template (last reviewed Dec 2024) to reflect current data processing and AI provisions.',
      status: 'scheduled',
      createdAt: '2026-02-17T10:00:00Z',
      updatedAt: '2026-02-17T10:00:00Z',
    },
    {
      id: 'le-05',
      agentId: 'legal',
      title: 'CCPA Privacy Policy Annual Review',
      description:
        'Confirm the Jan 2025 Privacy Policy remains current — flag any required updates for 2026.',
      status: 'done',
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-01-28T16:00:00Z',
    },
  ],
}
