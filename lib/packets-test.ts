import { deepEqual, ok, equal } from 'assert'
import { decodePacket, localPeerResponse, localPeerRequest, ping, Ping, pong } from './packets'
import { makeId } from './util'
import { randomBytes } from 'crypto'

describe('packets', () => {
  describe('localPeerResponse', () => {
    it('encodes/decodes', () => {
      const message = { port: 4, id: makeId() }
      const packet = localPeerResponse.encode(message)
      deepEqual(decodePacket(packet), { ...message, type: 'localPeerResponse' })
    })
  })
  describe('localPeerRequest', () => {
    it('encodes/decodes', () => {
      const message = { port: 4, id: makeId() }
      const packet = localPeerRequest.encode(message)
      deepEqual(decodePacket(packet), { ...message, type: 'localPeerRequest' })
    })
  })
  describe('ping', () => {
    it('encodes/decodes', () => {
      const message = { id: makeId() }
      const packet = ping.encode(message)
      const { type, id, nonce } = decodePacket(packet) as Ping
      deepEqual({ type, id }, { ...message, type: 'ping' })
      ok(Buffer.isBuffer(nonce))
      equal(nonce.length, 20)
    })
  })
  describe('pong', () => {
    it('encodes/decodes', () => {
      const message = { id: makeId(), nonce: randomBytes(20) }
      const packet = pong.encode(message)
      deepEqual(decodePacket(packet), { ...message, type: 'pong' })
    })
  })
})
