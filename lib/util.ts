import { randomBytes } from 'crypto'
import { createSocket } from 'dgram'

export const getRandomSocket = async () => {
  const socket = createSocket({ type: 'udp4' })
  await new Promise(resolve => {
    socket.bind(() => {
      resolve()
    })
  })
  return socket
}

export const makeId = () => randomBytes(20)
