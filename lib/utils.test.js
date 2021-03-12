import { isWrite } from './utils'

/* globals describe test expect */

describe('isWrite', () => {
  test('true when value prop is set', () => {
    expect(isWrite({ value: 100 })).toBe(true)
    expect(isWrite({ value: 0 })).toBe(true)
    expect(isWrite({ value: null })).toBe(false)
  })
})
