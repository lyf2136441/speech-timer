// ============================================
//  CBA篮球1v1 联机对战服务器 v2
//  运行: npm install && npm start
//  端口: 3456
// ============================================

var WebSocket = require('ws')
var http = require('http')
var PORT = process.env.PORT || 3456
var TICK_RATE = 50 // ms between state syncs (20fps)
var WIN_SCORE = 11
var SHOT_CLOCK_MS = 24000

// ========== 数据存储 ==========
var rooms = {}
var queue = []
var playerRoom = {}   // playerId → roomId
var playerData = {}   // playerId → { name, ws, stats }
var leaderboard = []  // 排行榜
var roomCounter = 0
var playerCounter = 0

function log(m) { console.log('[' + new Date().toLocaleTimeString() + '] ' + m) }
function send(ws, data) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)) }

// ========== 房间管理 ==========
function createRoom(p1, p2) {
  roomCounter++
  var room = {
    id: 'r' + roomCounter,
    players: [{ id: p1.id, name: p1.name, data: p1.data, ws: p1.ws, ready: false },
              { id: p2.id, name: p2.name, data: p2.data, ws: p2.ws, ready: false }],
    state: newGameState(),
    createdAt: Date.now(),
    inputBuffer: [{ seq: 0, inputs: [] }, { seq: 0, inputs: [] }],
  }
  rooms[room.id] = room
  playerRoom[p1.id] = room.id
  playerRoom[p2.id] = room.id

  log('Room ' + room.id + ': ' + p1.name + ' VS ' + p2.name)

  // 通知匹配成功
  send(p1.ws, { type: 'matched', roomId: room.id, side: 'home',
    you: { name: p1.name, id: p1.id },
    opponent: { name: p2.name, id: p2.id, player: p2.data } })
  send(p2.ws, { type: 'matched', roomId: room.id, side: 'away',
    you: { name: p2.name, id: p2.id },
    opponent: { name: p1.name, id: p1.id, player: p1.data } })

  return room
}

function newGameState() {
  return {
    phase: 'countdown',  // countdown | playing | scored | possession_change | game_over
    countdown: 3,
    score: [0, 0],
    poss: 0,
    shotClock: 24,
    shotClockStart: Date.now(),
    p1: { x: 250, y: 380, energy: 100 },
    p2: { x: 600, y: 380, energy: 100 },
    ball: { x: 280, y: 335, vx: 0, vy: 0, inAir: false, possessed: true },
    lastScorer: -1,
    stats: { p1: { pts: 0, blk: 0, stl: 0, reb: 0, fg: 0, fga: 0 },
             p2: { pts: 0, blk: 0, stl: 0, reb: 0, fg: 0, fga: 0 } },
    eventLog: [],
  }
}

// ========== 游戏主循环 ==========
function startLoop(room) {
  room._countdownTimer = setTimeout(function() {
    if (!rooms[room.id]) return
    room.state.phase = 'playing'
    broadcast(room, { type: 'game_start' })
    room._ticker = setInterval(function() { gameTick(room) }, TICK_RATE)
  }, 3200) // 3秒倒计时后开始

  // 倒计时每秒推送
  var cd = 3
  room._cdInterval = setInterval(function() {
    if (!rooms[room.id]) { clearInterval(room._cdInterval); return }
    cd--
    if (cd >= 0) {
      room.state.countdown = cd
      broadcast(room, { type: 'countdown', count: cd })
    } else { clearInterval(room._cdInterval) }
  }, 1000)
}

function gameTick(room) {
  var s = room.state
  if (s.phase !== 'playing') return

  // 处理输入缓冲
  processInputs(room, 0)
  processInputs(room, 1)

  // 更新篮球物理(简化)
  if (s.ball.inAir) {
    s.ball.vy += 0.2
    s.ball.x += s.ball.vx
    s.ball.y += s.ball.vy
  }

  // 更新计时器
  s.shotClock = Math.max(0, Math.ceil((SHOT_CLOCK_MS - (Date.now() - s.shotClockStart)) / 1000))
  if (s.shotClock <= 0) {
    switchPossession(room, '24秒违例！')
  }

  // 检查胜负
  checkWin(room)

  // 能量恢复
  s.p1.energy = Math.min(100, s.p1.energy + 0.05)
  s.p2.energy = Math.min(100, s.p2.energy + 0.05)

  // 同步状态
  broadcast(room, { type: 'state_sync', state: compressState(s) })
}

function processInputs(room, idx) {
  var buf = room.inputBuffer[idx]
  var s = room.state
  while (buf.inputs.length > 0) {
    var input = buf.inputs.shift()
    var p = idx === 0 ? s.p1 : s.p2
    switch (input.action) {
      case 'move':
        p.x = input.x; p.y = input.y
        break
      case 'shoot_start':
        broadcast(room, { type: 'opponent_shooting', playerIndex: idx })
        break
      case 'shoot_release':
        handleShootInput(room, idx, input)
        break
      case 'drive':
        p.energy -= 30
        broadcast(room, { type: 'opponent_drive', playerIndex: idx })
        break
      case 'steal':
        handleStealInput(room, idx)
        break
      case 'block':
        handleBlockInput(room, idx, input)
        break
      case 'rebound':
        handleReboundInput(room, idx)
        break
    }
  }
}

function handleShootInput(room, idx, input) {
  var s = room.state
  var offP = room.players[idx]
  var defP = room.players[1 - idx]
  if (!s.ball.possessed || s.ball.inAir) return

  var offData = offP.data
  var defData = defP.data
  var timing = input.timing || 0.5
  var timingPct = timing >= 0.46 && timing <= 0.54 ? 95 : timing >= 0.36 && timing <= 0.64 ? 70 : timing >= 0.22 && timing <= 0.78 ? 40 : 15
  var offShooting = offData ? (offData.shooting || 50) : 50
  var defDefense = defData ? (defData.defense || 50) : 50
  var made = Math.random() * 100 < timingPct + offShooting / 99 * 15 - defDefense / 99 * 8
  var is3 = input.x < 598  // 三分线在侧视图中距离篮筐X=290
  var pts = is3 ? 3 : 2

  s.stats[idx === 0 ? 'p1' : 'p2'].fga++
  s.ball.inAir = true
  s.ball.possessed = false
  s.ball.vx = 0
  s.ball.vy = -8

  if (made) {
    s.stats[idx === 0 ? 'p1' : 'p2'].fg++
    s.stats[idx === 0 ? 'p1' : 'p2'].pts += pts
    s.score[idx] += pts
    s.lastScorer = idx
    s.phase = 'scored'
    addEvent(room, offP.name + ' 命中' + (is3 ? '三分' : '两分') + '！+' + pts)
  } else {
    // 投篮不中，球落地后变成松动球（篮板争抢）
    s.phase = 'loose_ball'
    s.ball.inAir = true
    s.ball.vy = -5
    s.ball.vx = (Math.random() - 0.5) * 4
    addEvent(room, offP.name + ' 投篮不中，抢篮板！')
  }

  broadcast(room, {
    type: 'shot_result',
    playerIndex: idx, made: made, pts: pts,
    score: s.score, stats: s.stats, timingLabel: input.timingLabel
  })

  var that = room
  setTimeout(function() {
    if (!rooms[that.id]) return
    if (made) {
      switchPossession(that, '得分！')
    } else {
      // 球落地，可被争抢
      s.ball.inAir = false
      s.ball.possessed = false
      s.ball.x = 888 + (Math.random() - 0.5) * 160
      s.ball.y = 410
      broadcast(that, { type: 'ball_loose', ball: s.ball })
    }
  }, made ? 1800 : 1500)
}

function handleStealInput(room, idx) {
  var s = room.state
  if (s.poss === idx || !s.ball.possessed) return
  var stealer = room.players[idx]
  var dribbler = room.players[1 - idx]
  var defD = stealer.data ? stealer.data.defense : 50
  var offDr = dribbler.data ? dribbler.data.dribbling : 50
  var success = Math.random() < 0.25 + defD / 99 * 0.3 - offDr / 99 * 0.2
  if (success) {
    s.stats[idx === 0 ? 'p1' : 'p2'].stl++
    addEvent(room, stealer.name + ' 抢断成功！')
    broadcast(room, { type: 'steal_result', playerIndex: idx, success: true, stats: s.stats })
    switchPossession(room, '抢断！')
  } else {
    broadcast(room, { type: 'steal_result', playerIndex: idx, success: false })
  }
}

function handleBlockInput(room, idx, input) {
  var s = room.state
  if (!s.ball.inAir) return
  var blocker = room.players[idx]
  var defD = blocker.data ? blocker.data.defense : 50
  var defJp = blocker.data ? blocker.data.jumping : 50
  var success = Math.random() < 0.12 + defD / 99 * 0.2 + defJp / 99 * 0.18
  if (success) {
    s.stats[idx === 0 ? 'p1' : 'p2'].blk++
    s.ball.vy = Math.abs(s.ball.vy) * 1.5
    s.ball.vx = (Math.random() - 0.5) * 10
    addEvent(room, blocker.name + ' 盖帽！')
    broadcast(room, { type: 'block_result', playerIndex: idx, success: true, stats: s.stats })
  } else {
    broadcast(room, { type: 'block_result', playerIndex: idx, success: false })
  }
}

function handleReboundInput(room, idx) {
  var s = room.state
  if (!s.ball.inAir && !s.ball.possessed) {
    s.ball.possessed = true
    s.stats[idx === 0 ? 'p1' : 'p2'].reb = (s.stats[idx === 0 ? 'p1' : 'p2'].reb || 0) + 1
    s.poss = idx
    s.shotClockStart = Date.now()
    s.phase = 'playing'
    addEvent(room, room.players[idx].name + ' 抢到篮板！')
    broadcast(room, { type: 'possession_change', poss: s.poss, score: s.score, stats: s.stats, reason: '篮板球！' })
  }
}

function switchPossession(room, reason) {
  var s = room.state
  s.poss = 1 - s.poss
  s.ball = { x: 280, y: 335, vx: 0, vy: 0, inAir: false, possessed: true }
  s.p1 = { x: 250, y: 380, energy: Math.min(100, s.p1.energy + 20) }
  s.p2 = { x: 600, y: 380, energy: Math.min(100, s.p2.energy + 20) }
  s.shotClockStart = Date.now()
  s.phase = 'playing'
  if (reason) {
    s.eventLog.push({ time: Date.now(), text: reason })
    if (s.eventLog.length > 20) s.eventLog.shift()
  }
  broadcast(room, { type: 'possession_change', poss: s.poss, score: s.score, stats: s.stats, reason: reason })
  checkWin(room)
}

function checkWin(room) {
  var s = room.state
  var diff = Math.abs(s.score[0] - s.score[1])
  if (s.score[0] >= WIN_SCORE && diff >= 2) endGame(room, 0)
  else if (s.score[1] >= WIN_SCORE && diff >= 2) endGame(room, 1)
}

function endGame(room, winnerIdx) {
  var s = room.state
  s.phase = 'game_over'
  clearInterval(room._ticker)
  clearInterval(room._cdInterval)
  var winner = room.players[winnerIdx]
  var loser = room.players[1 - winnerIdx]

  // 更新排行榜
  updateLeaderboard(winner, loser, s)

  addEvent(room, winner.name + ' 获胜！')
  broadcast(room, {
    type: 'game_over',
    winner: { name: winner.name, id: winner.id },
    score: s.score,
    stats: s.stats,
    leaderboard: leaderboard.slice(0, 10),
  })
}

function addEvent(room, text) {
  room.state.eventLog.push({ time: Date.now(), text: text })
  if (room.state.eventLog.length > 50) room.state.eventLog.shift()
}

function updateLeaderboard(winner, loser, state) {
  // 胜利+3分，失败+1分
  addLB(winner.name, 3, state.stats[state.score[0] > state.score[1] ? 'p1' : 'p2'].pts)
  addLB(loser.name, 1, state.stats[state.score[0] > state.score[1] ? 'p2' : 'p1'].pts)
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
    p1: { x: Math.round(s.p1.x), y: Math.round(s.p1.y), e: Math.round(s.p1.energy) },
    p2: { x: Math.round(s.p2.x), y: Math.round(s.p2.y), e: Math.round(s.p2.energy) },
    ba: { x: Math.round(s.ball.x), y: Math.round(s.ball.y), ia: s.ball.inAir, ps: s.ball.possessed },
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

// ========== 匹配系统 ==========
function tryMatch() {
  if (queue.length < 2) return
  // 简单FIFO匹配
  var p1 = queue.shift()
  var p2 = queue.shift()
  var room = createRoom(p1, p2)
  startLoop(room)
}

// ========== HTTP服务器 + WebSocket ==========
var server = http.createServer(function(req, res) {
  if (req.url === '/api/leaderboard') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    return res.end(JSON.stringify(leaderboard.slice(0, 20)))
  }
  if (req.url === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    return res.end(JSON.stringify({
      rooms: Object.keys(rooms).length, queue: queue.length,
      totalPlayers: Object.keys(playerData).length, leaderboard: leaderboard.slice(0, 5)
    }))
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end('<html><head><meta charset="utf-8"><title>CBA 1v1 Server</title><style>body{font-family:sans-serif;background:#111;color:#fff;padding:40px}h1{color:#ff8c00}table{border-collapse:collapse}td{padding:8px 16px;border-bottom:1px solid #333}</style></head><body><h1>🏀 CBA篮球1v1 联机服务器</h1><p>运行中 | 房间: ' + Object.keys(rooms).length + ' | 排队: ' + queue.length + '</p><p>排行榜:</p><table>' + leaderboard.slice(0,10).map(function(l,i){return '<tr><td>'+(i+1)+'</td><td>'+l.name+'</td><td>'+l.score+'分</td><td>'+l.games+'场</td></tr>'}).join('')+'</table></body></html>')
})

var wss = new WebSocket.Server({ server: server, maxPayload: 4096 })

wss.on('connection', function(ws, req) {
  playerCounter++
  var pid = 'p' + playerCounter
  ws._pid = pid

  send(ws, { type: 'connected', playerId: pid })

  ws.on('message', function(raw) {
    var msg
    try { msg = JSON.parse(raw.toString()) } catch(e) { return }

    switch (msg.type) {
      // ====== 匹配 ======
      case 'join_queue':
        ws._name = msg.name || ('Player' + playerCounter)
        ws._playerData = msg.player
        playerData[pid] = { name: ws._name, ws: ws }
        queue.push({ id: pid, name: ws._name, data: msg.player, ws: ws })
        log(ws._name + ' 加入队列 (' + queue.length + '人)')
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

      // ====== 游戏操作 ======
      case 'input':
        var rid = playerRoom[pid]
        if (!rid || !rooms[rid]) return
        var r = rooms[rid]
        var idx = r.players[0].id === pid ? 0 : 1
        r.inputBuffer[idx].inputs.push(msg.data)
        // 同步给对手(非位置类操作)
        if (msg.data.action !== 'move') {
          broadcastOthers(r, pid, { type: 'opponent_action', playerIndex: idx, action: msg.data.action })
        }
        break

      case 'player_ready':
        var rid2 = playerRoom[pid]
        if (!rid2 || !rooms[rid2]) return
        var r2 = rooms[rid2]
        var idx2 = r2.players[0].id === pid ? 0 : 1
        r2.players[idx2].ready = true
        // 双方都准备好了
        if (r2.players[0].ready && r2.players[1].ready) {
          broadcast(r2, { type: 'both_ready' })
        }
        break

      // ====== 聊天 ======
      case 'chat':
        var rid3 = playerRoom[pid]
        if (!rid3 || !rooms[rid3]) return
        broadcast(rooms[rid3], { type: 'chat', from: ws._name, text: msg.text })
        break

      // ====== 再来一局 ======
      case 'rematch_request':
        var rid4 = playerRoom[pid]
        if (!rid4 || !rooms[rid4]) return
        var r4 = rooms[rid4]
        var idx4 = r4.players[0].id === pid ? 0 : 1
        r4._rematch = r4._rematch || [false, false]
        r4._rematch[idx4] = true
        broadcast(r4, { type: 'rematch_vote', playerIndex: idx4 })
        if (r4._rematch[0] && r4._rematch[1]) {
          r4.state = newGameState()
          r4._rematch = [false, false]
          broadcast(r4, { type: 'rematch_start', state: r4.state })
          startLoop(r4)
        }
        break

      // ====== 心跳 ======
      case 'ping':
        send(ws, { type: 'pong', serverTime: Date.now() })
        break
    }
  })

  ws.on('close', function() {
    log('断开: ' + (ws._name || pid))
    queue = queue.filter(function(p) { return p.id !== pid })

    var rid = playerRoom[pid]
    if (rid && rooms[rid]) {
      var r = rooms[rid]
      clearInterval(r._ticker)
      clearInterval(r._cdInterval)
      clearTimeout(r._countdownTimer)
      broadcastOthers(r, pid, { type: 'opponent_disconnected' })
      r.players.forEach(function(p) { delete playerRoom[p.id] })
      delete rooms[rid]
    }
    delete playerData[pid]
  })

  ws.on('error', function() {})
})

server.listen(PORT, function() {
  log('')
  log('  ==================================')
  log('   CBA篮球1v1 联机服务器 v2')
  log('   HTTP:    http://localhost:' + PORT)
  log('   WebSocket: ws://localhost:' + PORT)
  log('   排行榜:  http://localhost:' + PORT + '/api/leaderboard')
  log('  ==================================')
  log('')
})
