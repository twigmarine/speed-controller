import _ from 'lodash/fp'
// import { getCommandInfo } from './commands'
import {
  fieldToValue, getCRC, getReadBytes, getWriteBytes, getValue, parsedToValue,
} from './command'
/* globals describe test expect */

const hexByte = (x) => _.padCharsStart(
  '0', 2, Number(x).toString(16).toUpperCase(),
)
const buffHexArr = (x) => _.map(hexByte, new Uint8Array(x))

// Test 0 value speed write.
//
describe('getWriteBytes', () => {
  describe('basic set speed test', () => {
    const command = {
      address: 0x01,
      id: 'speed',
      value: 1000,
    }
    const bytes = getWriteBytes(command)
    test('toString', () => {
      expect(buffHexArr(bytes).toString()).toBe('81,40,07,68,2F')
    })
    test('Returns 5 bytes', () => {
      expect(bytes.length).toBe(5)
    })
    test('Byte 1 is address | 0x80', () => {
      expect(bytes[0]).toBe(0x81)
    })
    test('Byte 2 is address the command code', () => {
      expect(bytes[1]).toBe(0x40)
    })
    test('Byte 3 and 4 should be the data', () => {
      expect(bytes[2]).toBe(0x07)
      expect(bytes[3]).toBe(0x68)
    })
    test('Byte 5 is CRC', () => {
      expect(bytes[4]).toBe(0x2F)
    })
  })
  describe('set address', () => {
    const command = {
      address: 0x00,
      id: 'address',
      value: 1,
    }
    const bytes = getWriteBytes(command)
    test('toString', () => {
      expect(buffHexArr(bytes).toString()).toBe('80,7C,00,01,7D')
    })
    test('Returns 5 bytes', () => {
      expect(bytes.length).toBe(5)
    })
    test('Byte 1 is address | 0x80', () => {
      expect(bytes[0]).toBe(0x80)
    })
    test('Byte 2 is address the command code', () => {
      expect(bytes[1]).toBe(0x7C)
    })
    test('Byte 3 and 4 should be the data', () => {
      expect(bytes[2]).toBe(0x00)
      expect(bytes[3]).toBe(0x01)
    })
    test('Byte 5 is CRC', () => {
      expect(bytes[4]).toBe(125)
    })
  })
  describe('Example 1: Set Speed', () => {
    const command = {
      address: 0x0,
      id: 'speed',
      value: 0x05C5,
    }
    const bytes = getWriteBytes(command)
    test('Returns 5 bytes', () => {
      expect(bytes.length).toBe(5)
    })
    test('Byte 1 is address | 0x80', () => {
      expect(bytes[0]).toBe(0x80)
    })
    test('Byte 2 is address the command code', () => {
      expect(bytes[1]).toBe(0x40)
    })
    test('Byte 3 and 4 should be the data', () => {
      expect(bytes[2]).toBe(0x0B)
      expect(bytes[3]).toBe(0x45)
    })
    test('Byte 5 is CRC', () => {
      expect(bytes[4]).toBe(0x10)
    })
    test('toString', () => {
      expect(buffHexArr(getWriteBytes({ address: 0x00, id: 'speed', value: 0 })).toString())
        .toBe('80,40,00,00,40')
    })
    test('toString', () => {
      expect(buffHexArr(getWriteBytes({ address: 0x00, id: 'speed', value: 2000 })).toString())
        .toBe('80,40,0F,50,1F')
    })
  })
  describe('Example 2: Calling 0x02 address device and locking Speed variable', () => {
    const command = {
      address: 2,
      id: 'lockVars',
      field: { speed: true },
    }
    const bytes = getWriteBytes(command)

    test('Returns 5 bytes', () => {
      expect(bytes.length).toBe(5)
    })
    test('Byte 1 is address | 0x80', () => {
      expect(bytes[0]).toBe(0x82)
    })
    test('Byte 2 is address the command code', () => {
      expect(bytes[1]).toBe(0x71)
    })
    test('Byte 3 and 4 should be the data', () => {
      expect(bytes[2]).toBe(0x00)
      expect(bytes[3]).toBe(0x01)
    })
    test('Byte 5 is CRC', () => {
      expect(bytes[4]).toBe(0x72)
    })
  })
  describe('loadVoltsLimit', () => {
    const command = { id: 'loadVoltsLimit', parsed: 16 }
    const bytes = getWriteBytes(command)
    test('Returns 5 bytes', () => {
      expect(buffHexArr(bytes).toString()).toBe('80,61,06,60,47')
    })
  })
})

describe('getReadBytes', () => {
  describe('Example 4 Get Load Current', () => {
    const command = {
      address: 0x0,
      id: 'loadCurrent',
    }
    const bytes = getReadBytes(command)
    test('Returns 2 bytes', () => {
      expect(bytes.length).toBe(2)
    })
    test('Byte 1 is address | 0x80', () => {
      expect(bytes[0]).toBe(0x80)
    })
    test('Byte 2 is address the command code', () => {
      expect(bytes[1]).toBe(0x12)
    })
  })
})

describe('getValue', () => {
  describe('status', () => {
    const command = {
      id: 'status',
      crcValid: true,
      value: 513,
    }
    const result = getValue(command)
    test('field props added', () => {
      expect(result.field).toEqual({
        fowardMode: { val: 1, label: 'Forward' },
        auxPin: { val: 0, label: 'Low' },
        adcPin: { val: 0, label: 'Over 2 volts' },
        driveStatus: { val: 0, label: 'Drive mode' },
        overTemperature: { val: 0, label: 'No' },
        overVoltage: { val: 0, label: 'No' },
        underVoltage: { val: 1, label: 'Yes, Under Voltage' },
      })
    })
  })
  describe('save2', () => {
    const command = {
      id: 'save2',
      crcValid: true,
      value: 4,
    }
    const result = getValue(command)
    test('field props added', () => {
      expect(result.field).toEqual({
        adcMax: false,
        adcMin: false,
        currentCal: false,
        irCompensation: false,
        loadVoltsLimit: true,
      })
    })
  })
})
describe('fieldToValue', () => {
  test('save2', () => {
    const command = { id: 'save2', field: { loadVoltsLimit: true, foo: true } }
    expect(fieldToValue(command)).toBe(4)
  })
  test('config1', () => {
    const command = { id: 'config1', field: { forwardMode: 1 } }
    expect(fieldToValue(command)).toBe(0b1000000000)
  })
})

describe('parsedToValue', () => {
  test('volts', () => {
    expect(parsedToValue({ parsed: 16.2, resolution: 0.01851 })).toBe(875)
  })
})
