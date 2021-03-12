import _ from 'lodash/fp'
import { createReducer } from 'cape-redux'
import { SERIAL_DATA } from '../serialport/actions'
import { COMMAND, COMMAND_DONE } from './actions'
import { addCrc } from './command'

export const defaultState = {
  command: {
    id: null, // string id
    register: null, // command register uint8 number code
    started: null, // _.now()
    rtt: null, // time in ms it took from tx to rx.
    read: null,
    write: null,
    // rxRemaining: 0, // Number of bytes we are waiting for
    rxBytes: null, // Buffer
    complete: false,
    crcExpected: null,
    crcRx: null,
    crcValid: null,
    value: null,
    done: false, // COMMAND_DONE action sent.
  },
  value: {}, // Save latest raw value for all answers to read commands.
}
export function startCommand(state, payload) {
  const command = {
    ...defaultState.command,
    ...payload,
    rxBytes: new Uint8Array(),
  }
  return _.set('command', command, state)
}

const saveFields = _.pick(['value', 'started', 'rtt', 'rxBytes'])
export function save(state) {
  const { command } = state
  if (_.isNull(command.value)) return state
  return _.set(['value', command.id], saveFields(command), state)
}

export function handleData(state, { data, time }) {
  const { rxBytes, rxRemaining, started } = state.command
  if (!rxRemaining) return state
  const buffData = Buffer.isBuffer(data) ? new Uint8Array(data) : data
  const newBytes = buffData.slice(0, rxRemaining)
  const allBytes = new Uint8Array([...rxBytes, ...newBytes])
  const bytesRemaining = rxRemaining - newBytes.byteLength
  const complete = bytesRemaining === 0
  const command = {
    ...state.command,
    rtt: time - started,
    rxBytes: allBytes,
    rxRemaining: bytesRemaining,
    complete,
  }
  return save(_.set('command', addCrc(command), state))
}
export const reducers = {
  [COMMAND]: startCommand,
  [COMMAND_DONE]: _.set('command.done', true),
  [SERIAL_DATA]: handleData,
}
export default createReducer(reducers, defaultState)
