const { createSimpleAction } = require('cape-redux')
const { prepCommand } = require('./command')

const COMMAND = 'controller/COMMAND'

const sendCommand = createSimpleAction(COMMAND, prepCommand)

const COMMAND_REQUEST = 'controller/COMMAND_REQUEST'
const commandRequest = createSimpleAction(COMMAND_REQUEST)

const UPDATED = 'controller/UPDATED'
const updated = createSimpleAction(UPDATED)

const COMMAND_DONE = 'controller/COMMAND_DONE'
const commandDone = createSimpleAction(COMMAND_DONE)

module.exports = {
  sendCommand,
  commandRequest,
  updated,
  commandDone,
}
