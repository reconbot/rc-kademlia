#!/usr/bin/env node
// tslint:disable:no-console

import { connect } from './'
import { prompt } from 'promptly'
import { createHash } from 'crypto'
import { shortId } from './util'
import { ChatMessage } from './packets'
import chalk from 'chalk'
import debug from 'debug'

debug.enable('rck:DHT*')

// I was going to filter ascii escapes and stuff but I want emoji dammit!
function filterText(s) {
  return s
}

function hash(name: string): Buffer {
  const sha1 = createHash('sha1')
  sha1.update(name)
  return sha1.digest()
}

async function run() {
  const name =
    (await prompt('What is your chosen name?: ', { trim: true, default: '', validator: filterText })) ||
    `anonymous-${Math.round(Math.random() * 1000)}`
  const id = hash(name)
  console.log(`Nice to meet you ${name}. I'm starting the DHT we'll have you online in no time!`)
  const dht = await connect({ id })

  dht.rpcServer.messages.on('chatMessage', ({ message }: { message: ChatMessage }) => {
    console.log(chalk.blue(`\n${message.message} (${shortId(message.id)})`))
  })

  console.log('DHT is online and operational!')
  while (true) {
    console.log(`I see you're connected to ${dht.addressBook.size} peers!`)
    const friendsName = await prompt('Who would you like to chat with?', { trim: true })
    const friendsId = hash(friendsName)
    const peer = await dht.findPeer(friendsId)
    if (peer) {
      console.log('I found your friend!', { id: shortId(peer), address: peer.address, port: peer.port })
      const message = await prompt('What would you like to stay to them?', {
        trim: true,
        validator: filterText,
      })
      dht.rpcServer.sendChat(peer, `${name}: ${message}`)
      console.log('SENT!')
    } else {
      console.log(`I couldn't find anyone named "${friendsName}" with id ${shortId(friendsId)} =(`)
    }
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
