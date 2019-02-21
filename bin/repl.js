#!/usr/bin/env node

// tslint:disable:no-console
process.env.DEBUG = process.env.DEBUG || '*'

const repl = require('repl')
const rcK = require('../dist')

let port = 4000
const makeFinder = () => new rcK.LocalPeerFinder({ port: port++, id: Buffer.allocUnsafe(20), onPeer: console.log })


const dhtRepl = repl.start()
Object.assign(dhtRepl.context, rcK, {
  makeFinder
})
