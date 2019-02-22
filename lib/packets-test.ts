import { deepEqual, ok, equal } from 'assert'
import {
  decodePacket,
  localPeerResponse,
  localPeerRequest,
  ping,
  pong,
  findNode,
  findNodeResponse,
  chatMessage,
} from './packets'
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
      const message = { id: makeId(), nonce: randomBytes(20) }
      const packet = ping.encode(message)
      deepEqual(decodePacket(packet), { ...message, type: 'ping' })
    })
  })
  describe('pong', () => {
    it('encodes/decodes', () => {
      const message = { id: makeId(), nonce: randomBytes(20) }
      const packet = pong.encode(message)
      deepEqual(decodePacket(packet), { ...message, type: 'pong' })
    })
  })
  describe('findNode', () => {
    it('encodes/decodes', () => {
      const message = { id: makeId(), findId: makeId() }
      const packet = findNode.encode(message)
      deepEqual(decodePacket(packet), { ...message, type: 'findNode' })
    })
  })
  describe('findNodeResponse', () => {
    it('encodes/decodes', () => {
      const message = {
        id: makeId(),
        findId: makeId(),
        peers: [
          { id: makeId(), address: '123.123.123.432', port: 555 },
          { id: makeId(), address: '123.123.123.432', port: 583 },
        ],
      }
      const packet = findNodeResponse.encode(message)
      deepEqual(decodePacket(packet), { ...message, type: 'findNodeResponse' })
    })
  })
  describe('chatMessage', () => {
    it('encodes/decodes', () => {
      const message = {
        id: makeId(),
        message: 'hi!',
      }
      const packet = chatMessage.encode(message)
      deepEqual(decodePacket(packet), { ...message, type: 'chatMessage' })
    })
  })
})
