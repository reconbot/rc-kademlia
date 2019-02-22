import debug from 'debug'
import { PeerInfo } from './types'
import { ping, decodePacket, Pong, pong, findNode, FindNodeResponse, findNodeResponse, chatMessage } from './packets'
import { Socket, RemoteInfo } from 'dgram'
import { EventEmitter } from 'events'
import { shortId } from './util'
import { randomBytes } from 'crypto'

export class RPCServer {
  public readonly socket: Socket
  public readonly id: Buffer
  public readonly messages: EventEmitter
  public readonly logger: (...args: any[]) => void
  constructor({ socket, id }: { socket: Socket; id: Buffer }) {
    this.id = id
    this.socket = socket
    this.messages = new EventEmitter()
    this.handleMessages()
    this.logger = debug(`rck:RPC:${shortId(this.id)}`)
  }

  public sendChat(peer: PeerInfo, message: string) {
    this.socket.send(chatMessage.encode({ id: this.id, message }), peer.port, peer.address)
  }

  public stop() {
    this.socket.close()
  }

  public async findNode(peer: PeerInfo, findId: Buffer, timeout?: number) {
    const { port, address } = peer
    this.socket.send(findNode.encode({ id: this.id, findId }), port, address)
    return this.waitForFindNodeResponse(peer, findId, timeout)
  }

  public async waitForFindNodeResponse(peer: PeerInfo, findId: Buffer, timeout = 500): Promise<PeerInfo[]> {
    this.logger('waitForFindNodeResponse waiting', shortId(findId))
    return new Promise<PeerInfo[]>((resolve, reject) => {
      const handler = ({ message }: { message: FindNodeResponse }) => {
        if (peer.id.equals(message.id) && findId.equals(message.findId)) {
          clearTimeout(timer)
          this.messages.removeListener('findNodeResponse', handler)
          this.logger('waitForFindNodeResponse received', shortId(peer))
          resolve(message.peers)
        }
      }
      const timer = setTimeout(() => {
        this.messages.removeListener('findNodeResponse', handler)
        this.logger('waitForFindNodeResponse Timeout', shortId(peer))
        reject(new Error(`waitForFindNodeResponse: timeout id:${shortId(peer)}`))
      }, timeout)
      this.messages.on('findNodeResponse', handler)
    })
  }

  public async nodeResponse(peer: PeerInfo, findId: Buffer, peers: PeerInfo[]) {
    this.logger('nodeResponse', shortId(peer), peers.length)
    this.socket.send(findNodeResponse.encode({ id: this.id, findId, peers }), peer.port, peer.address)
  }

  public async ping(peer: PeerInfo, timeout?: number) {
    const { port, address, id } = peer
    this.logger('ping', shortId(peer))
    const nonce = randomBytes(20)
    this.socket.send(ping.encode({ id: this.id, nonce }), port, address)
    return this.waitForPong(id, nonce, timeout)
  }

  public waitForPong(id: Buffer, nonce: Buffer, timeout = 500) {
    this.logger('waitForPong waiting', shortId(id))
    return new Promise<Pong>((resolve, reject) => {
      const handler = ({ message }: { message: Pong }) => {
        if (id.equals(message.id) && nonce.equals(message.nonce)) {
          clearTimeout(timer)
          this.messages.removeListener('pong', handler)
          this.logger('waitForPong received', shortId(id))
          resolve(message)
        }
      }
      const timer = setTimeout(() => {
        this.messages.removeListener('pong', handler)
        this.logger('waitForPong Timeout', shortId(id))
        reject(new Error(`timeout: id:${id.toString('hex')}`))
      }, timeout)
      this.messages.on('pong', handler)
    })
  }

  public async pong(peer: PeerInfo, nonce: Buffer) {
    this.logger('pong', shortId(peer))
    const { port, address } = peer
    this.socket.send(pong.encode({ id: this.id, nonce }), port, address)
  }

  private onMessage(packet: Buffer, remoteInfo: RemoteInfo) {
    const message = decodePacket(packet)
    if (!message) {
      this.logger('onMessage: unknown type', { packet: packet.toString('hex') })
      return
    }
    this.logger(`onMessage: ${message.type}`)
    this.messages.emit(message.type, { remoteInfo, message })
  }
  private handleMessages() {
    this.socket.on('message', (msg, rinfo) => this.onMessage(msg, rinfo))
  }
}
