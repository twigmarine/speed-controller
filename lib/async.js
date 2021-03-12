import _ from 'lodash/fp'
import { mapP } from 'understory'
import { prepCommand } from './actions'
import { addCrc, getValue } from './command'
import {
  configCommands, potCommands, powerCommands, readCommands,
} from './commands'
import { calcVolts } from './utils'

export function getVal(command) {
  return (result) => getValue(addCrc({ ...command, ...result }))
}

export function sendCommand(send, payload) {
  const command = prepCommand(payload)
  // if (command.write) console.log(command.id, command.rxByteLength)
  // console.log(command)
  return send(command.txBytes, command.rxByteLength)
    .then(getVal(command))
}
export function sendMany(send, commands) {
  const started = _.now()
  return mapP((cmd) => sendCommand(send, cmd), commands)
    .then((values) => ({ values, rtt: _.now() - started }))
}

export function getPotValues(send) {
  return sendMany(send, potCommands.map(_.pick('id')))
}
export function getConfigValues(send) {
  return sendMany(send, configCommands.map(_.pick('id')))
}
export function getAllValues(send) {
  return sendMany(send, readCommands.map(_.pick('id')))
}
export function getPower(send) {
  return sendMany(send, powerCommands.map(_.pick('id'))).then(calcVolts)
}
