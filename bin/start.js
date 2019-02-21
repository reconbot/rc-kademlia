#!/usr/bin/env node

// tslint:disable:no-console
process.env.DEBUG = process.env.DEBUG || '*'

const { connect } = require('../dist')
console.log('starting DHT')
async function run() {
  const a = await connect()
  a.pingPeers()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
