import {
  actionChannel, all, call, delay, take, takeEvery, put, select,
} from 'redux-saga/effects'
import { serialWrite, SERIAL_DATA, SERIAL_OPENED } from '../serialport/actions'
import {
  commandDone, COMMAND_DONE, commandRequest, COMMAND_REQUEST, sendCommand,
} from './actions'
import { readCommands } from './commands'

function* getStatus() {
  yield delay(200)
  yield all(readCommands.map(({ id }) => put(commandRequest({ id }))))
}

function* getStatusOnReady() {
  yield takeEvery(SERIAL_OPENED, getStatus)
}

function* serialSendWrite({ payload }) {
  yield put(serialWrite(payload.txBytes))
  // How do we wait for the command to finish/resolve?
}

function* commandToSerial() {
  const requestChan = yield actionChannel(COMMAND_REQUEST)
  while (true) {
    const request = yield take(requestChan)
    yield delay(5)
    const action = yield put(sendCommand(request.payload))
    yield call(serialSendWrite, action)
    // Wait for it to finish.
    yield take(COMMAND_DONE)
  }
}
function* serialDataCheck() {
  const { controller: { command } } = yield select()
  if (command.rxRemaining === 0 && !command.done) {
    yield put(commandDone(command))
  }
}

function* serialData() {
  yield takeEvery(SERIAL_DATA, serialDataCheck)
}
export default function* rootSaga() {
  yield all([
    getStatusOnReady(),
    commandToSerial(),
    serialData(),
  ])
}
