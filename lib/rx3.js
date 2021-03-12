import _ from 'lodash/fp'
import { propDo } from 'prairie'
import { concat, from, of } from 'rxjs'
import {
  bufferCount, concatMap, filter, map,
} from 'rxjs/operators'
import { prepCommand } from './actions'
import { addCrc, getValue } from './command'
import {
  configCommands, inputCommands, potCommands, powerCommands, readCommands,
} from './commands'
import { getLoadPower, getValFields, settingCommands } from './utils'

export function getVal(command) {
  return (action) => {
    if (!action.payload || !action.payload.complete) return action
    return {
      type: 'CONTROLLER:VALUE',
      payload: getValue(addCrc({ ...command, ...action.payload })),
    }
  }
}

export const sendCommand = _.curry((exchange, command) => of(command).pipe(
  map(prepCommand),
  concatMap((cmdInfo) => concat(
    of({ payload: cmdInfo, type: 'CONTROLLER:CMD' }),
    exchange(cmdInfo.txBytes, cmdInfo.rxByteLength).pipe(
      // tap(console.log),
      map(getVal(cmdInfo)),
    ),
  )),
))

export function cmdQueue(exchange) {
  const queue = new Subject()
  const results = queue.concatMap(sendCommand(exchange))
  const cmd =
  return {
    queue,
    cmd:
  }
}

export function sendMany(exchange, commands) {
  return from(commands).pipe(
    concatMap(sendCommand(exchange)),
    // bufferCount(), // combine all results into single array.
  )
}
export const onlyValues = filter(_.matches({ type: 'CONTROLLER:VALUE' }))
export const trimValFields = map(propDo('payload', getValFields))

export function getValues(commandInfos, id, parser = _.identity) {
  const readCommandIds = commandInfos.map(_.pick('id'))
  return (exchange, address = 0) => sendMany(
    exchange,
    readCommandIds.map(_.set('address', address)),
  ).pipe(
    onlyValues,
    trimValFields,
    bufferCount(commandInfos.length),
    map((payload) => ({
      type: 'CONTROLLER:VALUES',
      payload: parser(payload),
      meta: { id },
    })),
  )
}
export const getAllValues = getValues(readCommands, 'ALL')
export const getConfigValues = getValues(configCommands, 'CONFIG')
export const getInputValues = getValues(inputCommands, 'INPUT')
export const getPotValues = getValues(potCommands, 'POT')
export const getPowerValues = getValues(powerCommands, 'POWER', getLoadPower)

export const sendSettings = (exchange, settings) => sendMany(exchange, settingCommands(settings))
  .pipe(
    onlyValues,
    // trimValFields,
  )
