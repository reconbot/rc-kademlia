import debug from 'debug'
import { createSocket, Socket } from 'dgram'
import { AddressInfo } from 'net'
import { decodePacket, LocalPeerResponse, LocalPeerRequest, localPeerResponse, localPeerRequest } from './packets'
import { PeerInfo } from './types'
import { EventEmitter } from 'events'
import { shortId } from './util'

export class LocalPeerFinder {
  public readonly port: number
  public readonly id: Buffer
  public readonly logger: (...args: any[]) => void
  private readonly events: EventEmitter
  private readonly socket: Socket

  constructor({ port, id }: { port: number; id: Buffer }) {
    this.port = port
    this.id = id
    this.logger = debug(`rck:LPF:${shortId(this.id)}`)
    this.socket = createSocket({ type: 'udp4' })
    this.socket.bind(1338)
    this.socket.on('listening', () => {
      this.socket.setBroadcast(true)
    })
    this.socket.on('message', (message, remoteAddress) => this.onMessage(message, remoteAddress))
    this.events = new EventEmitter()
  }

  public async findOne({ timeout = 500 } = {}): Promise<PeerInfo | null> {
    return new Promise<PeerInfo | null>(resolve => {
      const onPeer = (peer: PeerInfo) => {
        clearTimeout(timeoutObj)
        this.logger('findOne', shortId(peer.id))
        resolve(peer)
      }
      const timeoutObj = setTimeout(() => {
        this.events.off('peer', onPeer)
        resolve(null)
      }, timeout)
      this.events.once('peer', onPeer)
      this.announce()
    })
  }

  public stop() {
    this.logger('stop')
    this.socket.close()
  }

  public async announce() {
    this.logger('announce')
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
      this.logger(`onMessage: unknown type ${data.toString('hex')}`)
      return
    }
    this.logger(`onMessage: ${message.type}`)
    switch (message.type) {
      case 'localPeerRequest':
        return this.respondToPeerRequest(message, remoteAddress)
      case 'localPeerResponse':
        return this.emitPeerInfo(message, remoteAddress)
    }
  }

  private emitPeerInfo({ id, port }: LocalPeerResponse, remoteAddress) {
    const { address } = remoteAddress
    const peerInfo: PeerInfo = {
      id,
      port,
      address,
    }
    this.logger('emitPeerInfo: got peer info', { id: shortId(id), port, address })
    this.events.emit('peer', peerInfo)
  }

  private respondToPeerRequest({ id }: LocalPeerRequest, { address }: AddressInfo) {
    if (this.id.equals(id)) {
      this.logger('respondToPeerRequest: got from self')
      return
    }
    this.logger(`respondToPeerRequest: sending local info to ${address}`)
    this.send(localPeerResponse.encode({ id: this.id, port: this.port }), 1338, address)
  }
}
