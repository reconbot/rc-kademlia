# rc-kademlia 🕸️

[![Build Status](https://travis-ci.org/reconbot/rc-kademlia.svg?branch=master)](https://travis-ci.org/reconbot/rc-kademlia) [![Try rc-kademlia on RunKit](https://badge.runkitcdn.com/rc-kademlia.svg)](https://npm.runkit.com/rc-kademlia) [![install size](https://packagephobia.now.sh/badge?p=rc-kademlia)](https://packagephobia.now.sh/result?p=rc-kademlia)


This is a DHT for use on a local network. It takes bootstrap peer information or will broadcast on port 1338 asking for local peers. The local peer discovery uses udp `Datagrams` which can be relied upon to arrive as a whole message. A small binary packet is used to communicate info

## Install
```bash
npm install rc-kademlia
```

## Development
To build and run 5 servers type
```
docker-compose up --build
```

## Example


## Overview


## API

- [`batch()`](#batch)


### batch
```ts
function batch<T>(size: number, iterable: AsyncIterable<T>): AsyncIterableIterator<T[]>
function batch<T>(size: number, iterable: Iterable<T>): IterableIterator<T[]>
```

Batch objects from `iterable` into arrays of `size` length. The final array may be shorter than size if there is not enough items. Returns a sync iterator if the `iterable` is sync, otherwise an async iterator. Errors from the source `iterable` are immediately raised.

`size` can be betweeen 1 and `Infinity`.

```ts
import { batch } from 'rc-kademlia'
import { getPokemon } from 'iterable-pokedex'

// batch 10 pokemon while we process them
for await (const pokemons of batch(10, getPokemon())) {
  console.log(pokemons) // 10 pokemon at a time!
}
```

## Contributors wanted!

Writing docs and code is a lot of work! Thank you in advance for helping out.
