const _ = require('lodash/fp')

const writeCmd = (x) => (x | 0x40) // eslint-disable-line no-bitwise
const getCmds = (readCmd) => ({ read: readCmd, write: writeCmd(readCmd) })

function getResolution(maxVal, bits) {
  return maxVal / (0x7FFFFFFF >> (31 - bits)) // eslint-disable-line no-bitwise
}

const MAX_VAL = 0xFFF // 4095
const HALF_VAL = 0x7FF // 2047
const ADC_RESOLUTION = 5 / MAX_VAL

const volts = {
  unit: 'volts',
  resolution: 0.01851, // 18.51mV
  precision: 2,
}
const time = {
  unit: 'milliseconds',
  resolution: 10,
}
const current = {
  unit: 'amps',
  precision: 2,
  // resolution: 0.0147253, // calculated 14.7mA
  resolution: 120 / HALF_VAL, // 58.6mA
  // resolution: 500 / HALF_VAL, // 244.2mA
}

// LED light on when:
// Over current limit
// Supply voltage is too high.
// USART communication (tiny flickers)

// red, green, white, black
const commands = [
  {
    id: 'accelerationLimit',
    description: 'Ramp speed. 0-41 seconds. P2 input.',
    register: getCmds(0x04),
    pot: 2,
    ...time,
  },
  {
    id: 'adcMin',
    register: getCmds(0x22),
    resolution: ADC_RESOLUTION,
  },
  {
    id: 'adcMax',
    register: getCmds(0x23),
    resolution: ADC_RESOLUTION,
  },
  {
    id: 'adcValue',
    register: { read: 0x11 },
    resolution: ADC_RESOLUTION,
  },
  {
    id: 'address',
    description: 'Set address',
    register: { write: 0x7C },
  },
  {
    id: 'boardTemperature',
    register: { read: 0x0B },
    minVal: 10,
    maxVal: 80,
  },
  {
    id: 'config1',
    register: getCmds(0x34),
    fields: [
      {
        id: 'forwardMode',
        default: 1,
        bitStart: 9,
        options: [
          { val: 0, label: 'Stop' },
          { val: 1, label: 'Forward' },
        ],
      },
      {
        id: 'disableLoad',
        description: 'This bit has a priority over Enable Input.',
        working: false,
        bitStart: 5,
        options: [
          { val: 0, label: 'PWM output enabled.' },
          { val: 1, label: 'PWM output disbaled (both high and low side mosfets are disabled)' },
        ],
      },
      {
        id: 'driveMode',
        description: 'Value cleared after restart.',
        bitStart: 4,
        options: [
          { val: 0, label: 'Drive Mode' },
          { val: 1, label: 'Brake mode or free running mode depending on brakeMode setting.' },
        ],
      },
      {
        id: 'brakeMode',
        description: 'Manual brake lets the motor spin freely after reducing speed. Auto brake will enable regeneration when the motors internal voltage is higher than the supply. Value cleared after restart.',
        bitStart: 3,
        default: 1,
        options: [
          { val: 0, label: 'Manual brake (free running mode)' },
          { val: 1, label: 'Auto brake (enable regeneration)' },
        ],
      },
      {
        id: 'speedReset',
        description: 'Value cleared after restart.',
        bitStart: 1,
        bitLength: 2,
        working: true,
        options: [
          { val: 0, label: 'Speed writes valid until restart.' },
          { val: 1, label: 'Speed writes valid for 50msec.' },
          { val: 2, label: 'Speed writes valid for 500msec.' },
          { val: 3, label: 'Speed writes valid for 2800msec.' },
        ],
      },
      {
        id: 'configEnabled',
        description: 'UART controll bit. Value cleared after restart.',
        bitStart: 0,
        options: [
          { val: 0, label: 'Disable config' },
          { val: 1, label: 'Enable config' },
        ],
      },
    ],
  },
  {
    id: 'config2',
    register: getCmds(0x35),
    fields: [
      {
        id: 'inputPinDisabled',
        description: 'Disable function of "Enable" input pin.',
        bitStart: 9,
        options: [
          { val: 0, label: 'No. Enable pin enabled.' },
          { val: 1, label: 'Yes. Enable pin disabled.' },
        ],
      },
      {
        id: 'loadVoltsLimitEnabled',
        description: 'Motor Speed/Voltage Limit',
        bitStart: 8,
        options: [
          { val: 0, label: 'No, disabled.' },
          { val: 1, label: 'Yes, enabled.' },
        ],
      },
      {
        id: 'auxInputEnabled',
        description: 'Disables brake for use as aux PWM input.',
        bitStart: 7,
        options: [
          { val: 0, label: 'Brake pin enabled.' },
          { val: 1, label: 'Brake disabled. Logic only input.' },
        ],
      },
      {
        id: 'auxPulseResolution',
        description: 'Brake/PWM input pulse measurement resolution',
        bitStart: 6,
        options: [
          { val: 0, label: '0' },
          { val: 1, label: '1' },
        ],
      },
      {
        id: 'baudRate',
        description: 'UART communicationspeed baud/sec rate.',
        bitStart: 1,
        bitLength: 2,
        options: [
          { val: 0, label: '38400' },
          { val: 1, label: '19200' },
        ],
      },
    ],
  },
  {
    id: 'decelerationLimit',
    register: getCmds(0x05),
    ...time,
  },
  {
    id: 'hardwareVersion',
    register: { read: 0x3F },
  },
  {
    id: 'heatsinkTemperature',
    register: { read: 0x0A },
  },
  {
    id: 'inputFrequency',
    register: { read: 0x14 },
  },
  {
    id: 'inputPulseWidth',
    register: { read: 0x15 },
  },
  {
    id: 'inputPulseCount',
    register: { read: 0x19 },
  },
  {
    id: 'irCompensation',
    register: getCmds(0x20),
  },
  {
    id: 'loadCurrent',
    register: { read: 0x12 },
    offset: HALF_VAL, // 2047
    ...current,
  },
  {
    id: 'loadCurrentCal',
    register: { write: 0x7D },
  },
  {
    id: 'loadCurrentLimit',
    description: '0-50A - P1 input.',
    led: true, // Active limit will be displayed on board LED.
    register: getCmds(0x02),
    ...current,
    pot: 1,
  },
  {
    id: 'loadDutyFactor', // 4095?
    name: 'Speed Actual',
    description: 'Output load % duty factor, The max is 2048. If you multiply this by supply voltage you get the output voltage.',
    // maxVal: 2048,
    precision: 2,
    register: { read: 0x16 },
    unit: 'percent',
    resolution: _.mean([
      96.6 / 4049,
      49.31 / 2047,
      33.23 / 1365,
    ]),
  },
  {
    id: 'loadVoltsLimit',
    description: 'Target motor voltage at full speed. Must also save loadVoltsLimitEnabled value in config2.',
    register: getCmds(0x21),
    ...volts,
  },
  {
    id: 'lockVars',
    description: 'Lock level 2 variables.',
    register: getCmds(0x31),
    fields: [
      { id: 'speed', bitStart: 0 },
      { id: 'loadCurrentLimit', bitStart: 1 },
      { id: 'regenLimit', bitStart: 2 },
      { id: 'accelerationLimit', bitStart: 3 },
    ],
  },
  {
    id: 'regenLimit',
    description: 'Regeneration current limit - P3 input.',
    register: getCmds(0x03),
    pot: 3,
  },
  {
    id: 'save1',
    register: getCmds(0x32),
    fields: [
      { id: 'config2', bitStart: 13 },
      { id: 'config1', bitStart: 12 },
      { id: 'address', bitStart: 11 },
      { id: 'turnOffMaxVolts', bitStart: 9 },
      { id: 'turnOnMaxVolts', bitStart: 8 },
      { id: 'turnOffMinVolts', bitStart: 7 },
      { id: 'turnOnMinVolts', bitStart: 6 },
      { id: 'decelerationLimit', bitStart: 5 },
      { id: 'accelerationLimit', bitStart: 4 },
      { id: 'regenLimit', bitStart: 3 },
      { id: 'currentLimit', bitStart: 2 },
      { id: 'speed', bitStart: 0 },
    ],
  },
  {
    id: 'save2',
    register: getCmds(0x33),
    fields: [
      { id: 'adcMin', bitStart: 4 },
      { id: 'adcMax', bitStart: 3 },
      { id: 'loadVoltsLimit', bitStart: 2 },
      { id: 'irCompensation', bitStart: 1 },
      { id: 'currentCal', bitStart: 0 },
    ],
  },
  {
    id: 'softwareVersion',
    register: { read: 0x3E },
  },
  {
    id: 'speed',
    name: 'Speed Requested',
    description: 'Max value is 4095 it is the 97% duty cycle. Roughly 42 values per percent.',
    unit: 'percent',
    precision: 2,
    resolution: getResolution(97, 12),
    register: getCmds(0x00),
  },
  {
    id: 'status',
    register: { read: 0x30 },
    fields: [
      {
        id: 'fowardMode',
        bitStart: 9,
        options: [
          { val: 0, label: 'Stop' },
          { val: 1, label: 'Forward' },
        ],
      },
      {
        id: 'auxPin',
        description: 'Only works when not in PWM mode.',
        bitStart: 6,
        options: [
          { val: 0, label: 'Low' },
          { val: 1, label: 'High' },
        ],
      },
      {
        id: 'adcPin',
        bitStart: 5,
        options: [
          { val: 0, label: 'Over 2 volts' },
          { val: 1, label: 'Under 1 volt' },
        ],
      },
      {
        id: 'driveStatus',
        bitStart: 4,
        options: [
          { val: 0, label: 'Drive mode' },
          { val: 1, label: 'Brake mode' },
        ],
      },
      {
        id: 'overTemperature',
        bitStart: 2,
        options: [
          { val: 0, label: 'No' },
          { val: 1, label: 'Yes, Over Temp' },
        ],
      },
      {
        id: 'overVoltage',
        bitStart: 1,
        options: [
          { val: 0, label: 'No' },
          { val: 1, label: 'Yes, Over Voltage' },
        ],
      },
      {
        id: 'underVoltage',
        bitStart: 0,
        options: [
          { val: 0, label: 'No' },
          { val: 1, label: 'Yes, Under Voltage' },
        ],
      },
    ],
  },
  {
    id: 'supplyVolts',
    name: 'Supply Volts',
    register: { read: 0x10 },
    // offset: -5,
    ...volts,
  },
  {
    id: 'turnOffMaxVolts',
    register: getCmds(0x09),
    led: true,
    ...volts,
  },
  {
    id: 'turnOffMinVolts',
    description: 'Turn off output when supply volts falls below this level.',
    register: getCmds(0x06),
    ...volts,
  },
  {
    id: 'turnOnMaxVolts',
    default: 2600,
    description: 'Max allowable turn-on volts.',
    register: getCmds(0x08),
    ...volts,
  },
  {
    id: 'turnOnMinVolts',
    description: 'Typically 10.0V',
    default: 10 / volts.resolution,
    register: getCmds(0x07),
    ...volts,
  },
  {
    id: 'unknown1',
    register: { read: 0x0F },
  },
  {
    id: 'unknown2',
    register: { read: 0x19 },
  },
  {
    id: 'unknown3',
    register: { read: 0x24 },
  },
]

const commandIndex = _.keyBy('id', commands)
const getCommand = _.propertyOf(commandIndex)
const getReadRegister = _.flow(getCommand, _.get('register.read'))
const getWriteRegister = _.flow(getCommand, _.get('register.write'))
const readCommands = _.filter(_.has('register.read'), commands)
const potCommands = _.filter(_.get('pot'), commands)
const getAll = _.map(getCommand)
const configCommands = getAll(['config1', 'config2', 'status', 'save1', 'save2'])
const powerCommands = getAll(['supplyVolts', 'loadDutyFactor', 'loadCurrent'])
const inputCommands = [
  ...potCommands,
  ...getAll(['adcValue', 'inputFrequency', 'inputPulseWidth', 'inputPulseCount', 'supplyVolts']),
]
module.exports = {
  commands,
  commandIndex,
  getReadRegister,
  getResolution,
  getWriteRegister,
  getCommandInfo: getCommand,
  configCommands,
  MAX_VAL,
  potCommands,
  powerCommands,
  readCommands,
  inputCommands,
}
