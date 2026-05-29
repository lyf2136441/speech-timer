var playersData = require('../../utils/players')
var WSClient = require('../../utils/ws-client')

Page({
  data: {
    wsStatus: 'connecting', // connecting | connected | disconnected
    serverHost: '',
    status: 'idle',
    queuePos: 0,
    myName: '',
    oppName: '',
    countdown: 3,
    errMsg: '',
    teamNames: [],
    teamIndex: 0,
    playerList: [],
    selId: '',
    leaderboard: [],
  },

  _player: null,
  _allTeams: [],
  _ws: null,
  _roomId: '',
  _myId: '',
  _side: '',
  _cdTimer: null,
  _oppData: null,

  onLoad: function() {
    // 尝试获取存储的服务器地址
    var savedHost = wx.getStorageSync('server_host') || ''
    this.setData({ serverHost: savedHost })

    var teams = playersData.getTeams()
    var names = []
    for (var i = 0; i < teams.length; i++) names.push(teams[i].name)
    this._allTeams = teams
    this.setData({
      teamNames: names,
      teamIndex: 0,
      playerList: this._makeList(teams[0].id),
    })
  },

  onReady: function() {
    this._connect()
  },

  onUnload: function() {
    if (this._ws) this._ws.close()
    if (this._cdTimer) clearInterval(this._cdTimer)
  },

  _connect: function() {
    var that = this
    var host = this.data.serverHost || undefined

    if (this._ws) this._ws.close()
    this.setData({ wsStatus: 'connecting' })

    var ws = new WSClient(host)

    ws.on('connected', function() {
      that.setData({ wsStatus: 'connected' })
      ws.send({ type: 'get_leaderboard' })
    })

    ws.on('leaderboard', function(msg) {
      that.setData({ leaderboard: msg.data || [] })
    })

    ws.on('queued', function(msg) {
      that.setData({ queuePos: msg.position })
    })

    ws.on('matched', function(msg) {
      that._roomId = msg.roomId
      that._myId = msg.you.id
      that._side = msg.side
      that._oppData = msg.opponent.player
      that.setData({
        status: 'matched',
        myName: msg.you.name,
        oppName: msg.opponent.name,
        countdown: 3,
      })
      var cd = 3
      that._cdTimer = setInterval(function() {
        cd--
        if (cd >= 0) {
          that.setData({ countdown: cd })
        } else {
          clearInterval(that._cdTimer)
          that._cdTimer = null
        }
      }, 1000)
    })

    ws.on('game_start', function() {
      that._startGame()
    })

    ws.on('disconnected', function() {
      that.setData({ wsStatus: 'disconnected' })
      if (that.data.status === 'queuing' || that.data.status === 'matched') {
        that.setData({ status: 'idle', errMsg: '与服务器断开连接' })
      }
    })

    ws.on('error', function() {
      that.setData({ wsStatus: 'disconnected' })
    })

    this._ws = ws
    ws.connect()

    // 5秒超时
    setTimeout(function() {
      if (that.data.wsStatus === 'connecting') {
        that.setData({ wsStatus: 'disconnected' })
      }
    }, 5000)
  },

  _makeList: function(teamId) {
    var raw = playersData.getPlayersByTeam(teamId)
    var list = []
    for (var i = 0; i < raw.length; i++) {
      var p = raw[i]
      list.push({
        id: p.id, num: p.num, name: p.name, pos: p.pos,
        shoot: p.shooting, speed: p.speed, str: p.strength,
        def: p.defense, drib: p.dribbling, jump: p.jumping,
        full: p,
      })
    }
    return list
  },

  onTeamChange: function(e) {
    var idx = parseInt(e.detail.value)
    this.setData({ teamIndex: idx, playerList: this._makeList(this._allTeams[idx].id), selId: '' })
  },

  onCardTap: function(e) {
    var pid = e.currentTarget.dataset.pid
    this.setData({ selId: pid })
    var list = this.data.playerList
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === pid) { this._player = list[i].full; break }
    }
  },

  onSetServer: function() {
    var that = this
    wx.showModal({
      title: '设置服务器地址',
      editable: true,
      placeholderText: '例如: 192.168.1.100',
      content: this.data.serverHost || '',
      success: function(res) {
        if (res.confirm && res.content) {
          var host = res.content.trim()
          wx.setStorageSync('server_host', host)
          that.setData({ serverHost: host, wsStatus: 'connecting' })
          that._connect()
        }
      }
    })
  },

  onReconnect: function() {
    this._connect()
  },

  onStartMatch: function() {
    if (!this._player) {
      wx.showToast({ title: '请选择球员', icon: 'none' })
      return
    }
    if (!this._ws || !this._ws.isConnected()) {
      wx.showToast({ title: '未连接服务器，请设置服务器地址', icon: 'none' })
      return
    }
    var p = this._player
    this._ws.send({
      type: 'join_queue',
      name: p.name,
      player: {
        id: p.id, name: p.name, num: p.num, pos: p.pos,
        shooting: p.shooting, speed: p.speed, strength: p.strength,
        defense: p.defense, dribbling: p.dribbling, jumping: p.jumping,
        teamColor: p.teamColor, teamAbbr: p.teamAbbr,
      }
    })
    this.setData({ status: 'queuing', queuePos: 1, myName: p.name })
  },

  onCancel: function() {
    if (this._ws) this._ws.send({ type: 'leave_queue' })
    this.setData({ status: 'idle', queuePos: 0 })
  },

  _startGame: function() {
    if (this._cdTimer) { clearInterval(this._cdTimer); this._cdTimer = null }
    var app = getApp()
    app.globalData.onlineMode = true
    app.globalData.wsClient = this._ws
    app.globalData.mySide = this._side
    app.globalData.myId = this._myId
    app.globalData.roomId = this._roomId
    app.globalData.myPlayer = this._player
    app.globalData.oppPlayer = this._oppData || { name: '对手', teamColor: '#e03030' }
    wx.redirectTo({ url: '/pages/game/game?mode=online' })
  },
})
