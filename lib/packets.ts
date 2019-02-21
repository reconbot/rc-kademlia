import debug from 'debug'
import { randomBytes } from 'crypto'
const logger = debug('rck:packets')

const HEADER_LENGTH = 2

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type PacketInput<T extends PacketBase> = Omit<T, 'type'>

interface PacketBase {
  type: string
}

type KnownPackets = LocalPeerRequest | LocalPeerResponse | Ping | Pong
type KnownPacketNames = KnownPackets['type']

interface PacketInfo {
  name: KnownPacketNames
  header: Buffer
  dataLength: number
  encode: (input: any) => Buffer
  decode: (data: Buffer) => KnownPackets | null
}

export interface LocalPeerRequest {
  type: 'localPeerRequest'
  port: number
  id: Buffer
}

export const localPeerRequest = {
  name: 'localPeerRequest',
  header: Buffer.from([0, 0]),
  dataLength: 20 + 2,
  encode({ port, id }: PacketInput<LocalPeerRequest>): Buffer {
    const buff = Buffer.alloc(HEADER_LENGTH + this.dataLength) // type + id + port
    this.header.copy(buff)
    id.copy(buff, HEADER_LENGTH)
    buff.writeUInt16BE(port, HEADER_LENGTH + id.length)
    return buff
  },
  decode(data: Buffer): LocalPeerRequest | null {
    if (!data.slice(0, 2).equals(this.header)) {
      return null
    }
    if (data.length !== HEADER_LENGTH + this.dataLength) {
      return null
    }
    const id = data.slice(HEADER_LENGTH, HEADER_LENGTH + 20)
    const port = data.readUInt16BE(HEADER_LENGTH + 20)
    return { port, id, type: 'localPeerRequest' }
  },
}

export interface LocalPeerResponse {
  type: 'localPeerResponse'
  port: number
  id: Buffer
}

export const localPeerResponse = {
  name: 'localPeerResponse',
  header: Buffer.from([0, 1]),
  dataLength: 20 + 2,
  encode({ port, id }: PacketInput<LocalPeerResponse>): Buffer {
    const buff = Buffer.alloc(HEADER_LENGTH + this.dataLength) // type + id + port
    this.header.copy(buff)
    id.copy(buff, HEADER_LENGTH)
    buff.writeUInt16BE(port, HEADER_LENGTH + id.length)
    return buff
  },
  decode(data: Buffer): LocalPeerResponse | null {
    if (!data.slice(0, 2).equals(this.header)) {
      return null
    }
    if (data.length !== HEADER_LENGTH + this.dataLength) {
      return null
    }
    const id = data.slice(HEADER_LENGTH, HEADER_LENGTH + 20)
    const port = data.readUInt16BE(HEADER_LENGTH + 20)
    return { port, id, type: 'localPeerResponse' }
  },
}

export interface Ping {
  type: 'ping'
  id: Buffer
  nonce: Buffer
}

export const ping = {
  name: 'ping',
  header: Buffer.from([0, 2]),
  dataLength: 40,
  encode({ id }: { id: Buffer }): Buffer {
    const buff = Buffer.alloc(HEADER_LENGTH + this.dataLength)
    this.header.copy(buff)
    id.copy(buff, HEADER_LENGTH)
    randomBytes(20).copy(buff, HEADER_LENGTH + id.length)
    return buff
  },
  decode(data: Buffer): Ping | null {
    if (!data.slice(0, 2).equals(this.header)) {
      return null
    }
    if (data.length !== HEADER_LENGTH + this.dataLength) {
      return null
    }
    const id = data.slice(HEADER_LENGTH, HEADER_LENGTH + 20)
    const nonce = data.slice(HEADER_LENGTH + 20, HEADER_LENGTH + 20 + 20)
    return { type: 'ping', id, nonce }
  },
}

export interface Pong {
  type: 'pong'
  id: Buffer
  nonce: Buffer
}

export const pong = {
  name: 'pong',
  header: Buffer.from([0, 3]),
  dataLength: 40,
  encode({ id, nonce }: PacketInput<Pong>): Buffer {
    const buff = Buffer.alloc(HEADER_LENGTH + this.dataLength)
    this.header.copy(buff)
    id.copy(buff, HEADER_LENGTH)
    nonce.copy(buff, HEADER_LENGTH + id.length)
    return buff
  },
  decode(data: Buffer): Pong | null {
    if (!data.slice(0, 2).equals(this.header)) {
      return null
    }
    if (data.length !== HEADER_LENGTH + this.dataLength) {
      return null
    }
    const id = data.slice(HEADER_LENGTH, HEADER_LENGTH + 20)
    const nonce = data.slice(HEADER_LENGTH + 20, HEADER_LENGTH + 20 + 20)
    return { type: 'pong', id, nonce }
  },
}

const knownPacketsArr = [localPeerRequest, localPeerResponse, ping, pong]
const knownPacketHash = { localPeerRequest, localPeerResponse, ping, pong }
const headerMap = new Map<string, PacketInfo>()
knownPacketsArr.forEach(info => {
  if (info.header.length !== HEADER_LENGTH) {
    throw new Error(`PacketType ${info.name} has an invalid header length`)
  }
  const hex = info.header.toString('hex')
  const prevPacket = headerMap.get(hex)
  if (prevPacket) {
    throw new Error(`PacketType ${info.name} has the same header as ${prevPacket.name}`)
  }
  headerMap.set(hex, info as PacketInfo)
})

export const decodePacket = (data: Buffer): KnownPackets | null => {
  if (data.length < 2) {
    return null
  }
  const header = data.slice(0, 2).toString('hex')
  const info = headerMap.get(header)
  if (!info) {
    logger(`Cannot find ${header} in ${Array.from(headerMap.keys())}`)
    return null
  }
  return knownPacketHash[info.name].decode(data)
}
