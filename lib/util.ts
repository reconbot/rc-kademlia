import { randomBytes } from 'crypto'
import { createSocket } from 'dgram'
import * as distance from 'xor-distance'
import { PeerInfo } from './types'

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

export const timeout = (ms: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`timed out after ${ms}ms`))
    }, ms)
  })
}

export const delay = <T>(ms: number, data?: T): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(data)
    }, ms)
  })
}

export const shortId = (id: Buffer | PeerInfo) =>
  Buffer.isBuffer(id) ? id.slice(0, 4).toString('hex') : shortId(id.id)

export const bufferToBinary = (buff: Buffer) => {
  let output = ''
  for (const byte of buff) {
    const binary = byte.toString(2)
    output += '0'.repeat(8 - binary.length) + binary
  }
  return output
}
/**
 * A Map where the keys have to be buffers and internally it uses the hex value of the buffer for the key
 */
export class BufferMap<T> {
  public map: Map<string, { value: T; key: Buffer }>

  get size() {
    return this.map.size
  }
  get [Symbol.toStringTag]() {
    return '[object BufferMap]'
  }

  constructor() {
    this.map = new Map()
  }
  public set(key: Buffer, value: T) {
    this.map.set(key.toString('hex'), { value, key })
    return this
  }
  public get(key: Buffer): T | undefined {
    const boxedValue = this.map.get(key.toString('hex'))
    return boxedValue && boxedValue.value
  }

  public has(buff: Buffer) {
    return this.map.has(buff.toString('hex'))
  }

  public delete(buff: Buffer) {
    return this.map.delete(buff.toString('hex'))
  }
  public clear() {
    this.map.clear()
  }
  public [Symbol.iterator]() {
    return this.entries()
  }
  public *entries() {
    for (const [stringKey, { key, value }] of this.map) {
      yield [key, value] as [Buffer, T]
    }
  }
  public *keys() {
    for (const [stringKey, { key }] of this.map) {
      yield key
    }
  }
  public *values() {
    for (const [stringKey, { value }] of this.map) {
      yield value
    }
  }
  public forEach(func: (val1: T, val2: Buffer, map: BufferMap<T>) => void, thisArg?: any) {
    for (const [key, value] of this) {
      func.call(thisArg, value, key, this)
    }
  }
}

export class BufferSet {
  private map: Map<string, Buffer>
  get size() {
    return this.map.size
  }
  get [Symbol.toStringTag]() {
    return '[object BufferSet]' as any
  }
  constructor() {
    this.map = new Map<string, Buffer>()
  }
  public add(buff: Buffer) {
    this.map.set(buff.toString('hex'), buff)
    return this
  }

  public has(buff: Buffer) {
    return this.map.has(buff.toString('hex'))
  }

  public delete(buff: Buffer) {
    return this.map.delete(buff.toString('hex'))
  }
  public clear() {
    this.map.clear()
  }
  public forEach(func: (val1: Buffer, val2: Buffer, set: BufferSet) => void, thisArg?: any) {
    for (const buff of this.map.values()) {
      func.call(thisArg, buff, buff, this)
    }
  }
  public [Symbol.iterator]() {
    return this.map.values()
  }
  public *entries() {
    for (const buff of this) {
      yield [buff, buff] as [Buffer, Buffer]
    }
  }
  public keys() {
    return this.map.values()
  }
  public values() {
    return this.map.values()
  }
}

export const sortPeersByDistanceTo = (id: Buffer) => (a: PeerInfo, b: PeerInfo) => {
  const aDistance = distance(id, a.id)
  const bDistance = distance(id, b.id)
  return distance.compare(aDistance, bDistance)
}
