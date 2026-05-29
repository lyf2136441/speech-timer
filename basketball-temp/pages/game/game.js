var GameEngine = require('../../utils/game-engine')

Page({
  data: {
    p1Name: '', p1Color: '#1a6dd4',
    p2Name: '', p2Color: '#e03030',
    score0: 0, score1: 0, shotClock: 24,
    shooting: false, powerPct: 0,
    chargeZoneLo: 82, chargeZoneW: 12,
    driving: false, stealing: false, blocking: false,
    jx: 0, jy: 0, msg: '',
    ballLoose: false,
    gameOver: false, winName: '',
    st1pts: 0, st1blk: 0, st1stl: 0, st1reb: 0,
    st2pts: 0, st2blk: 0, st2stl: 0, st2reb: 0,
    gameTime: 0, gameTimeStr: '2:00', timeSelecting: false, selectedDuration: 0,
    scoringMode: 'alternate', stamina: 100,
  },

  onLoad: function(options) {
    var app = getApp()
    this._mode = (options && options.mode) || 'local'
    this._online = this._mode === 'online'
    this._ws = app.globalData.wsClient
    this._mySide = app.globalData.mySide
    this._myId = app.globalData.myId

    if (this._online) {
      var opp = app.globalData.oppPlayer || { name: '对手', teamColor: '#e03030' }
      if (this._mySide === 'home') {
        this._p1 = app.globalData.myPlayer
        this._p2 = opp
      } else {
        this._p1 = opp
        this._p2 = app.globalData.myPlayer
      }
      this._remoteState = null
      this._myIndex = this._mySide === 'home' ? 0 : 1
      this.setData({
        p1Name: this._p1.name, p1Color: this._p1.teamColor,
        p2Name: this._p2.name, p2Color: this._p2.teamColor,
      })
      this._setupWS()
    } else {
      this._p1 = app.globalData.player1
      this._p2 = app.globalData.player2
      if (!this._p1 || !this._p2) {
        wx.showToast({ title: '请先选择球员', icon: 'none' })
        setTimeout(function() { wx.navigateBack() }, 1500)
        return
      }
      this.setData({
        p1Name: this._p1.name, p1Color: this._p1.teamColor,
        p2Name: this._p2.name, p2Color: this._p2.teamColor,
        timeSelecting: true,
      })
    }
  },

  onReady: function() {
    var that = this
    wx.createSelectorQuery()
      .select('#gc')
      .fields({ node: true, size: true })
      .exec(function(res) {
        if (!res || !res[0] || !res[0].node) return
        var canvas = res[0].node
        var ctx = canvas.getContext('2d')
        var w = res[0].width
        var h = res[0].height
        var dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.scale(dpr, dpr)

        that._w = w
        that._h = h
        that._ctx = ctx
        that._canvas = canvas

        // 加载背景图片
        var bgImg = canvas.createImage()
        bgImg.onload = function() {
          that._bgImage = bgImg
          if (that._online || !that.data.timeSelecting) {
            that._startEngine()
          }
        }
        bgImg.onerror = function() {
          that._bgImage = null
          if (that._online || !that.data.timeSelecting) {
            that._startEngine()
          }
        }
        bgImg.src = '/images/guoailun.jpg'
      })
  },

  _startEngine: function() {
    var dur = this.data.selectedDuration || 120
    var gm = Math.floor(dur / 60)
    var gs = dur % 60
    this._engine = new GameEngine(this._canvas, this._ctx, this._w, this._h, { gameDuration: dur, scoringMode: this.data.scoringMode, bgImage: this._bgImage })
    this._engine.setPlayers(this._p1, this._p2)
    this.setData({ gameTime: dur, gameTimeStr: gm + ':' + (gs < 10 ? '0' : '') + gs })

    if (!this._online) {
      this._startLoop()
    } else {
      this._startOnlineRender()
    }
  },

  onSelectTime: function(e) {
    var dur = parseInt(e.currentTarget.dataset.duration) || 120
    this.setData({ timeSelecting: false, selectedDuration: dur, gameTime: dur })
    this._startEngine()
  },

  onSelectMode: function(e) {
    var mode = e.currentTarget.dataset.mode || 'alternate'
    this.setData({ scoringMode: mode })
  },

  onUnload: function() {
    if (this._timer) clearInterval(this._timer)
  },

  // ============ 本地模式 ============
  _startLoop: function() {
    var that = this
    this._last = Date.now()
    this._timer = setInterval(function() {
      if (!that._engine) return
      var dt = Date.now() - that._last
      that._last = Date.now()
      that._engine.update(dt)
      that._engine.render()
      that._syncUI()
    }, 16)
  },

  _syncUI: function() {
    var s = this._engine.getState()
    var gt = s.gameTime
    var gm = Math.floor(gt / 60)
    var gs = gt % 60
    var gameTimeStr = gm + ':' + (gs < 10 ? '0' : '') + gs
    this.setData({
      score0: s.score[0], score1: s.score[1],
      shotClock: s.shotClock,
      gameTime: s.gameTime,
      gameTimeStr: gameTimeStr,
      powerPct: Math.floor(s.shotPower * 100),
      chargeZoneLo: Math.floor(s.chargeZoneLo * 100),
      chargeZoneW: Math.floor((s.chargeZoneHi - s.chargeZoneLo) * 100),
      shooting: s.shooting,
      ballLoose: s.ballLoose,
      msg: s.messageText,
      stamina: s.stamina,
    })
    if (s.gameOver && !this._ended) {
      this._ended = true
      clearInterval(this._timer)
      this.setData({
        gameOver: true,
        winName: s.winner === 0 ? this._p1.name : this._p2.name,
        st1pts: s.stats.p1.pts, st1blk: s.stats.p1.blk, st1stl: s.stats.p1.stl, st1reb: s.stats.p1.reb,
        st2pts: s.stats.p2.pts, st2blk: s.stats.p2.blk, st2stl: s.stats.p2.stl, st2reb: s.stats.p2.reb,
      })
    }
  },

  // ============ 联机模式WS ============
  _setupWS: function() {
    var that = this
    var ws = this._ws
    if (!ws) return

    ws.on('state_sync', function(msg) {
      that._remoteState = msg.state
    })

    ws.on('shot_result', function(msg) {
      that._showMsg(
        (msg.playerIndex === that._myIndex ? that._p1.name : that._p2.name)
        + (msg.made ? ' 命中+' + msg.pts : ' 打铁')
        + ' (' + (msg.timingLabel || '') + ')'
      )
    })

    ws.on('steal_result', function(msg) {
      that._showMsg(
        (msg.playerIndex === that._myIndex ? that._p1.name : that._p2.name)
        + (msg.success ? ' 抢断成功！' : ' 抢断失败')
      )
    })

    ws.on('block_result', function(msg) {
      that._showMsg(
        (msg.playerIndex === that._myIndex ? that._p1.name : that._p2.name)
        + (msg.success ? ' 盖帽！' : ' 盖帽失败')
      )
    })

    ws.on('possession_change', function(msg) {
      that._showMsg(msg.reason || '球权交换')
    })

    ws.on('ball_loose', function() {
      that._showMsg('抢篮板！')
    })

    ws.on('opponent_shooting', function() {
      // 对手在蓄力投篮
    })

    ws.on('opponent_drive', function() {
      that._showMsg('对手突破！')
    })

    ws.on('game_over', function(msg) {
      that._ended = true
      clearInterval(that._timer)
      var winName = msg.winner ? msg.winner.name : ''
      var s = msg.stats || {}
      var p1s = that._mySide === 'home' ? (s.p1 || {}) : (s.p2 || {})
      var p2s = that._mySide === 'home' ? (s.p2 || {}) : (s.p1 || {})
      that.setData({
        gameOver: true,
        winName: winName,
        score0: msg.score ? msg.score[0] : 0,
        score1: msg.score ? msg.score[1] : 0,
        st1pts: p1s.pts || 0, st1blk: p1s.blk || 0, st1stl: p1s.stl || 0, st1reb: p1s.reb || 0,
        st2pts: p2s.pts || 0, st2blk: p2s.blk || 0, st2stl: p2s.stl || 0, st2reb: p2s.reb || 0,
      })
    })

    ws.on('opponent_disconnected', function() {
      that._showMsg('对手断开连接')
    })

    // 发送就绪信号
    setTimeout(function() {
      ws.send({ type: 'player_ready' })
    }, 500)
  },

  _startOnlineRender: function() {
    var that = this
    this._last = Date.now()
    this._lastSend = Date.now()
    this._timer = setInterval(function() {
      if (!that._engine) return
      var now = Date.now()
      var dt = now - that._last
      that._last = now

      // 只运行本地移动(让摇杆生效)
      that._engine._move(dt)

      // 每50ms发送位置到服务器(归一化到场地坐标0-1000)
      if (now - that._lastSend > 50) {
        that._lastSend = now
        var eng = that._engine
        var s = eng.s || 1
        that._sendInput({ action: 'move', x: Math.round(eng.off.x / s), y: Math.round(eng.off.y / s) })
      }

      // 使用服务器状态更新对手和球(从场地坐标转换到canvas像素)
      var st = that._remoteState
      if (st) {
        that._engine.score = st.sc || [0, 0]
        that._engine.poss = st.po || 0
        that._engine.shotClockTimer = Math.max(0, (24 - (st.cl || 24)) * 1000)
        that._engine.gameOver = st.ph === 'game_over'

        var s2 = that._engine.s || 1
        // 更新对手位置
        var opP = that._myIndex === 0 ? st.p2 : st.p1
        if (opP) {
          that._engine.def.x = opP.x * s2
          that._engine.def.y = opP.y * s2
        }
        if (st.ba) {
          that._engine.ball.x = st.ba.x * s2
          that._engine.ball.y = st.ba.y * s2
          that._engine.ballInAir = st.ba.ia
          that._engine.ball.has = st.ba.ps
          that._engine.ballLoose = !st.ba.ia && !st.ba.ps
        }
      }

      that._engine.render()
      that._syncUI()
    }, 16)
  },

  _showMsg: function(t) {
    var that = this
    this.setData({ msg: t })
    if (this._msgTimer) clearTimeout(this._msgTimer)
    this._msgTimer = setTimeout(function() {
      that.setData({ msg: '' })
    }, 2500)
  },

  // ============ 通用操作 ============
  _sendInput: function(data) {
    if (this._online && this._ws) {
      this._ws.send({ type: 'input', data: data })
    }
  },

  // === 摇杆 ===
  onJoyDown: function(e) {
    this._joyOn = true
    var that = this
    wx.createSelectorQuery()
      .select('.joy-base')
      .boundingClientRect(function(r) {
        if (!r) return
        that._jr = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, mr: r.width / 2 }
        that._doJoy(e.touches[0])
      }).exec()
  },

  onJoyMove: function(e) {
    if (!this._joyOn) return
    this._doJoy(e.touches[0])
  },

  onJoyUp: function() {
    this._joyOn = false
    this._jr = null
    this.setData({ jx: 0, jy: 0 })
    if (this._engine) this._engine.setOffMove(0, 0)
    this._sendInput({ action: 'move', x: 0, y: 0 })
  },

  _doJoy: function(t) {
    if (!this._jr) return
    var r = this._jr
    var dx = t.clientX - r.cx
    var dy = t.clientY - r.cy
    var d = Math.sqrt(dx * dx + dy * dy)
    if (d > r.mr) { dx = dx / d * r.mr; dy = dy / d * r.mr }
    var jx = dx / r.mr
    var jy = dy / r.mr
    this.setData({ jx: jx, jy: jy })
    if (this._engine) this._engine.setOffMove(jx, jy)
  },

  // === 投篮 ===
  onShootDown: function(e) {
    this.setData({ shooting: true })
    if (this._engine) this._engine.startShoot()
    this._sendInput({ action: 'shoot_start' })
  },

  onShootUp: function() {
    this.setData({ shooting: false })
    if (this._online) {
      var eng = this._engine
      var timing = eng.shotPower
      var lo = eng._chargeZoneLo, hi = eng._chargeZoneHi
      var mid = (lo + hi) / 2, hw = (hi - lo) / 2
      var label = '太差'
      if (timing >= lo && timing <= hi) {
        var dist = Math.abs(timing - mid) / hw
        label = dist < 0.3 ? '完美' : '不错'
      } else if (Math.abs(timing - mid) < 0.2) {
        label = '一般'
      }
      this._sendInput({ action: 'shoot_release', timing: timing, timingLabel: label, x: Math.round(eng.off.x / (eng.s || 1)), y: Math.round(eng.off.y / (eng.s || 1)) })
    }
    if (this._engine) this._engine.releaseShoot()
  },

  // === 突破 ===
  onDriveTap: function() {
    if (this._engine) this._engine.attemptDrive()
    this._sendInput({ action: 'drive' })
    var that = this
    this.setData({ driving: true })
    setTimeout(function() { that.setData({ driving: false }) }, 600)
  },

  // === 抢断 ===
  onStealTap: function() {
    if (this._engine) this._engine.attemptSteal()
    this._sendInput({ action: 'steal' })
    var that = this
    this.setData({ stealing: true })
    setTimeout(function() { that.setData({ stealing: false }) }, 400)
  },

  // === 捡球 ===
  onReboundTap: function() {
    if (this._engine) this._engine.attemptRebound()
    this._sendInput({ action: 'rebound' })
    var that = this
    this.setData({ ballLoose: false })
    setTimeout(function() { that.setData({ ballLoose: !!that._engine.ballLoose }) }, 200)
  },

  // === 盖帽 ===
  onBlockTap: function() {
    if (this._engine) this._engine.attemptBlock()
    this._sendInput({ action: 'block', ballY: this._engine ? this._engine.ball.y : 0 })
    var that = this
    this.setData({ blocking: true })
    setTimeout(function() { that.setData({ blocking: false }) }, 500)
  },

  // === 结果 ===
  onResult: function() {
    var app = getApp()
    app.globalData.gameResult = {
      player1: this._p1,
      player2: this._p2,
      score: this._engine ? this._engine.score : [0, 0],
      stats: this._engine ? this._engine.stats : {},
      winner: this._engine ? this._engine.winner : -1,
    }
    wx.redirectTo({ url: '/pages/result/result' })
  },

  onRematch: function() {
    if (this._timer) clearInterval(this._timer)
    this._ended = false
    if (this._online && this._ws) {
      this._ws.send({ type: 'rematch_request' })
    } else {
      this.setData({
        gameOver: false, score0: 0, score1: 0,
        shooting: false, driving: false, stealing: false, blocking: false,
        ballLoose: false,
        st1pts: 0, st1blk: 0, st1stl: 0, st1reb: 0,
        st2pts: 0, st2blk: 0, st2stl: 0, st2reb: 0,
        gameTime: this.data.selectedDuration || 120,
      })
      this._startEngine()
    }
  },
})
