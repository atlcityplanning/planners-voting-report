import { describe, expect, it } from 'vitest'
import {
  applyApplicationTemplate,
  formatReportDate,
  getApplicationDefaults,
  getPlannerScriptUrl,
  getReportPrintLabels,
  reorderItems,
} from './votingReport'

describe('voting report helpers', () => {
  it('formats application numbers with the legacy prefixes and dash groups', () => {
    expect(applyApplicationTemplate('23045', 'Z-xx-xxx', true)).toBe('Z-23-045')
    expect(applyApplicationTemplate('Z-23045', 'Z-xx-xxx', true)).toBe(
      'Z-23-045',
    )
    expect(applyApplicationTemplate('23045', 'CDP-xx-xxx', true)).toBe(
      'CDP-23-045',
    )
  })

  it('leaves application numbers alone when autofill is disabled', () => {
    expect(applyApplicationTemplate('Z23045', 'Z-xx-xxx', false)).toBe('Z23045')
  })

  it('sets item defaults from the selected item type', () => {
    expect(getApplicationDefaults('ZRB', true)).toMatchObject({
      placeholder: 'Z-',
      value: 'Z-2',
      template: 'Z-xx-xxx',
    })
    expect(getApplicationDefaults('SD', true)).toMatchObject({
      placeholder: 'SD-',
      value: 'SD-2',
      recommendation: 'Review and Comment',
      template: 'SD-xx-xxx',
    })
    expect(getApplicationDefaults('MOSE', true)).toMatchObject({
      placeholder: 'Applicant Name',
      value: '',
      template: undefined,
    })
  })

  it('creates print labels using the legacy date format', () => {
    expect(formatReportDate('2026-05-08')).toBe('5-8-2026')
    expect(getReportPrintLabels('M', '2026-05-08')).toEqual({
      documentTitle: 'Voting Report_NPU-M_5-8-2026',
      headerTitle: 'VOTING REPORT: NPU-M  |  5-8-2026',
    })
  })

  it('builds NPU-specific planner script URLs', () => {
    expect(getPlannerScriptUrl('Q')).toBe(
      'https://voting-report-svelte.vercel.app/plannersScriptQ',
    )
  })

  it('reorders agenda items around the hovered item', () => {
    const items = [
      { id: 'a', itemType: 'MOSE' },
      { id: 'b', itemType: 'ZRB' },
      { id: 'c', itemType: 'SD' },
    ]

    expect(reorderItems(items, 'c', 'a').map((item) => item.id)).toEqual([
      'c',
      'a',
      'b',
    ])
  })
})
