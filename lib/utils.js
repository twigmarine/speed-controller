const _ = require('lodash/fp')
const { propDo, setField } = require('prairie')
const { MAX_VAL } = require('./commands')

const valIsNum = propDo('value', _.isNumber)
const fieldsIsObj = propDo('fields', _.isPlainObject)
const isWrite = _.overSome([valIsNum, fieldsIsObj])
const isRead = _.negate(isWrite)
const round = _.round.convert({
  fixed: false,
})

const trim = _.flow(
  _.get('values'),
  _.keyBy('id'),
)
const getValFields = _.pick(['id', 'value', 'parsed', 'unit', 'pot'])
const trimVals = _.flow(trim, _.mapValues(getValFields))

const parsedVals = _.mapValues('parsed')
const getParsed = _.flow(trim, parsedVals)

const calcLoadVolts = (supplyVolts, loadDutyFactor) => ({
  id: 'loadVolts',
  parsed: round(supplyVolts.parsed * (loadDutyFactor.parsed / 100), 3),
  calculated: true,
  unit: 'volts',
})
const calcLoadPower = (loadVolts, loadCurrent) => ({
  id: 'loadPower',
  parsed: round(loadVolts.parsed * loadCurrent.parsed, 2),
  calculated: true,
  unit: 'watts',
})

const addLoadVolts = setField(
  'loadVolts',
  ({ supplyVolts, loadDutyFactor }) => calcLoadVolts(supplyVolts, loadDutyFactor),
)
const addLoadPower = setField(
  'loadPower',
  ({ loadVolts, loadCurrent }) => calcLoadPower(loadVolts, loadCurrent),
)

const getLoadPower = (values) => {
  const loadVolts = calcLoadVolts(values[0], values[1])
  return [
    ...values,
    loadVolts,
    calcLoadPower(loadVolts, values[2]),
  ]
}

function getSettingCommand([id, info]) {
  if (_.isNumber(info)) return { id, value: info }
  return { id, ...info }
}
const settingCommands = _.flow(_.toPairs, _.map(getSettingCommand))

const minMax = (value) => _.max([0, _.min([value, MAX_VAL])])
const percentFromBits = (twelveBits) => Math.floor((minMax(twelveBits) / MAX_VAL) * 100)

module.exports = {
  addLoadPower,
  addLoadVolts,
  getLoadPower,
  getParsed,
  isRead,
  isWrite,
  minMax,
  percentFromBits,
  round,
  settingCommands,
  trimVals,
}
