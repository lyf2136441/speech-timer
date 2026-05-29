// WebSocket联机客户端
var DEFAULT_HOST = '10.32.17.144'  // 你电脑的局域网IP
var DEFAULT_PORT = '3456'

function WSClient(host, port) {
  this._ws = null
  this._connected = false
  this._handlers = {}
  this._pingTimer = null
  this._reconnectTimer = null
  this._queue = []
  this._url = (host || DEFAULT_HOST)
  if (this._url.indexOf('://') === -1) this._url = 'ws://' + this._url
  if (port && this._url.indexOf(':', 6) === -1) this._url += ':' + port
  else if (this._url.indexOf(':', 6) === -1) this._url += ':' + DEFAULT_PORT
}

WSClient.prototype.on = function(event, fn) {
  if (!this._handlers[event]) this._handlers[event] = []
  this._handlers[event].push(fn)
}

WSClient.prototype._emit = function(event, data) {
  var hs = this._handlers[event]
  if (hs) for (var i = 0; i < hs.length; i++) hs[i](data)
}

WSClient.prototype.connect = function() {
  var that = this
  console.log('WebSocket connecting to: ' + this._url)
  this._ws = wx.connectSocket({ url: this._url })

  this._ws.onOpen(function() {
    that._connected = true
    console.log('WebSocket connected')
    that._emit('connected')
    that._startPing()
    while (that._queue.length > 0) that._sendRaw(that._queue.shift())
  })

  this._ws.onMessage(function(res) {
    var msg
    try { msg = JSON.parse(res.data) } catch(e) { return }
    that._emit('message', msg)
    that._emit(msg.type, msg)
  })

  this._ws.onClose(function(res) {
    that._connected = false
    that._stopPing()
    console.log('WebSocket closed:', res)
    that._emit('disconnected', res)
  })

  this._ws.onError(function(err) {
    console.error('WebSocket error:', err)
    that._emit('error', err)
  })
}

WSClient.prototype.send = function(data) {
  if (this._connected && this._ws) {
    this._sendRaw(data)
  } else {
    this._queue.push(data)
  }
}

WSClient.prototype._sendRaw = function(data) {
  this._ws.send({ data: JSON.stringify(data) })
}

WSClient.prototype._startPing = function() {
  var that = this
  this._pingTimer = setInterval(function() {
    that.send({ type: 'ping' })
  }, 25000)
}

WSClient.prototype._stopPing = function() {
  if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null }
}

WSClient.prototype.close = function() {
  this._stopPing()
  if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null }
  if (this._ws) {
    try { this._ws.close() } catch(e) {}
    this._ws = null
  }
  this._connected = false
}

WSClient.prototype.isConnected = function() { return this._connected }
WSClient.prototype.getUrl = function() { return this._url }

module.exports = WSClient
