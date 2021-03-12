const _ = require('lodash/fp')
const { propDo } = require('prairie')
const { concat, from, of } = require('rxjs')
const {
  bufferCount, concatMap, filter, map, tap,
} = require('rxjs/operators')
const { addCrc, getValue, prepCommand } = require('./command')
const {
  configCommands, inputCommands, potCommands, powerCommands, readCommands,
} = require('./commands')
const { getLoadPower, getValFields, settingCommands } = require('./utils')

function getVal(command) {
  return (action) => {
    if (!action.payload || !action.payload.complete) return action
    return {
      type: 'CONTROLLER:VALUE',
      payload: getValue(addCrc({ ...command, ...action.payload })),
    }
  }
}

const sendCommand = _.curry((exchange, command) => of(command).pipe(
  tap((x) => console.log('sendCommand', x)),
  map(prepCommand),
  concatMap((cmdInfo) => concat(
    of({ payload: cmdInfo, type: 'CONTROLLER:CMD' }),
    exchange(cmdInfo.txBytes, cmdInfo.rxByteLength).pipe(
      // tap(console.log),
      map(getVal(cmdInfo)),
    ),
  )),
))

function sendMany(exchange, commands) {
  return from(commands).pipe(
    concatMap(sendCommand(exchange)),
    // bufferCount(), // combine all results into single array.
  )
}
const onlyValues = filter(_.matches({ type: 'CONTROLLER:VALUE' }))
const trimValFields = map(propDo('payload', getValFields))

function getValues(commandInfos, id, parser = _.identity) {
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
const getAllValues = getValues(readCommands, 'ALL')
const getConfigValues = getValues(configCommands, 'CONFIG')
const getInputValues = getValues(inputCommands, 'INPUT')
const getPotValues = getValues(potCommands, 'POT')
const getPowerValues = getValues(powerCommands, 'POWER', getLoadPower)

const sendSettings = (exchange, settings) => sendMany(exchange, settingCommands(settings))
  .pipe(
    onlyValues,
    // trimValFields,
  )

module.exports = {
  getAllValues,
  getConfigValues,
  getInputValues,
  getPotValues,
  getPowerValues,
  sendCommand,
  sendMany,
  sendSettings,
}
