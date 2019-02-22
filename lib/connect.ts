import { PeerInfo } from './types'
import { DHT } from './dht'
import { getRandomSocket } from './util'

export const connect = async ({ id, peers = [] }: { id?: Buffer; peers?: PeerInfo[] } = {}) => {
  const socket = await getRandomSocket()

  const dht = new DHT({
    id,
    socket,
    peers,
  })
  await dht.bootStrapped
  return dht
}
