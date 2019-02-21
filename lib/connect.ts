import { PeerInfo } from './types'
import { DHT } from './dht'
import { makeId, getRandomSocket } from './util'

export const connect = async ({ peers = [] }: { peers?: PeerInfo[] } = {}) => {
  const socket = await getRandomSocket()

  const dht = new DHT({
    socket,
    peers,
  })

  return dht
}
