const _ = require('lodash/fp')
const {
  getCommandInfo, getReadRegister, getWriteRegister, MAX_VAL,
} = require('./commands')
const { round, isWrite } = require('./utils')

const mask7 = (x) => x & 0x7F // eslint-disable-line no-bitwise
const right7 = (x) => x >> 7 // eslint-disable-line no-bitwise
const left7 = (x) => x << 7 // eslint-disable-line no-bitwise

function getBits(num, start, length) {
  return (num >> start) & (0xFFFF >> (16 - length)) // eslint-disable-line no-bitwise
}
function valueToBytes(value) {
  const num = _.max([0, _.min([value, MAX_VAL])])
  return [mask7(right7(num)), mask7(num)]
}
function bytesToValue(rx) {
  return left7(rx[0]) | mask7(rx[1]) // eslint-disable-line no-bitwise
}
function getFieldVal(val) {
  if (_.isBoolean(val)) return +val
  if (_.isPlainObject(val)) return val.val
  return val
}
function fieldToValue(command) {
  const { id, field } = command
  const info = getCommandInfo(id)
  const fieldIndex = _.keyBy('id', info.fields)
  function reducer(result, [key, val]) {
    const num = getFieldVal(val)
    const fieldInfo = fieldIndex[key]
    if (!fieldInfo) {
      // console.error('no info for', key, fieldIndex)
      return result
    }
    const { bitStart } = fieldInfo
    // console.log(key, num, bitStart)
    return result | (num << bitStart) // eslint-disable-line no-bitwise
  }
  return _.toPairs(field).reduce(reducer, 0)
}
const fieldToBytes = _.flow(fieldToValue, valueToBytes)

function parsedToValue(command) {
  const {
    id, maxVal, parsed, offset,
  } = command
  const info = getCommandInfo(id)
  const resolution = command.resolution || info.resolution
  let value = parsed
  if (offset) value += offset
  if (resolution) value /= resolution
  return _.min([_.round(value), maxVal || MAX_VAL])
}

const parsedToBytes = _.flow(parsedToValue, valueToBytes)

function createDataBytes(command) {
  const { field, value, parsed } = command
  if (_.isNumber(value)) return valueToBytes(value)
  if (field) return fieldToBytes(command)
  if (parsed) return parsedToBytes(command)
  throw new Error('Need value, field, or parsed prop. createDataBytes()')
}

function getCRC(register, data) {
  return mask7((register + data[0] + data[1]))
}

function isDataValid(register, buff) {
  return getCRC(register, buff) === buff[2]
}
function writeSuccess(address, rxByte) {
  const addressMatch = mask7(rxByte) === address
  const noErrorBit = right7(rxByte) === 0
  return addressMatch && noErrorBit
}

function getReadBytes({ address, id }) {
  const register = getReadRegister(id)
  if (_.isUndefined(register)) throw new Error(`Register info not found for ${id}`)
  // console.log('read', address, id, register)
  return new Uint8Array([
    address | 0x80, // eslint-disable-line no-bitwise
    register,
  ])
}

// Write commands expect a single byte response. success (0x00 | address), error (0x80 | adddress).
function getWriteBytes(command) {
  const { address, id } = command
  const register = getWriteRegister(id)
  // console.log('write', address, command, lastCmd, value)
  const data = createDataBytes(command)
  return new Uint8Array([
    address | 0x80, // eslint-disable-line no-bitwise
    register,
    ...data,
    getCRC(register, data),
  ])
}
const defaultOptions = [{ val: 0, label: 'No' }, { val: 1, label: 'Yes' }]
function getFieldVals(value, fields) {
  function getField(result, {
    bitStart, id, options, bitLength,
  }) {
    const val = getBits(value, bitStart, bitLength || 1)
    if (!options) return _.set(id, !!val, result)
    const valInfo = _.find({ val }, options || defaultOptions)
    // if (!valInfo) console.error(id, val, options)
    const { label } = valInfo
    return _.set(id, { val, label }, result)
  }
  return fields.reduce(getField, {})
}
// If complete add crc fields.
function addCrc(command) {
  const {
    address, complete, register, rxBytes, read, write, value,
  } = command
  if (!complete) return command
  const crcExpected = write ? address : getCRC(register, rxBytes)
  const crcRx = write ? rxBytes[0] : rxBytes[2]
  const crcValid = crcExpected === crcRx
  return {
    ...command,
    crcExpected,
    crcRx,
    crcValid,
    value: (read && crcValid) ? bytesToValue(rxBytes) : value,
  }
}

function getValue(command) {
  const {
    id, crcValid, write, value,
  } = command
  if (write || !crcValid) return command
  const info = getCommandInfo(id)
  const {
    fields, offset, precision, resolution,
  } = info
  let parsed = value
  if (offset) parsed -= offset
  if (resolution) parsed *= resolution
  if (precision) parsed = round(parsed, precision)
  // console.log(parsed, precision, round(parsed, precision))
  const field = fields ? getFieldVals(parsed, fields) : undefined
  return {
    ...info,
    ...command,
    parsed,
    field,
  }
}

function mockRxBytes(command) {
  const register = getReadRegister(command.id)
  const data = createDataBytes(command)
  return new Uint8Array([...data, getCRC(register, data)])
}

function prepVal(payload) {
  if (_.isNumber(payload.value)) return payload
  if (_.isNumber(payload.parsed)) return { ...payload, value: parsedToValue(payload) }
  if (_.isPlainObject(payload.field)) return { ...payload, value: fieldToValue(payload) }
  return payload
}

function prepCommand(payload) {
  const command = _.isString(payload) ? { id: payload } : prepVal(payload)
  if (!command.id || !_.isString(command.id)) {
    throw new Error('Must include id string.')
  }
  const write = isWrite(command)
  const address = command.address || 0x00
  if (address < 0 || address > 0x7F) {
    throw new Error(`Invalid address ${address}. Must be between 0 - 127.`)
  }
  command.address = address
  const txBytes = write ? getWriteBytes(command) : getReadBytes(command)
  return {
    ...command,
    token: Symbol('controller.command.token'),
    complete: null,
    address,
    register: txBytes[1],
    write,
    read: !write,
    txBytes,
    started: _.now(),
    rxByteLength: write ? 1 : 3,
  }
}

module.exports = {
  addCrc,
  getValue,
  isDataValid,
  mockRxBytes,
  prepCommand,
  writeSuccess,
}
