import debug from 'debug'
import { pipeline, flatTransform, map, consume, take, transform, collect } from 'streaming-iterables'
import { Socket, RemoteInfo } from 'dgram'
import { PeerInfo } from './types'
import { LocalPeerFinder } from './local-peer-finder'
import { AddressInfo } from 'net'
import { makeId, delay, shortId, bufferToBinary, BufferSet, BufferMap, sortPeersByDistanceTo } from './util'
import { RPCServer } from './rpc-server'
import { Ping, FindNode } from './packets'

export class DHT {
  public readonly id: Buffer
  public readonly rpcServer: RPCServer
  public readonly addressBook: BufferMap<PeerInfo>
  public readonly logger: (...args: any[]) => void
  private readonly peerFinder: LocalPeerFinder

  constructor({ socket, id = makeId(), peers }: { socket: Socket; id?: Buffer; peers: PeerInfo[] }) {
    this.id = id
    this.logger = debug(`rck:DHT:${shortId(this.id)}`)
    this.addressBook = new BufferMap()
    peers.map(peer => this.addPeer(peer))
    const { port } = socket.address() as AddressInfo
    this.rpcServer = new RPCServer({ socket, id })
    this.peerFinder = new LocalPeerFinder({ port, id })
    this.respondToPings()
    this.respondToNodeLookups()
    this.bootStrap()
  }

  public async findOneLocalPeer() {
    this.logger('findOneLocalPeer')
    const peer = await this.peerFinder.findOne()
    if (peer) {
      this.logger('findOneLocalPeer: found one', shortId(peer.id))
      this.addPeer(peer)
    }
    return peer
  }

  public async findPeer(id: Buffer): Promise<PeerInfo | null> {
    const alreadyFoundPeer = this.addressBook.get(id)
    if (alreadyFoundPeer) {
      return alreadyFoundPeer
    }

    const queriedPeers = new BufferSet()
    queriedPeers.add(this.id)
    const peersToAsk = this.closestPeers(id)

    function* shiftNextPeer() {
      while (peersToAsk.length > 0) {
        yield peersToAsk.shift()
      }
    }

    const askForPeers = async (peerToAsk: PeerInfo) => {
      if (queriedPeers.size > 20) {
        return
      }
      this.logger(`findPeer: asking ${shortId(peerToAsk)} for a peer, already asked ${queriedPeers.size} peers`)
      queriedPeers.add(peerToAsk.id)
      try {
        const peers = await this.rpcServer.findNode(peerToAsk, id)
        for (const foundPeer of peers) {
          if (queriedPeers.has(foundPeer.id)) {
            continue
          }
          this.addPeer(foundPeer)
          if (id.equals(foundPeer.id)) {
            return foundPeer
          }
          peersToAsk.push(foundPeer)
        }
        peersToAsk.sort(sortPeersByDistanceTo(id))
        peersToAsk.splice(20)
      } catch {
        this.logger(`findPeer: ${shortId(peerToAsk)} did not respond`)
      }
    }

    const [peer] = await pipeline(() => shiftNextPeer(), flatTransform(3, askForPeers), take(1), collect)
    if (!peer) {
      this.logger('findPeer: lookup returned no results')
    }
    return peer || null
  }

  public stop() {
    // close sockets
    this.rpcServer.stop()
    this.peerFinder.stop()
  }

  public async pingPeers() {
    for (const peer of this.addressBook.values()) {
      try {
        await this.rpcServer.ping(peer)
      } catch (error) {
        // tslint:disable-next-line:no-console
        this.logger('pingPeers', error.message)
      }
    }
    setTimeout(() => this.pingPeers(), 5000)
  }

  public addPeer(peer: PeerInfo) {
    this.logger('addPeer', shortId(peer.id))
    if (this.addressBook.has(peer.id)) {
      return
    }
    this.addressBook.set(peer.id, peer)
  }

  public ping(peer: PeerInfo) {
    this.logger('ping', shortId(peer.id))
    return this.rpcServer.ping(peer)
  }

  private async bootStrap() {
    this.logger('bootStrap: Starting')
    const firstPeer = await this.ensureOnePeer()
    const results = await this.rpcServer.findNode(firstPeer, this.id)
    await pipeline(
      () => results,
      flatTransform<PeerInfo, PeerInfo>(Infinity, peer => this.ping(peer).then(() => peer, err => null)),
      map<PeerInfo, void>(peer => this.addPeer(peer)),
      consume
    )
    await this.probeAddressSpace()
    this.logger('bootStrap: Finished', { peers: this.addressBook.size })
  }

  private async probeAddressSpace() {
    for (let i = 0; i < 160; i++) {
      const id = Buffer.alloc(20)
      const byteIndex = Math.floor(i / 8)
      const bit = i % 8
      // tslint:disable-next-line:no-bitwise
      const byteValue = 256 >> bit
      id[byteIndex] = byteValue
      await this.findPeer(id)
    }
  }

  private async ensureOnePeer() {
    while (this.addressBook.size === 0) {
      const peer = await this.findOneLocalPeer()
      if (!peer) {
        await delay(1000)
      }
    }
    return this.addressBook.values().next().value
  }

  // todo double check this order
  private closestPeers(id: Buffer): PeerInfo[] {
    const peers = Array.from(this.addressBook.values())
    peers.sort(sortPeersByDistanceTo(id))
    return peers.slice(0, 20)
  }

  private respondToPings() {
    this.rpcServer.messages.on('ping', ({ remoteInfo, message }: { remoteInfo: RemoteInfo; message: Ping }) => {
      const { nonce, id } = message
      const { address, port } = remoteInfo
      this.addPeer({ id, address, port })
      this.rpcServer.pong({ address, port, id }, nonce)
    })
  }

  private respondToNodeLookups() {
    this.rpcServer.messages.on('findNode', ({ remoteInfo, message }: { remoteInfo: RemoteInfo; message: FindNode }) => {
      const { id, findId } = message
      const { address, port } = remoteInfo
      const peer = { id, address, port }
      this.addPeer(peer)
      const peers = this.closestPeers(findId)
      this.logger('respondToNodeLookups: responding to', shortId(peer), peers.length)
      this.rpcServer.nodeResponse(peer, findId, peers)
    })
  }
}
