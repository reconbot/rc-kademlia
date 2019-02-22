import { deepEqual, ok, equal } from 'assert'
import { RPCServer } from './rpc-server'
import { makeId } from './util'
import { Socket } from 'dgram'
import { EventEmitter } from 'events'

const makeSocket = () => {
  const socket: any = new EventEmitter()
  socket.send = () => {}
  return socket
}

describe('RPCServer', () => {
  let socket: Socket
  let id: Buffer
  beforeEach(() => {
    socket = makeSocket()
    id = makeId()
  })
  it('constructs', () => {
    const foo = new RPCServer({ socket, id })
  })
})
