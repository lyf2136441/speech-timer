// ============================================
//  CBA篮球1v1 联机对战服务器 v3
//  运行: node server.js
//  端口: 3456
// ============================================

var WebSocket = require('ws')
var http = require('http')
var fs = require('fs')
var path = require('path')
var PORT = process.env.PORT || 3456
var TICK_RATE = 50
var WIN_SCORE = 11
var SHOT_CLOCK_MS = 24000
var COURT_W = 750, COURT_H = 500
var RIM_X = 375, RIM_Y = 60
var THREE_R = 280

var rooms = {}
var queue = []
var playerRoom = {}
var playerData = {}
var leaderboard = []
var roomCounter = 0
var playerCounter = 0

function log(m) { console.log('[' + new Date().toLocaleTimeString() + '] ' + m) }
function send(ws, data) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)) }

// ========== MIME types ==========
var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
}

// ========== HTTP Server ==========
var server = http.createServer(function(req, res) {
  var url = req.url.split('?')[0]

  // API
  if (url === '/api/leaderboard') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    return res.end(JSON.stringify(leaderboard.slice(0, 20)))
  }
  if (url === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    return res.end(JSON.stringify({
      rooms: Object.keys(rooms).length, queue: queue.length,
      players: Object.keys(playerData).length, leaderboard: leaderboard.slice(0, 5)
    }))
  }

  // Static files
  var filePath
  if (url === '/' || url === '/play') {
    filePath = path.join(__dirname, '..', 'index.html')
  } else if (url === '/cba-online.html') {
    filePath = path.join(__dirname, '..', 'cba-online.html')
  } else if (url === '/cba-game.html') {
    filePath = path.join(__dirname, '..', 'cba-game.html')
  } else if (url === '/index.html') {
    filePath = path.join(__dirname, '..', 'index.html')
  } else if (url.indexOf('/images/') === 0) {
    filePath = path.join(__dirname, '..', url)
  } else {
    res.writeHead(404); return res.end('Not Found')
  }

  var ext = path.extname(filePath).toLowerCase()
  var mime = MIME[ext] || 'application/octet-stream'

  fs.readFile(filePath, function(err, data) {
    if (err) { res.writeHead(404); return res.end('Not Found') }
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' })
    res.end(data)
  })
})

// ========== Game State ==========
function newGameState() {
  return {
    phase: 'jumpball',  // jumpball | playing | freethrow | gameover
    jumpCD: 3, jumpCDTimer: 0, jumpTossed: false,
    score: [0, 0], poss: 0,
    shotClock: 24, shotClockStart: Date.now(),
    p1: { x: 350, y: 250, energy: 100 },
    p2: { x: 400, y: 250, energy: 100 },
    ball: { x: 375, y: 250, vx: 0, vy: 0, inAir: false, possessed: false, possessor: -1 },
    shooting: false, shotPower: 0, shotReleased: false, _powAnim: 0,
    needClearThree: false, clearThreeDone: false,
    ftCount: 0, ftMade: 0, ftShooter: -1,
    foulCooldown: [0, 0],
    scoredAnim: 0, scoredPts: 0,
    stats: { p1: { pts: 0, blk: 0, stl: 0, reb: 0 }, p2: { pts: 0, blk: 0, stl: 0, reb: 0 } },
    eventLog: [],
    lastInput: [{ mx: 0, my: 0 }, { mx: 0, my: 0 }],
  }
}

function createRoom(p1, p2) {
  roomCounter++
  var room = {
    id: 'r' + roomCounter,
    players: [
      { id: p1.id, name: p1.name, data: p1.data, ws: p1.ws, ready: false },
      { id: p2.id, name: p2.name, data: p2.data, ws: p2.ws, ready: false }
    ],
    state: newGameState(),
    createdAt: Date.now(),
  }
  rooms[room.id] = room
  playerRoom[p1.id] = room.id
  playerRoom[p2.id] = room.id
  log('Room ' + room.id + ': ' + p1.name + ' VS ' + p2.name)

  send(p1.ws, { type: 'matched', roomId: room.id, side: 0,
    you: { name: p1.name, id: p1.id },
    opponent: { name: p2.name, id: p2.id, player: p2.data } })
  send(p2.ws, { type: 'matched', roomId: room.id, side: 1,
    you: { name: p2.name, id: p2.id },
    opponent: { name: p1.name, id: p1.id, player: p1.data } })

  startLoop(room)
  return room
}

// ========== Game Loop ==========
function startLoop(room) {
  var cd = 3
  room.state.jumpCD = cd
  broadcast(room, { type: 'jump_countdown', count: cd })

  room._cdInterval = setInterval(function() {
    if (!rooms[room.id]) { clearInterval(room._cdInterval); return }
    cd--
    room.state.jumpCD = cd
    broadcast(room, { type: 'jump_countdown', count: cd })
    if (cd <= 0) {
      clearInterval(room._cdInterval)
      room.state.phase = 'playing'
      room.state.jumpTossed = true
      room.state.ball.inAir = true
      room.state.ball.vy = -5
      room.state.ball.vx = (Math.random() - 0.5) * 2
      broadcast(room, { type: 'game_start' })
      room._ticker = setInterval(function() { gameTick(room) }, TICK_RATE)
    }
  }, 700)
}

function gameTick(room) {
  var s = room.state
  if (s.phase === 'gameover') return

  var dt = TICK_RATE

  // Foul cooldowns
  if (s.foulCooldown[0] > 0) s.foulCooldown[0] = Math.max(0, s.foulCooldown[0] - dt)
  if (s.foulCooldown[1] > 0) s.foulCooldown[1] = Math.max(0, s.foulCooldown[1] - dt)

  // Scored animation
  if (s.scoredAnim > 0) {
    s.scoredAnim -= dt
    if (s.scoredAnim <= 0 && s.phase === 'scored') {
      switchPossession(room, '')
    }
  }

  // Shot clock
  if (s.phase === 'playing' && s.ball.possessed) {
    s.shotClock = Math.max(0, Math.ceil((SHOT_CLOCK_MS - (Date.now() - s.shotClockStart)) / 1000))
    if (s.shotClock <= 0) {
      switchPossession(room, '进攻超时！')
    }
  }

  // Shooting power animation (server-side)
  if (s.shooting && !s.shotReleased) {
    s._powAnim += 0.06
    s.shotPower = Math.abs(Math.sin(s._powAnim))
  }

  // Move players
  movePlayer(room, 0)
  movePlayer(room, 1)

  // Ball physics
  if (s.ball.inAir) {
    s.ball.vy += 0.3 * (dt / 16)
    s.ball.x += s.ball.vx * (dt / 16)
    s.ball.y += s.ball.vy * (dt / 16)

    // Rim collision
    var dx = s.ball.x - RIM_X, dy = s.ball.y - RIM_Y
    var dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 20 && s.ball.vy > 0 && Math.abs(dx) < 18) {
      // Went through rim!
      if (s._pendingShot && s._pendingShot.made) {
        onScore(room)
      } else {
        onMiss(room)
      }
    } else if (dist < 22 && s.ball.inAir) {
      // Bounce off rim
      var nx = dx / dist, ny = dy / dist
      var dot = s.ball.vx * nx + s.ball.vy * ny
      s.ball.vx -= 1.6 * dot * nx; s.ball.vy -= 1.6 * dot * ny
      s.ball.vx *= 0.5; s.ball.vy *= 0.5
      s.ball.x += nx * (22 - dist + 1)
      s.ball.y += ny * (22 - dist + 1)
    }

    // Floor bounce
    if (s.ball.y > 440 && s.ball.vy > 0) {
      s.ball.y = 440
      s.ball.vy = -Math.abs(s.ball.vy) * 0.5
      s.ball.vx *= 0.7
      if (Math.abs(s.ball.vy) < 1) {
        // Ball settles - determine possession
        s.ball.inAir = false
        s.ball.possessed = true
        var d0 = Math.abs(s.p1.x - s.ball.x) + Math.abs(s.p1.y - s.ball.y)
        var d1 = Math.abs(s.p2.x - s.ball.x) + Math.abs(s.p2.y - s.ball.y)
        var prevPoss = s.poss
        s.poss = d0 < d1 ? 0 : 1
        s.ball.possessor = s.poss
        s.shotClockStart = Date.now()
        s._pendingShot = null

        if (s.poss !== prevPoss) {
          s.needClearThree = true; s.clearThreeDone = false
          s.stats[s.poss === 0 ? 'p1' : 'p2'].reb++
          addEvent(room, room.players[s.poss].name + ' 抢到篮板！需出三分线')
        } else {
          s.stats[s.poss === 0 ? 'p1' : 'p2'].reb++
          s.shotClockStart = Date.now() - (SHOT_CLOCK_MS - 17000)
          addEvent(room, room.players[s.poss].name + ' 进攻篮板！')
        }
      }
    }
  }

  // Follow ball when possessed
  if (s.ball.possessed) {
    var po = s.poss === 0 ? s.p1 : s.p2
    s.ball.x = po.x; s.ball.y = po.y - 35
  }

  // Check 3pt line clearance
  if (s.needClearThree && !s.clearThreeDone) {
    var po = s.poss === 0 ? s.p1 : s.p2
    var tdx = po.x - RIM_X, tdy = po.y - RIM_Y
    if (Math.sqrt(tdx * tdx + tdy * tdy) > THREE_R) {
      s.clearThreeDone = true; s.needClearThree = false
      addEvent(room, '已出三分线！')
    }
  }

  // Check win
  var diff = Math.abs(s.score[0] - s.score[1])
  if (s.score[0] >= WIN_SCORE && diff >= 2) endGame(room, 0)
  else if (s.score[1] >= WIN_SCORE && diff >= 2) endGame(room, 1)

  // Sync
  broadcast(room, { type: 'state_sync', state: compressState(s) })
}

function movePlayer(room, idx) {
  var s = room.state, inp = s.lastInput[idx]
  var p = idx === 0 ? s.p1 : s.p2
  if (!inp || (inp.mx === 0 && inp.my === 0)) return
  var speed = 2.8
  var m = Math.sqrt(inp.mx * inp.mx + inp.my * inp.my)
  if (m > 0) {
    p.x += inp.mx / m * speed * (TICK_RATE / 16)
    p.y += inp.my / m * speed * (TICK_RATE / 16)
  }
  p.x = Math.max(25, Math.min(725, p.x))
  p.y = Math.max(70, Math.min(460, p.y))
}

function handleShootRelease(room, idx) {
  var s = room.state
  if (s.phase === 'freethrow') {
    handleFreeThrow(room, idx)
    return
  }
  if (s.phase !== 'playing' || !s.ball.possessed || s.poss !== idx) return
  if (s.needClearThree && !s.clearThreeDone) {
    addEvent(room, '需先出三分线！')
    return
  }

  var p = s.poss === 0 ? s.p1 : s.p2
  var offData = room.players[idx].data
  var defData = room.players[1 - idx].data
  var timing = s.shotPower
  var timingPct = timing >= 0.45 && timing <= 0.55 ? 95 : timing >= 0.35 && timing <= 0.65 ? 70 : timing >= 0.2 && timing <= 0.8 ? 40 : 15
  var label = timing >= 0.45 && timing <= 0.55 ? '完美' : timing >= 0.35 && timing <= 0.65 ? '不错' : timing >= 0.2 && timing <= 0.8 ? '一般' : '太差'
  var offShoot = offData ? (offData.shooting || 50) : 50
  var defDef = defData ? (defData.defense || 50) : 50

  // Defender proximity
  var dp = idx === 0 ? s.p2 : s.p1
  var ddx = p.x - dp.x, ddy = p.y - dp.y, dd = Math.sqrt(ddx * ddx + ddy * ddy)
  var contest = dd < 55 ? (1 - dd / 55) * 28 + defDef / 99 * 8 : 0

  var mp = timingPct + offShoot / 99 * 18 - contest
  mp = Math.max(5, Math.min(98, mp))
  var made = Math.random() * 100 < mp
  var is3 = p.y > 350
  var pts = is3 ? 3 : 2

  s.ball.possessed = false
  s.ball.inAir = true
  s.ball.vx = (RIM_X - p.x) / 28
  s.ball.vy = (RIM_Y - p.y) / 28 - 0.15 * 28
  s._pendingShot = { made: made, pts: pts, label: label, playerIdx: idx }

  s.stats[idx === 0 ? 'p1' : 'p2'].fga = (s.stats[idx === 0 ? 'p1' : 'p2'].fga || 0) + 1
  s.shooting = false; s.shotReleased = false; s.shotPower = 0

  broadcast(room, { type: 'shot_fired', playerIdx: idx, ball: s.ball })
}

function handleFreeThrow(room, idx) {
  var s = room.state
  if (s.ftShooter !== idx) return

  var offData = room.players[idx].data
  var timing = s.shotPower
  var timingPct = timing >= 0.45 && timing <= 0.55 ? 92 : timing >= 0.35 && timing <= 0.65 ? 72 : timing >= 0.2 && timing <= 0.8 ? 45 : 18
  var label = timing >= 0.45 && timing <= 0.55 ? '完美' : timing >= 0.35 && timing <= 0.65 ? '不错' : timing >= 0.2 && timing <= 0.8 ? '一般' : '太差'
  var offShoot = offData ? (offData.shooting || 50) : 50
  var mp = timingPct + offShoot / 99 * 12
  mp = Math.max(10, Math.min(98, mp))
  var made = Math.random() * 100 < mp

  s.ball.possessed = false
  s.ball.inAir = true
  s.ball.vx = (RIM_X - s.ball.x) / 22
  s.ball.vy = (RIM_Y - s.ball.y) / 22 - 0.15 * 22
  s._pendingShot = { made: made, pts: 1, label: label, playerIdx: idx, isFT: true }

  s.shooting = false; s.shotReleased = false; s.shotPower = 0
  broadcast(room, { type: 'shot_fired', playerIdx: idx, ball: s.ball })
}

function onScore(room) {
  var s = room.state
  var shot = s._pendingShot
  if (!shot) return
  s.ball.inAir = false
  s.ball.x = RIM_X; s.ball.y = 100

  if (shot.isFT) {
    s.score[shot.playerIdx]++
    s.stats[shot.playerIdx === 0 ? 'p1' : 'p2'].pts++
    s.ftMade++
    s.scoredAnim = 1200; s.scoredPts = 1
    addEvent(room, room.players[shot.playerIdx].name + ' 罚球命中！(' + s.ftMade + '/2)')
    broadcast(room, { type: 'score_update', score: s.score, stats: s.stats, pts: 1, label: shot.label })

    setTimeout(function() {
      if (!rooms[room.id]) return
      if (s.ftMade >= 2) {
        s.phase = 'playing'
        s.ftCount = 0; s.ftShooter = -1
        switchPossession(room, '罚球结束')
      } else {
        resetFreeThrow(room)
      }
    }, 1500)
  } else {
    s.score[shot.playerIdx] += shot.pts
    s.stats[shot.playerIdx === 0 ? 'p1' : 'p2'].pts += shot.pts
    s.scoredAnim = 1500; s.scoredPts = shot.pts
    addEvent(room, room.players[shot.playerIdx].name + ' ' + shot.label + '！+' + shot.pts + '分')
    broadcast(room, { type: 'score_update', score: s.score, stats: s.stats, pts: shot.pts, label: shot.label })
    s.phase = 'scored'

    setTimeout(function() {
      if (!rooms[room.id]) return
      s.poss = 1 - shot.playerIdx
      resetAfterScore(room)
      s.phase = 'playing'
    }, 1800)
  }
  s._pendingShot = null
}

function onMiss(room) {
  var s = room.state
  var shot = s._pendingShot
  s._pendingShot = null
  s.ball.inAir = true
  s.ball.vx = (Math.random() - 0.5) * 4
  s.ball.vy = 1 + Math.random() * 3
  addEvent(room, shot && shot.isFT ? '罚球不中！' : '投篮不中！')

  if (shot && shot.isFT) {
    s.ftCount--
    broadcast(room, { type: 'score_update', score: s.score, stats: s.stats, pts: 0, label: '打铁' })
    setTimeout(function() {
      if (!rooms[room.id]) return
      if (s.ftCount <= 0) {
        s.phase = 'playing'
        s.ftCount = 0; s.ftShooter = -1
        switchPossession(room, '罚球结束')
      } else {
        resetFreeThrow(room)
      }
    }, 1000)
  }
}

function resetAfterScore(room) {
  var s = room.state
  s.ball = { x: 375, y: 370, vx: 0, vy: 0, inAir: false, possessed: true, possessor: s.poss }
  s.p1 = { x: s.poss === 0 ? 375 : 375, y: s.poss === 0 ? 380 : 120, energy: Math.min(100, s.p1.energy + 30) }
  s.p2 = { x: s.poss === 1 ? 375 : 375, y: s.poss === 1 ? 380 : 120, energy: Math.min(100, s.p2.energy + 30) }
  s.shotClockStart = Date.now()
  s.needClearThree = false; s.clearThreeDone = false
  s.shooting = false; s.shotPower = 0; s.shotReleased = false
}

function resetFreeThrow(room) {
  var s = room.state
  var shooter = s.ftShooter
  s.ball = { x: 375, y: 225, vx: 0, vy: 0, inAir: false, possessed: true, possessor: shooter }
  if (shooter === 0) {
    s.p1.x = 375; s.p1.y = 250; s.p2.x = 375; s.p2.y = 100
  } else {
    s.p2.x = 375; s.p2.y = 250; s.p1.x = 375; s.p1.y = 100
  }
  s.shooting = false; s.shotPower = 0; s.shotReleased = false
}

function switchPossession(room, reason) {
  var s = room.state
  s.poss = 1 - s.poss
  s.ball = { x: 375, y: 370, vx: 0, vy: 0, inAir: false, possessed: true, possessor: s.poss }
  s.p1 = { x: s.poss === 0 ? 375 : 375, y: s.poss === 0 ? 380 : 120, energy: Math.min(100, s.p1.energy + 25) }
  s.p2 = { x: s.poss === 1 ? 375 : 375, y: s.poss === 1 ? 380 : 120, energy: Math.min(100, s.p2.energy + 25) }
  s.shotClockStart = Date.now()
  s.needClearThree = false; s.clearThreeDone = false
  s.shooting = false; s.shotPower = 0; s.shotReleased = false
  s._pendingShot = null
  s.phase = 'playing'

  if (reason) addEvent(room, reason)
  broadcast(room, { type: 'possession_change', poss: s.poss, score: s.score, stats: s.stats, reason: reason })
}

function endGame(room, winnerIdx) {
  var s = room.state
  s.phase = 'gameover'
  clearInterval(room._ticker)
  clearInterval(room._cdInterval)
  var winner = room.players[winnerIdx], loser = room.players[1 - winnerIdx]
  updateLeaderboard(winner, loser, s, winnerIdx)
  addEvent(room, winner.name + ' 获胜！')
  broadcast(room, {
    type: 'game_over',
    winner: { name: winner.name, id: winner.id, idx: winnerIdx },
    score: s.score, stats: s.stats,
    leaderboard: leaderboard.slice(0, 10),
  })
}

function addEvent(room, text) {
  room.state.eventLog.push({ time: Date.now(), text: text })
  if (room.state.eventLog.length > 50) room.state.eventLog.shift()
}

function updateLeaderboard(winner, loser, state, wIdx) {
  var wStats = wIdx === 0 ? state.stats.p1 : state.stats.p2
  var lStats = wIdx === 0 ? state.stats.p2 : state.stats.p1
  addLB(winner.name, 3, wStats.pts)
  addLB(loser.name, 1, lStats.pts)
  leaderboard.sort(function(a, b) { return b.score - a.score })
  leaderboard = leaderboard.slice(0, 50)
}

function addLB(name, pts, gamePts) {
  for (var i = 0; i < leaderboard.length; i++) {
    if (leaderboard[i].name === name) {
      leaderboard[i].score += pts
      leaderboard[i].games++
      leaderboard[i].totalPts += gamePts
      return
    }
  }
  leaderboard.push({ name: name, score: pts, games: 1, totalPts: gamePts })
}

function compressState(s) {
  return {
    ph: s.phase, sc: s.score, po: s.poss, cl: s.shotClock,
    jcd: s.jumpCD, nct: s.needClearThree, ctd: s.clearThreeDone,
    ftc: s.ftCount, ftm: s.ftMade, fts: s.ftShooter,
    fcd: s.foulCooldown, san: s.scoredAnim, spt: s.scoredPts,
    sp: s.shotPower, sh: s.shooting,
    p1: { x: Math.round(s.p1.x), y: Math.round(s.p1.y), e: Math.round(s.p1.energy) },
    p2: { x: Math.round(s.p2.x), y: Math.round(s.p2.y), e: Math.round(s.p2.energy) },
    ba: { x: Math.round(s.ball.x), y: Math.round(s.ball.y), ia: s.ball.inAir, ps: s.ball.possessed, pr: s.ball.possessor },
    ev: s.eventLog.slice(-5).map(function(e) { return e.text }),
  }
}

function broadcast(room, data) {
  for (var i = 0; i < room.players.length; i++) {
    send(room.players[i].ws, data)
  }
}

function broadcastOthers(room, fromId, data) {
  for (var i = 0; i < room.players.length; i++) {
    if (room.players[i].id !== fromId) send(room.players[i].ws, data)
  }
}

// ========== Matchmaking ==========
function tryMatch() {
  if (queue.length < 2) return
  var p1 = queue.shift(), p2 = queue.shift()
  createRoom(p1, p2)
}

// ========== WebSocket ==========
var wss = new WebSocket.Server({ server: server, maxPayload: 8192 })

wss.on('connection', function(ws, req) {
  playerCounter++
  var pid = 'p' + playerCounter
  ws._pid = pid

  send(ws, { type: 'connected', playerId: pid })

  ws.on('message', function(raw) {
    var msg
    try { msg = JSON.parse(raw.toString()) } catch(e) { return }

    switch (msg.type) {
      case 'join_queue':
        ws._name = msg.name || ('Player' + playerCounter)
        ws._playerData = msg.player
        playerData[pid] = { name: ws._name, ws: ws }
        queue.push({ id: pid, name: ws._name, data: msg.player, ws: ws })
        log(ws._name + ' join queue (' + queue.length + ')')
        send(ws, { type: 'queued', position: queue.length })
        tryMatch()
        break

      case 'leave_queue':
        queue = queue.filter(function(p) { return p.id !== pid })
        send(ws, { type: 'queue_left' })
        break

      case 'get_leaderboard':
        send(ws, { type: 'leaderboard', data: leaderboard.slice(0, 20) })
        break

      case 'input':
        var rid = playerRoom[pid]
        if (!rid || !rooms[rid]) return
        var r = rooms[rid]
        var idx = r.players[0].id === pid ? 0 : 1
        var inp = msg.data

        if (inp.action === 'move') {
          r.state.lastInput[idx] = { mx: inp.mx, my: inp.my }
        } else if (inp.action === 'shoot_start') {
          if (r.state.phase === 'playing' || r.state.phase === 'freethrow') {
            r.state.shooting = true; r.state.shotPower = 0; r.state.shotReleased = false; r.state._powAnim = 0
          }
        } else if (inp.action === 'shoot_release') {
          r.state.shotReleased = true; r.state.shooting = false
          handleShootRelease(r, idx)
        } else if (inp.action === 'drive') {
          handleDrive(r, idx)
        } else if (inp.action === 'steal') {
          handleSteal(r, idx)
        } else if (inp.action === 'block') {
          handleBlock(r, idx)
        } else if (inp.action === 'foul') {
          handleFoul(r, idx)
        }

        broadcastOthers(r, pid, { type: 'opponent_action', playerIdx: idx, action: inp.action })
        break

      case 'rematch_request':
        var rid2 = playerRoom[pid]
        if (!rid2 || !rooms[rid2]) return
        var r2 = rooms[rid2]
        var idx2 = r2.players[0].id === pid ? 0 : 1
        r2._rematch = r2._rematch || [false, false]
        r2._rematch[idx2] = true
        broadcast(r2, { type: 'rematch_vote', playerIndex: idx2 })
        if (r2._rematch[0] && r2._rematch[1]) {
          r2.state = newGameState()
          r2._rematch = [false, false]
          broadcast(r2, { type: 'rematch_start' })
          startLoop(r2)
        }
        break

      case 'ping':
        send(ws, { type: 'pong', serverTime: Date.now() })
        break
    }
  })

  ws.on('close', function() {
    log('Disconnect: ' + (ws._name || pid))
    queue = queue.filter(function(p) { return p.id !== pid })
    var rid = playerRoom[pid]
    if (rid && rooms[rid]) {
      var r = rooms[rid]
      clearInterval(r._ticker)
      clearInterval(r._cdInterval)
      broadcastOthers(r, pid, { type: 'opponent_disconnected' })
      r.players.forEach(function(p) { delete playerRoom[p.id] })
      delete rooms[rid]
    }
    delete playerData[pid]
  })

  ws.on('error', function() {})
})

// Action handlers
function handleDrive(room, idx) {
  var s = room.state
  if (s.phase !== 'playing' || !s.ball.possessed || s.poss !== idx) return
  if (s.needClearThree && !s.clearThreeDone) { addEvent(room, '需先出三分线！'); return }
  var p = idx === 0 ? s.p1 : s.p2
  p.energy = Math.max(0, p.energy - 30)
  addEvent(room, room.players[idx].name + ' 突破！')
}

function handleSteal(room, idx) {
  var s = room.state
  if (s.phase !== 'playing' || !s.ball.possessed || s.poss === idx) return
  var stealer = room.players[idx], dribbler = room.players[1 - idx]
  var defD = stealer.data ? stealer.data.defense : 50
  var offDr = dribbler.data ? dribbler.data.dribbling : 50
  var dp = idx === 0 ? s.p1 : s.p2, op = idx === 0 ? s.p2 : s.p1
  var dx = dp.x - op.x, dy = dp.y - op.y, dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 55) {
    var success = Math.random() < 0.25 + defD / 99 * 0.3 - offDr / 99 * 0.2
    if (success) {
      s.stats[idx === 0 ? 'p1' : 'p2'].stl++
      addEvent(room, stealer.name + ' 抢断成功！')
      switchPossession(room, '抢断成功！')
    } else {
      addEvent(room, stealer.name + ' 抢断失败')
    }
  } else {
    addEvent(room, '距离太远！')
  }
}

function handleBlock(room, idx) {
  var s = room.state
  if (s.phase !== 'playing' || !s.ball.inAir || !s._pendingShot) return
  var blocker = room.players[idx]
  var defD = blocker.data ? blocker.data.defense : 50
  var defJp = blocker.data ? blocker.data.jumping : 50
  var dp = idx === 0 ? s.p1 : s.p2
  var bdx = dp.x - s.ball.x, bdy = dp.y - s.ball.y, bd = Math.sqrt(bdx * bdx + bdy * bdy)
  if (bd < 65 && s.ball.vy < 0) {
    var success = Math.random() < 0.12 + defD / 99 * 0.2 + defJp / 99 * 0.18
    if (success) {
      s.stats[idx === 0 ? 'p1' : 'p2'].blk++
      s._pendingShot = null
      s.ball.vy = Math.abs(s.ball.vy) * 1.5
      s.ball.vx = (Math.random() - 0.5) * 8
      addEvent(room, blocker.name + ' 盖帽！')
      broadcast(room, { type: 'block_result', playerIdx: idx, success: true, stats: s.stats })
    } else {
      broadcast(room, { type: 'block_result', playerIdx: idx, success: false })
    }
  }
}

function handleFoul(room, idx) {
  var s = room.state
  if (s.phase !== 'playing' || !s.ball.possessed || s.foulCooldown[idx] > 0) return
  var p = idx === 0 ? s.p1 : s.p2
  if (p.energy < 15) { addEvent(room, '体力不足！'); return }
  s.foulCooldown[idx] = 5000
  p.energy = Math.max(0, p.energy - 15)
  s.phase = 'freethrow'
  s.ftShooter = 1 - idx  // opponent shoots
  s.ftCount = 2; s.ftMade = 0
  resetFreeThrow(room)
  addEvent(room, room.players[idx].name + ' 犯规！' + room.players[1 - idx].name + ' 罚球2次')
  broadcast(room, { type: 'foul_called', fouler: idx, shooter: 1 - idx, stats: s.stats })
}

server.listen(PORT, function() {
  log('')
  log('  ==================================')
  log('   CBA篮球1v1 联机服务器 v3')
  log('   游戏地址: http://localhost:' + PORT)
  log('   WebSocket: ws://localhost:' + PORT)
  log('   排行榜:   http://localhost:' + PORT + '/api/leaderboard')
  log('  ==================================')
  log('')
})
