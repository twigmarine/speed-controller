import { getReadRegister, getResolution } from './commands'

/* globals describe test expect */

describe('getReadRegister', () => {
  const register = getReadRegister('supplyVolts')
  test('supplyVolts', () => {
    expect(register).toBe(0x10)
  })
})
describe('getResolution', () => {
  test('8 bits', () => {
    expect(getResolution(100, 8)).toBe(0.39215686274509803)
  })
})
