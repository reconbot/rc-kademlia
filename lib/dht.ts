import debug from 'debug'
import { Socket } from 'dgram'
import { PeerInfo } from './types'
import { LocalPeerFinder } from './local-peer-finder'
import { AddressInfo } from 'net'
import { makeId } from './util'
import { RPCServer } from './rpc-server'
const logger = debug('rck:DHT')

export class DHT {
  public readonly id: Buffer
  public readonly rpcServer: RPCServer
  private peerFinder: LocalPeerFinder
  private addressBook: Set<PeerInfo>

  constructor({ socket, id = makeId(), peers }: { socket: Socket; id?: Buffer; peers: PeerInfo[] }) {
    this.id = id
    this.addressBook = new Set<PeerInfo>()
    peers.map(peer => this.addPeer(peer))
    const { port } = socket.address() as AddressInfo
    this.rpcServer = new RPCServer({ socket, id })
    this.peerFinder = new LocalPeerFinder({ port, id, onPeer: peer => this.addPeer(peer) })
    this.peerFinder.announce()
  }

  public async pingPeers() {
    for (const peer of this.addressBook.values()) {
      try {
        await this.rpcServer.ping(peer)
      } catch (error) {
        // tslint:disable-next-line:no-console
        console.log(error.message)
      }
    }
    setTimeout(() => this.pingPeers(), 5000)
  }

  public addPeer(peer: PeerInfo) {
    logger('addPeer', peer.id.slice(0, 4).toString('hex'))
    this.addressBook.add(peer)
  }

  public ping(peer: PeerInfo) {
    return this.rpcServer.ping(peer)
  }

  private closestPeers(id: Buffer): PeerInfo[] {
    throw new Error('foobar')
  }
}
