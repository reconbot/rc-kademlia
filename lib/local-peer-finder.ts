import debug from 'debug'
import { createSocket, Socket } from 'dgram'
import { AddressInfo } from 'net'
import { decodePacket, LocalPeerResponse, LocalPeerRequest, localPeerResponse, localPeerRequest } from './packets'
import { PeerInfo } from './types'

const logger = debug('rck:LocalPeerFinder')

export class LocalPeerFinder {
  public readonly port: number
  public readonly id: Buffer
  public knownPeers: Map<string, PeerInfo>
  public onPeer: ((peer: PeerInfo) => void)
  private readonly socket: Socket
  constructor({ port, id, onPeer = () => {} }: { port: number; id: Buffer; onPeer?: (peer: PeerInfo) => void }) {
    logger('constructor', { id: id.toString('hex'), port })
    this.port = port
    this.id = id
    this.onPeer = onPeer
    this.knownPeers = new Map()
    this.socket = createSocket({ type: 'udp4' })
    this.socket.bind(1338)
    this.socket.on('listening', () => {
      this.socket.setBroadcast(true)
    })
    this.socket.on('message', (message, remoteAddress) => this.onMessage(message, remoteAddress))
  }
  public stop() {
    logger('stop')
    this.socket.close()
  }
  public async announce() {
    logger('announce')
    const { port, id } = this
    await this.send(localPeerRequest.encode({ port, id }), 1338, '255.255.255.255')
  }
  private send(data: Buffer, port: number, address: string) {
    return new Promise<number>((resolve, reject) => {
      this.socket.send(data, port, address, (error, bytes) => (error ? reject(error) : resolve(bytes)))
    })
  }
  private onMessage(data: Buffer, remoteAddress: AddressInfo) {
    const message = decodePacket(data)
    if (!message) {
      logger(`onMessage: unknown type ${data.toString('hex')}`)
      return
    }
    logger(`onMessage: ${message.type}`)
    switch (message.type) {
      case 'localPeerRequest':
        return this.onLocalPeerRequest(message, remoteAddress)
      case 'localPeerResponse':
        return this.onLocalPeerResponse(message, remoteAddress)
    }
  }

  private onLocalPeerResponse({ id, port }: LocalPeerResponse, remoteAddress) {
    const { address } = remoteAddress
    const peerInfo: PeerInfo = {
      id,
      port,
      address,
    }
    logger('onLocalPeerResponse: got peer info', { id: id.toString('hex'), port, address })
    this.savePeer(peerInfo)
  }

  private onLocalPeerRequest({ id, port }: LocalPeerRequest, remoteAddress: AddressInfo) {
    const { address } = remoteAddress
    const peerInfo: PeerInfo = {
      id,
      port,
      address,
    }
    if (this.id.equals(id)) {
      logger('onLocalPeerRequest: got from self')
      return
    }
    this.savePeer(peerInfo)
    logger(`onLocalPeerRequest: sending local info to ${address}`)
    this.send(localPeerResponse.encode({ id: this.id, port: this.port }), 1338, address)
  }
  private savePeer(peerInfo: PeerInfo) {
    const { id } = peerInfo
    const hex = id.toString('hex')
    const known = this.knownPeers.has(hex)
    if (!known) {
      logger('savePeer', { known: this.knownPeers.size, ...peerInfo, id: hex })
      this.knownPeers.set(hex, peerInfo)
      this.onPeer(peerInfo)
    }
  }
}
