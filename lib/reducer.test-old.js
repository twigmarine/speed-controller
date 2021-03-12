import _ from 'lodash/fp'
import { prepCommand } from './actions'
import { defaultState, handleData, startCommand } from './reducer'
import { mockRx } from './command'

/* globals describe test expect */

describe('startCommand', () => {
  const state = { ...defaultState }
  const payload = prepCommand({ id: 'supplyVolts' })
  const newState = startCommand(state, payload)
  test('Leave values alone', () => {
    expect(newState.values).toBe(state.values)
  })
  test('Applied payload details', () => {
    expect(newState.command).toEqual({
      ...payload,
      complete: null,
      crcExpected: null,
      crcRx: null,
      crcValid: null,
      rtt: null,
      value: null,
      rxBytes: new Uint8Array(),
      done: false,
    })
  })
})
describe('handleData', () => {
  test('Returns exact same state', () => {
    const newState = handleData(defaultState, Buffer.from([0x62]))
    expect(newState).toBe(defaultState)
  })
  const cmd = { id: 'supplyVolts' }
  const state = startCommand(defaultState, prepCommand(cmd))
  const rxBytes = mockRx({ ...cmd, value: 96 })
  const newState = handleData(state, { data: Buffer.from([rxBytes[0]]), time: _.now() })
  // console.log(newState)
  test('Handle first byte', () => {
    expect(newState.value).toBe(defaultState.value)
    expect(newState.command.rxBytes).toEqual(new Uint8Array([0x00]))
    expect(newState.command.register).toBe(0x10)
    expect(newState.command.rxRemaining).toBe(2)
    expect(newState.command.crcValid).toBe(null)
  })
  const newState2 = handleData(
    newState, { data: Buffer.from([rxBytes[1], rxBytes[2]]), time: _.now() },
  )
  test('Handle last two bytes', () => {
    expect(newState2.command.rxBytes.byteLength).toBe(3)
    expect(newState2.command.rxBytes).toEqual(new Uint8Array([0x00, 96, 112]))
    expect(newState2.command.rxRemaining).toBe(0)
    expect(newState2.command.crcValid).toBe(true)
    expect(newState2.command.complete).toBe(true)
  })
  test('includes value', () => {
    expect(newState2.command.value).toBe(96)
    expect(newState2.value).toMatchObject({
      supplyVolts: { value: 96 },
    })
  })
})
