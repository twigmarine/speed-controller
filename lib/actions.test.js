import _ from 'lodash/fp'
import { divideBy, subtrahend } from 'understory'
import { prepCommand } from './actions'
/* globals describe test expect */

const rmMs = _.flow(subtrahend(500), divideBy(1000), _.round)

describe('command prepCommand', () => {
  describe('basic read', () => {
    const action = prepCommand({ id: 'speed' })
    test('Add default address', () => {
      expect(action.address).toBe(0x00)
    })
    test('Add register prop', () => {
      expect(action.register).toBe(0x00)
    })
    test('Add read prop', () => {
      expect(action.read).toBe(true)
    })
    test('Add write prop', () => {
      expect(action.write).toBe(false)
    })
    test('Add txBytes prop', () => {
      expect(action.txBytes).toEqual(new Uint8Array([0x80, 0x00]))
    })
    test('Add rxByteLength byteLength', () => {
      expect(action.rxByteLength).toBe(3)
    })
    test('Add started time', () => {
      expect(rmMs(action.started)).toBe(rmMs(_.now()))
    })
  })
  describe('basic write', () => {
    const action = prepCommand({ id: 'speed', address: 1, value: 100 })
    test('Leave address alone if defined', () => {
      expect(action.address).toBe(0x01)
    })
    test('Add register prop', () => {
      expect(action.register).toBe(0x40)
    })
    test('Add read prop', () => {
      expect(action.read).toBe(false)
    })
    test('Add write prop', () => {
      expect(action.write).toBe(true)
    })
    test('Add txBytes prop', () => {
      expect(action.txBytes).toEqual(new Uint8Array([0x81, 0x40, 0x00, 0x64, 0x24]))
    })
    test('Add rxByteLength byteLength', () => {
      expect(action.rxByteLength).toBe(1)
    })
    test('Add started time', () => {
      expect(rmMs(action.started)).toBe(rmMs(_.now()))
    })
  })
  describe('write with parsed value', () => {
    const action = prepCommand({ id: 'loadVoltsLimit', parsed: 16 })
    test('Add default address', () => {
      expect(action.address).toBe(0x00)
    })
    test('Add register prop', () => {
      expect(action.register).toBe(0x61)
    })
    test('Add read prop', () => {
      expect(action.read).toBe(false)
    })
    test('Add write prop', () => {
      expect(action.write).toBe(true)
    })
    test('Add value prop', () => {
      expect(action.value).toBe(864)
    })
    test('Add txBytes prop', () => {
      expect(action.txBytes).toEqual(new Uint8Array([0x80, 0x61, 6, 96, 71]))
    })
    test('Add rxByteLength byteLength', () => {
      expect(action.rxByteLength).toBe(1)
    })
    test('Add started time', () => {
      expect(rmMs(action.started)).toBe(rmMs(_.now()))
    })
  })
  describe('write speed with parsed value', () => {
    const action = prepCommand({ id: 'speed', parsed: 90 })
    test('Add value prop', () => {
      expect(action.value).toBe(3799)
    })
  })
  describe('write with field value', () => {
    const command = { id: 'save2', field: { loadVoltsLimit: true, foo: true } }
    const action = prepCommand(command)
    test('Add default address', () => {
      expect(action.address).toBe(0x00)
    })
    test('Add register prop', () => {
      expect(action.register).toBe(0x73)
    })
    test('Add read prop', () => {
      expect(action.read).toBe(false)
    })
    test('Add write prop', () => {
      expect(action.write).toBe(true)
    })
    test('Add value prop', () => {
      expect(action.value).toBe(4)
    })
    test('Add txBytes prop', () => {
      expect(action.txBytes).toEqual(new Uint8Array([0x80, 0x73, 0, 4, 119]))
    })
    test('Add rxByteLength byteLength', () => {
      expect(action.rxByteLength).toBe(1)
    })
    test('Add started time', () => {
      expect(rmMs(action.started)).toBe(rmMs(_.now()))
    })
  })
})
