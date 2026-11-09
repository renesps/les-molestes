import { describe, expect, it } from 'vitest'
import { formatDate, formatScore, formatTime, goalDiff, winRate } from './format'

describe('fechas en hora de Buenos Aires', () => {
  it('dd/mm/aaaa', () => {
    expect(formatDate('2016-03-12T13:00:00-03:00')).toBe('12/03/2016')
  })
  it('respeta la zona aunque el partido sea de noche', () => {
    // 23:30 en Argentina = 02:30 UTC del día siguiente: tiene que seguir siendo el 28
    expect(formatDate('2024-09-28T23:30:00-03:00')).toBe('28/09/2024')
    expect(formatTime('2024-09-28T23:30:00-03:00')).toBe('23:30')
  })
})

describe('marcador', () => {
  it('normal', () => expect(formatScore(3, 1)).toBe('3 – 1'))
  it('sin dato', () => expect(formatScore(null, null)).toBe('sin dato'))
  it('parcial', () => expect(formatScore(1, null)).toBe('1 – ?'))
})

describe('récord', () => {
  const r = { played: 10, won: 6, drawn: 2, lost: 1, unknown: 1, goalsFor: 20, goalsAgainst: 12 }
  it('diferencia de gol', () => expect(goalDiff(r)).toBe('+8'))
  it('% ganados sobre partidos con resultado', () => expect(winRate(r)).toBe(67))
})
