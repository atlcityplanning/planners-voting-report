export const NPU_OPTIONS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'V',
  'W',
  'X',
  'Y',
  'Z',
] as const

export const ITEM_TYPES = [
  { value: 'MOSE', label: 'MOSE' },
  { value: 'LRB', label: 'LRB' },
  { value: 'ZRB', label: 'ZRB' },
  { value: 'SUP', label: 'SUP' },
  { value: 'BZA', label: 'BZA' },
  { value: 'Text Am.', label: 'Text Am.' },
  { value: 'CDP', label: 'CDP Am.' },
  { value: 'SD', label: 'SD' },
  { value: 'LOR', label: 'LOR' },
  { value: 'N/A', label: 'Other...' },
] as const

export const RECOMMENDATIONS = [
  { value: 'PENDING', label: 'Recommend' },
  { value: 'Support/Approve', label: 'Support/Approve' },
  { value: 'Support/Approve with conditions', label: 'Support/Approve with conditions' },
  { value: 'Nonsupport/Denial', label: 'Nonsupport/Denial' },
  { value: 'Defer', label: 'Defer' },
  { value: 'Abstain', label: 'Abstain' },
  { value: 'Applicant Not Present', label: 'Applicant Not Present' },
  { value: 'Removed from Agenda', label: 'Removed from Agenda' },
  { value: 'Review and Comment', label: 'Review and Comment' },
] as const

export type ItemType = (typeof ITEM_TYPES)[number]['value']
export type Recommendation = (typeof RECOMMENDATIONS)[number]['value']

export type AgendaItem = {
  id: string
  itemType: ItemType
  applicationName: string
  recommendation: Recommendation
  motion: string
  applicantPresent: "yes" | "no" | ""
  comments: string
}

export type ReportFormState = {
  npu: string
  chair: string
  location: string
  planner: string
  meetingDate: string
  autofill: boolean
  plannerNotes: string
  items: Array<AgendaItem>
}

type ApplicationDefaults = {
  placeholder: string
  value: string
  template?: string
  recommendation?: Recommendation
}

const DEFAULT_APPLICATION_PLACEHOLDER = 'Application number or name'

const APPLICATION_DEFAULTS: Record<string, Omit<ApplicationDefaults, 'value'>> = {
  MOSE: { placeholder: 'Applicant Name' },
  LRB: { placeholder: 'Applicant Name' },
  ZRB: { placeholder: 'Z-', template: 'Z-xx-xxx' },
  SUP: { placeholder: 'U-', template: 'U-xx-xxx' },
  BZA: { placeholder: 'V-', template: 'V-xx-xxx' },
  'Text Am.': { placeholder: 'Z-', template: 'Z-xx-xxx' },
  CDP: { placeholder: 'CDP-', template: 'CDP-xx-xxx' },
  SD: {
    placeholder: 'SD-',
    template: 'SD-xx-xxx',
    recommendation: 'Review and Comment',
  },
  LOR: {
    placeholder: 'LOR-',
    template: 'LOR-xx-xxx',
    recommendation: 'Review and Comment',
  },
  'N/A': { placeholder: DEFAULT_APPLICATION_PLACEHOLDER },
}

export const INITIAL_REPORT_STATE: ReportFormState = {
  npu: 'A',
  chair: '',
  location: '',
  planner: '',
  meetingDate: '',
  autofill: true,
  plannerNotes: '',
  items: [],
}

export function isItemType(value: string): value is ItemType {
  return ITEM_TYPES.some((itemType) => itemType.value === value)
}

export function normalizeItemType(value: string): ItemType {
  return isItemType(value) ? value : 'N/A'
}

export function isRecommendation(value: string): value is Recommendation {
  return RECOMMENDATIONS.some(
    (recommendation) => recommendation.value === value,
  )
}

export function normalizeRecommendation(value: string): Recommendation {
  return isRecommendation(value) ? value : 'PENDING'
}

export function getApplicationDefaults(
  itemType: string,
  autofill: boolean,
): ApplicationDefaults {
  const defaults = APPLICATION_DEFAULTS[itemType] ?? {
    placeholder: DEFAULT_APPLICATION_PLACEHOLDER,
  }
  const prefix = defaults.template?.split('x')[0] ?? ''

  return {
    placeholder: defaults.placeholder,
    recommendation: defaults.recommendation,
    template: defaults.template,
    value: autofill && defaults.template ? `${prefix}2` : '',
  }
}

export function applyApplicationTemplate(
  input: string,
  template: string | undefined,
  autofill: boolean,
) {
  if (!autofill || !template) {
    return input
  }

  const normalizedInput = input.trim().toUpperCase()
  if (!normalizedInput) {
    return ''
  }

  const prefix = template.split('x')[0] ?? ''
  const compactPrefix = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  let compactInput = normalizedInput.replace(/[^A-Z0-9]/gi, '')

  if (compactPrefix && compactInput.startsWith(compactPrefix)) {
    compactInput = compactInput.slice(compactPrefix.length)
  }
  if (compactPrefix) {
    compactInput = compactInput
      .split('')
      .filter((char) => !compactPrefix.includes(char))
      .join('')
  }

  let compactIndex = 0
  let formatted = ''

  for (const templateChar of template) {
    if (templateChar === 'x') {
      if (compactIndex >= compactInput.length) {
        break
      }
      formatted += compactInput[compactIndex]
      compactIndex += 1
    } else {
      formatted += templateChar
    }
  }

  return formatted
}

export function formatReportDate(meetingDate: string) {
  if (!meetingDate) {
    return ''
  }

  const date = new Date(`${meetingDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`
}

export function getReportPrintLabels(npu: string, meetingDate: string) {
  const reportDate = formatReportDate(meetingDate)

  return {
    documentTitle: `Voting Report_NPU-${npu}_${reportDate}`,
    headerTitle: `VOTING REPORT: NPU-${npu}  |  ${reportDate}`,
  }
}

export function getPlannerScriptUrl(npu: string) {
  return `https://voting-report-svelte.vercel.app/plannersScript${encodeURIComponent(
    npu,
  )}`
}

export function reorderItems<T extends { id: string }>(
  items: ReadonlyArray<T>,
  activeId: string,
  overId: string,
) {
  const fromIndex = items.findIndex((item) => item.id === activeId)
  const toIndex = items.findIndex((item) => item.id === overId)

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return [...items]
  }

  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)
  if (!movedItem) {
    return [...items]
  }

  const adjustedToIndex = nextItems.findIndex((item) => item.id === overId)
  nextItems.splice(adjustedToIndex, 0, movedItem)

  return nextItems
}
