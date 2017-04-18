/**
 * Module dependencies.
 * @private
 */

const net = require('net')

/**
 * A Samsung TV client for older TVs to simulate remote control
 */
class SamsungTVClient {
  /**
   * TVs response types.
   * @type {{granted: Buffer, denied: Buffer, await: Buffer, timeout: Buffer}}
   * @public
   */
  static get accessResponse () {
    return {
      granted: Buffer.from([0x64, 0x00, 0x01, 0x00]),           // access granted, you can now send key codes and it will be executed by TV
      denied: Buffer.from([0x64, 0x00, 0x00, 0x00]),            // access denied – user rejected your network remote controller
      await: Buffer.from([0x0A, 0x00, 0x02, 0x00, 0x00, 0x00]), // waiting for user to grant or deny access for your app
      timeout: Buffer.from([0x65, 0x00])                        // timeout or cancelled by user
    }
  }

  /**
   * Initialize a new `SamsungTVClient`.
   * @param {number} delay Default delay to send messages to TV
   * @public
   */
  constructor (delay = 0) {
    this.socket = new net.Socket()
    this.delay = delay
  }

  /**
   * Connect to TV.
   * @param {string} ip TVs IP address
   * @return {Promise<undefined|Error>} Resolve on connection, reject on invalid IP or error
   * @public
   */
  connect (ip) {
    return new Promise((resolve, reject) => {
      if (net.isIP(ip) === 0) reject(new Error('Not a valid IP'))
      this.socket.connect(55000, ip, resolve)
      this.socket.on('error', reject)
    })
  }

  /**
   * Authenticate to TV.
   * @param {string} clientIP IP address of the client
   * @param {string} clientUID UID of the client
   * @param {string} clientName Client name to display
   * @return {Promise<string|Error>} Resolve on success, reject on invalid IP, access denied or abort/timeout
   * @public
   */
  authenticate (clientIP, clientUID, clientName) {
    return new Promise((resolve, reject) => {
      if (net.isIP(clientIP) === 0) reject(new Error('Not a valid IP'))

      this.socket.write(SamsungTVClient.createMessage(SamsungTVClient.createAuthPayload(clientIP, clientUID, clientName)))

      this.socket.on('data', data => {
        const payload = SamsungTVClient.parseResponse(data)

        if (payload.compare(SamsungTVClient.accessResponse.granted) === 0) {
          resolve('Success')
        } else if (payload.compare(SamsungTVClient.accessResponse.denied) === 0) {
          reject(new Error('Access denied'))
        } else if (payload.compare(SamsungTVClient.accessResponse.timeout) === 0) {
          reject(new Error('Timeout'))
        }
      })
    })
  }

  /**
   * Send a custom message to TV
   * @param {Buffer} buffer Buffer to send
   * @return {Promise<boolean>} Resolve on send, never rejected
   * @public
   */
  send (buffer) {
    return new Promise(resolve => {
      resolve(this.socket.write(buffer))
    })
  }

  /**
   * Send a message created by createMessage to TV
   * @param {Buffer} message Message to send
   * @param {number} delay Delay to send message
   * @return {Promise<boolean>} Resolve on send, never rejected
   * @public
   */
  sendMessage (message, delay = this.delay) {
    return new Promise(resolve => {
      return this
        .send(message)
        .then(() => setTimeout(resolve, delay || this.delay))
    })
  }

  /**
   * Send a payload wrapped in TVs standard message
   * @param {Buffer} payload Payload to send
   * @param {number} delay Delay to send message
   * @return {Promise<boolean>} Resolve on send, never rejected
   * @public
   */
  sendMessageByPayload (payload, delay = this.delay) {
    return this.sendMessage(SamsungTVClient.createMessage(payload), delay)
  }

  /**
   * Create a message to send to tv with the given payload.
   * @param {Buffer} payload Payload to add to send to TV
   * @return {Buffer} Message with given payload
   * @public
   */
  static createMessage (payload) {
    const name = 'iphone.iapp.samsung'
    const nameSize = name.length
    const payloadSize = payload.length

    const buffLen = 5 + nameSize + payloadSize // 1 0x00, 4 size bytes
    const message = Buffer.alloc(buffLen)
    let offset = 1 // First is 0x00
    message.writeUInt16LE(nameSize, offset)
    offset += 2
    message.write(name, offset)
    offset += nameSize
    message.writeUInt16LE(payloadSize, offset)
    offset += 2
    message.write(payload.toString(), offset) // offset += payloadSize

    return message
  }

  /**
   * Create the payload to authenticate.
   * @param {string} ip IP address to add to payload
   * @param {string} id ID to add to payload
   * @param {string} name Name to add to payload
   * @return {Buffer} Payload
   * @throws {Error} Invalid IP
   * @public
   */
  static createAuthPayload (ip, id, name) {
    if (net.isIP(ip) === 0) throw new Error('Not a valid IP')

    const ipBase64 = SamsungTVClient.toBase64(ip)
    const ipSize = ipBase64.length
    const idBase64 = SamsungTVClient.toBase64(id)
    const idSize = idBase64.length
    const nameBase64 = SamsungTVClient.toBase64(name)
    const nameSize = nameBase64.length

    const buffLen = 8 + ipSize + idSize + nameSize // 2 static bytes, 6 size bytes
    const payload = Buffer.alloc(buffLen)
    let offset = 0
    payload.writeUInt8(0x64, offset)
    offset += 2 // Next is 0x00
    payload.writeUInt16LE(ipSize, offset)
    offset += 2
    payload.write(ipBase64, offset)
    offset += ipSize
    payload.writeUInt16LE(idSize, offset)
    offset += 2
    payload.write(idBase64, offset)
    offset += idSize
    payload.writeUInt16LE(nameSize, offset)
    offset += 2
    payload.write(nameBase64, offset) // offset += nameSize

    return payload
  }

  /**
   * Create the payload with the key.
   * @param {string} key TV key
   * @return {Buffer} Key to wrap in payload
   * @public
   */
  static createKeyPayload (key) {
    const keyBase64 = SamsungTVClient.toBase64(key)
    const keySize = keyBase64.length

    const buffLen = 5 + keySize // 3x 0x00, key size, key value
    const payload = Buffer.alloc(buffLen)
    let offset = 3 // First 3 are 0x00
    payload.writeUInt16LE(keySize, offset)
    offset += 2
    payload.write(keyBase64, offset) // offset += keySize

    return payload
  }

  /**
   * Parse TVs response.
   * @param {Buffer} response Response from TV
   * @return {Buffer} Payload
   * @public
   */
  static parseResponse (response) {
    let offset = 1 // ignore first byte
    const stringLen = response.readUInt16LE(offset)
    offset += 2 + stringLen
    const payloadSize = response.readUInt16LE(offset)
    offset += 2
    return response.slice(offset, payloadSize + offset)
    // // Detailed way
    // let offset = 0;
    // const firstByte = response.readUInt8(offset); offset += 1
    // const stringLen = response.readUInt16LE(offset); offset += 2
    // const string = response.toString('utf8', offset, stringLen + offset); offset += stringLen
    // const payloadSize = response.readUInt16LE(offset); offset += 2
    // return response.slice(offset, payloadSize + offset); // offset += payloadSize
  }

  /**
   * Converts a string to base64.
   * @param {string} string String to convert
   * @return {string} String in base64
   * @private
   */
  static toBase64 (string) {
    return Buffer.from(string).toString('base64')
  }
}

/**
 * Module exports.
 * @public
 */

module.exports = SamsungTVClient
