import { deepEqual } from 'assert'
import { decodePacket, localPeerRequest } from './packets'
import { makeId } from './util'

describe('DHT', () => {
  describe('contruction', () => {
    it('encodes/decodes', () => {
      const message = { port: 4, id: makeId() }
      const packet = localPeerRequest.encode(message)
      deepEqual(decodePacket(packet), { ...message, type: 'localPeerRequest' })
    })
  })
})
