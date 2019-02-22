# rc-kademlia 🕸️

[![Build Status](https://travis-ci.org/reconbot/rc-kademlia.svg?branch=master)](https://travis-ci.org/reconbot/rc-kademlia) [![Try rc-kademlia on RunKit](https://badge.runkitcdn.com/rc-kademlia.svg)](https://npm.runkit.com/rc-kademlia) [![install size](https://packagephobia.now.sh/badge?p=rc-kademlia)](https://packagephobia.now.sh/result?p=rc-kademlia)


This is a DHT for use on a local network. It takes bootstrap peer information or will broadcast on port 1338 asking for local peers. The local peer discovery uses udp `Datagrams` which can be relied upon to arrive as a whole message. A small binary packet is used to communicate info

## Install
```bash
npm install rc-kademlia
```

## Development
To build and run 10 nodes type
```
docker-compose up --build --scale node=10
```

## Example


## Overview


## API

- [`tk()`](#tk)


### tk
```ts
function tk<T>(size: number, iterable: AsyncIterable<T>): AsyncIterableIterator<T[]>
function tk<T>(size: number, iterable: Iterable<T>): IterableIterator<T[]>
```

TK means "to come" in editing parlance. This isn't a real function - the api is TK

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

## TODO
Tomorrow I want to get
- [x] limit local peer discovery to one node
- [x] `find_node` request and response flow
- [x] the recursive `find_node` search
- [x] actual good `find_node` results
- [x] dht bootstrapping process (does this need a real address book with actual k-buckets? Maybe)
- A better way of visualizing what's going on

Thing I probably won't do
- [ ] peer state and removal
  - responses should count as a pong
- [ ] `store` and `find_value`
- [ ] a real k-bucket address book

Things I'll probably have to do but don't want to
- test with many more peers
- visualize what's going on with many more peers

## References
- https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf
- https://www.roborooter.com/post/kademlia-study
- https://stackoverflow.com/questions/19329682/adding-new-nodes-to-kademlia-building-kademlia-routing-tables
