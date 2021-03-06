# Samsung TV remote interface

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](http://standardjs.com)

[![dependencies Status][dependencies-image]][dependencies-url]
[![devDependencies Status][devDependencies-image]][devDependencies-url]

This module can communicate with old Samsung TVs over the network.

## Installation

```bash
npm install --save samsung-tv-remote-interface
```

Optional (keys to send to the TV):

```bash
npm install --save samsung-tv-remote-interface-keys
```

## Quickstart

Build a new client:

```js
const SamsungTVClient = require('samsung-tv-remote-interface')
const client = new SamsungTVClient()
```

Import keys (if installed):

```js
const keys = require('samsung-tv-remote-interface-keys')
```

Use client:

```js
client
  // connect to TV
  .connect('TVs IP address')
  // authenticate
  .then(() => client.authenticate('Your IP', 'Your UUID', 'Your Controller name'))
  // volume down
  .then(() => client.sendMessageByKey(keys.KEY_VOLDOWN))
  // volume up
  .then(() => client.sendMessageByKey(keys.KEY_VOLUP))
```

Catch errors:

```js
client
  .catch(error => {
    // do something with error
  })
```

## Special thanks

To the guy who made [this][special-thanks-url] website.

[dependencies-image]: https://david-dm.org/piu130/samsung-tv-remote-interface/status.svg
[dependencies-url]: https://david-dm.org/Piu130/samsung-tv-remote-interface
[devDependencies-image]: https://david-dm.org/piu130/samsung-tv-remote-interface/dev-status.svg
[devDependencies-url]: https://david-dm.org/piu130/samsung-tv-remote-interface?type=dev
[special-thanks-url]: http://sc0ty.pl/2012/02/samsung-tv-network-remote-control-protocol/
