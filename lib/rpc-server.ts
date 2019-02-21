import debug from 'debug'
import { PeerInfo } from './types'
import { ping, decodePacket, Pong, pong, Ping } from './packets'
import { Socket, RemoteInfo } from 'dgram'
import { EventEmitter } from 'events'
const logger = debug('rck:RPCServer')

interface RPCPong {
  address: string
  port: number
  nonce: Buffer
}

export class RPCServer {
  public readonly socket: Socket
  public readonly id: Buffer
  public readonly messages: EventEmitter
  constructor({ socket, id }: { socket: Socket; id: Buffer }) {
    this.id = id
    this.socket = socket
    this.messages = new EventEmitter()
    this.handleMessages()
    this.handlePing()
  }

  public async ping(peer: PeerInfo, timeout = 500) {
    const { port, address, id } = peer
    logger('ping', { id: id.toString('hex') })
    this.socket.send(ping.encode({ id: this.id }), port, address)
    await this.receivePong(id, timeout)
  }

  public receivePong(id: Buffer, timeout: number) {
    logger('receivePong waiting', { id: id.toString('hex') })
    return new Promise((resolve, reject) => {
      const handler = ({ message }: { message: Pong }) => {
        if (id.equals(message.id)) {
          clearTimeout(timer)
          this.messages.off('pong', handler)
          logger('receivePong received', { id: id.toString('hex') })
          resolve(message)
        }
      }
      const timer = setTimeout(() => {
        this.messages.off('pong', handler)
        logger('receivePong Timeout', { id: id.toString('hex') })
        reject(new Error(`timeout: id:${id.toString('hex')}`))
      }, timeout)
      this.messages.on('pong', handler)
    })
  }

  private async pong(peerInfo: PeerInfo, nonce: Buffer) {
    logger('pong', { id: peerInfo.id.toString('hex') })
    const { port, address } = peerInfo
    this.socket.send(pong.encode({ id: this.id, nonce }), port, address)
  }

  private onMessage(packet: Buffer, remoteInfo: RemoteInfo) {
    const message = decodePacket(packet)
    if (!message) {
      logger('onMessage: unknown type', { packet: packet.toString('hex') })
      return
    }
    logger(`onMessage: ${message.type}`)
    this.messages.emit(message.type, { remoteInfo, message })
  }

  private handlePing() {
    this.messages.on('ping', ({ remoteInfo, message }: { remoteInfo: RemoteInfo; message: Ping }) => {
      const { nonce, id } = message
      const { address, port } = remoteInfo
      this.pong({ address, port, id }, nonce)
    })
  }

  private handleMessages() {
    this.socket.on('message', (msg, rinfo) => {
      this.onMessage(msg, rinfo)
    })
  }
}
