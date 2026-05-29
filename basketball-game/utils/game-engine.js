// 2D篮球游戏核心引擎 - 侧视图版本
var COURT_W = 1000
var COURT_H = 500
var FLOOR_Y = 420
var RIM_X = 888
var RIM_Y = 180
var RIM_R = 12
var GRAVITY = 0.45

function GameEngine(canvas, ctx, w, h, opts) {
  this.canvas = canvas
  this.ctx = ctx
  this.w = w
  this.h = h
  this.s = Math.min(w / COURT_W, h / COURT_H)
  this.offX = w / 2 - this._s(COURT_W) / 2
  this.offY = h / 2 - this._s(COURT_H) / 2
  this.bgImage = (opts && opts.bgImage) || null
  this.poss = 0
  this.score = [0, 0]
  this.gameOver = false
  this.winner = -1
  this.stats = { p1: { pts: 0, blk: 0, stl: 0, reb: 0 }, p2: { pts: 0, blk: 0, stl: 0, reb: 0 } }
  this.shooting = false
  this.shotPower = 0
  this._powPhase = 0
  this.shotReleased = false
  this.ballInAir = false
  this.ballLoose = false
  this.offInput = { mx: 0, my: 0 }
  this.defInput = { mx: 0, my: 0 }
  this.blockAnim = 0
  this.stealAnim = 0
  this.driveAnim = 0
  this.reboundAnim = 0
  this.scoredAnim = 0
  this._screenShake = 0
  this._jumpPhase = 'none'
  this._jumpY = 0
  this._jumpVy = 0
  this._jumpTimer = 0
  this._jumpType = 'none'
  this._jumpMx = 0
  this._jumpMy = 0
  this._dribbleHand = 0
  this._dribbleSwitchTimer = 0
  this.msg = ''
  this.msgTimer = 0
  this.shotResult = null
  this.offEnergy = 100
  this.defEnergy = 100
  this.stamina = 100
  this.shotClockTimer = 0
  this._particles = []
  this._trail = []
  this._scorePopups = []
  this._grabCooldown = 0
  this._dribblePhase = 0
  this._runPhase = 0
  this._chargePower = 0
  this._chargeZoneLo = 0.82
  this._chargeZoneHi = 0.98
  this._ballRimCooldown = 0
  this._lastBallY = null
  this._scoredThisShot = false
  this._screenShake = 0
  // Game timer
  var dur = (opts && opts.gameDuration) ? opts.gameDuration : 120
  this.gameTime = dur
  this.gameTimer = dur * 1000
  // Scoring mode: 'alternate' (换发) or 'keep' (连发)
  this.scoringMode = (opts && opts.scoringMode) ? opts.scoringMode : 'alternate'
  this._rimStuckCounter = 0
  this._commentary = []
  this._impact = 0
  this._jumpBallPhase = 'countdown' // countdown | toss | contest | done
  this._jumpBallTimer = 3000
  this._init()
}

GameEngine.prototype._s = function(v) { return v * this.s }

GameEngine.prototype._init = function() {
  this.ball = { x: this._s(260), y: this._s(350), vx: 0, vy: 0, r: this._s(12), has: true, rot: 0 }
  this._resetPos()
}

GameEngine.prototype._resetPos = function() {
  var offX = this._s(250), offY = this._s(380)
  var defX = this._s(600), defY = this._s(380)
  var baseR = this._s(30)
  var offVis = this.poss === 0 ? this._p1Vis : this._p2Vis
  var defVis = this.poss === 0 ? this._p2Vis : this._p1Vis
  var offR = baseR * (offVis ? offVis.size : 1)
  var defR = baseR * (defVis ? defVis.size : 1)
  this.off = { x: offX, y: offY, r: offR, mx: 0, my: 0, flash: 0 }
  this.def = { x: defX, y: defY, r: defR, mx: 0, my: 0, flash: 0 }
  this.ball.x = this._s(280)
  this.ball.y = this._s(335)
  this.ball.vx = 0
  this.ball.vy = 0
  this.ball.has = true
  this.ballInAir = false
  this.ballLoose = false
  this.shooting = false
  this.shotPower = 0
  this.shotReleased = false
  this.shotResult = null
  this._trail = []
  this._jumpPhase = 'none'
  this._jumpY = 0
  this._jumpVy = 0
  this._jumpTimer = 0
  this._jumpType = 'none'
  this._jumpMx = 0
  this._jumpMy = 0
  this._rimStuckCounter = 0
  this._scorePopups = []
  this._screenShake = 0
  this._dribbleHand = 0
  this._dribbleSwitchTimer = 0
  this._offVX = 0; this._offVY = 0; this._defVX = 0; this._defVY = 0
}

GameEngine.prototype.setPlayers = function(p1, p2) {
  this.p1 = p1
  this.p2 = p2
  var o = this.poss === 0 ? p1 : p2
  var d = this.poss === 0 ? p2 : p1
  this._offSp = 2.5 * (0.6 + (o ? o.speed / 99 : 0.5) * 0.8)
  this._defSp = 2.5 * (0.6 + (d ? d.speed / 99 : 0.5) * 0.7)
  this._offSh = o ? o.shooting : 50
  this._offDr = o ? o.dribbling : 50
  this._defDf = d ? d.defense : 50
  this._defJp = d ? d.jumping : 50

  // Compute distinct player visuals
  this._p1Vis = this._playerVisuals(p1)
  this._p2Vis = this._playerVisuals(p2)

  // Adjust player radii based on height
  var baseR = this._s(30)
  if (this.off) this.off.r = baseR * (this.poss === 0 ? this._p1Vis.size : this._p2Vis.size)
  if (this.def) this.def.r = baseR * (this.poss === 0 ? this._p2Vis.size : this._p1Vis.size)
}

GameEngine.prototype._playerVisuals = function(p) {
  if (!p) return { size: 1.0, build: 1.0, skin: 0, hair: 0, acc: 0 }
  // Height from position
  var baseHt = 195
  if (p.pos === 'PG') baseHt = 186
  else if (p.pos === 'SG') baseHt = 193
  else if (p.pos === 'SF') baseHt = 201
  else if (p.pos === 'PF') baseHt = 207
  else if (p.pos === 'C') baseHt = 213
  // Seed from player name for variation within position
  var nameSeed = 0
  var name = p.name || ''
  for (var i = 0; i < name.length; i++) nameSeed += name.charCodeAt(i)
  var htVar = (nameSeed % 13 - 6) // -6 to +6 cm
  var height = baseHt + htVar
  var size = 0.72 + (height - 175) / 180 * 0.70 // PG~0.76 C~1.07

  // Build from strength
  var str = p.strength || 50
  var build = 0.82 + (str / 99) * 0.36

  // Skin tone from name hash + position
  var skin = (nameSeed % 7) // 0-6: different skin tones

  // Hair style from num
  var hair = (p.num || 0) % 5 // 0-4: different styles

  // Accessories from position
  var acc = 0
  if (p.pos === 'PG' || p.pos === 'SG') acc = 1 // arm sleeve
  if (p.pos === 'C') acc = 2 // knee pad

  return { size: size, build: build, skin: skin, hair: hair, acc: acc, height: height }
}

GameEngine.prototype.getOffPlayer = function() { return this.poss === 0 ? this.p1 : this.p2 }
GameEngine.prototype.getDefPlayer = function() { return this.poss === 0 ? this.p2 : this.p1 }

GameEngine.prototype.getState = function() {
  var that = this
  return {
    score: that.score, poss: that.poss, gameOver: that.gameOver, winner: that.winner,
    shotClock: Math.max(0, Math.ceil(24 - that.shotClockTimer / 1000)),
    gameTime: Math.max(0, Math.ceil(that.gameTimer / 1000)),
    shooting: that.shooting, shotPower: that.shotPower, stats: that.stats,
    ballLoose: that.ballLoose,
    chargeZoneLo: that._chargeZoneLo, chargeZoneHi: that._chargeZoneHi,
    messageText: that.msgTimer > 0 ? that.msg : '',
    stamina: Math.floor(that.stamina),
    isDunkLayup: !!that._isDunkLayup,
    commentary: that._commentary.slice(-3),
    impact: that._impact,
    jumpBallPhase: that._jumpBallPhase,
    jumpBallTimer: Math.ceil(that._jumpBallTimer / 1000),
  }
}

// ==================== UPDATE ====================
GameEngine.prototype.update = function(dt) {
  if (this.gameOver) return
  dt = Math.min(dt, 33) * 0.75
  if (this._impact > 0) this._impact -= dt
  if (this._screenShake > 0) this._screenShake -= dt

  // Jump ball: 3-2-1 → 比赛开始 → 裁判举手抛球 → 争抢
  if (this._jumpBallPhase !== 'done') {
    this._jumpBallTimer -= dt
    var rx = this._s(500), refHandY = this._s(165)

    if (this._jumpBallPhase === 'countdown') {
      // 球在裁判手中
      this.ball.x = rx; this.ball.y = refHandY + this._s(5)
      this.ball.vx = 0; this.ball.vy = 0; this.ball.has = false; this.ballInAir = false
      if (this._jumpBallTimer <= 0) {
        this._jumpBallPhase = 'raise'
        this._jumpBallTimer = 600
        this._say('比赛开始！')
        this._sayCommentary('CBA 1v1 正式开打！')
      }
    } else if (this._jumpBallPhase === 'raise') {
      // 球在裁判手掌中随手上举
      var prog2 = 1 - (this._jumpBallTimer / 600)
      this.ball.x = rx
      this.ball.y = refHandY - prog2 * this._s(40)
      this.ball.vx = 0; this.ball.vy = 0
      this.ball.has = false; this.ballInAir = false
      if (this._jumpBallTimer <= 0) {
        this._jumpBallPhase = 'toss'
        this.ball.vy = -7
        this.ballInAir = true
      }
    } else if (this._jumpBallPhase === 'toss') {
      // 球从裁判手中向上飞出
      this.ball.vy += GRAVITY * (dt / 16) * 0.75
      this.ball.y += this.ball.vy * (dt / 16)
      if (this.ball.vy >= 0) this._jumpBallPhase = 'contest'
    } else if (this._jumpBallPhase === 'contest') {
      // 球下落，双方争抢
      this.ball.vy += GRAVITY * (dt / 16) * 0.75
      this.ball.y += this.ball.vy * (dt / 16)
      if (this.ball.y > this._s(350)) {
        var dOff = this._dist(this.off, this.ball)
        var dDef = this._dist(this.def, this.ball)
        if (dOff < this._s(80) || dDef < this._s(80)) {
          this.poss = dOff <= dDef ? 0 : 1
          this.ball.has = true; this.ballInAir = false; this.ballLoose = false
          this._jumpBallPhase = 'done'; this.shotClockTimer = 0
          this._resetPos()
          this._sayCommentary((this.poss === 0 ? (this.p1 ? this.p1.name : 'P1') : (this.p2 ? this.p2.name : 'P2')) + ' 跳到球权！')
        }
      }
    }
    this._move(dt)
    return
  }

  // Game timer
  this.gameTimer -= dt
  if (this.gameTimer <= 0) {
    this.gameTimer = 0
    this.gameOver = true
    this.winner = this.score[0] > this.score[1] ? 0 : (this.score[1] > this.score[0] ? 1 : -1)
    return
  }
  if (this.msgTimer > 0) this.msgTimer -= dt
  if (this.blockAnim > 0) this.blockAnim -= dt
  if (this.stealAnim > 0) this.stealAnim -= dt
  if (this.driveAnim > 0) this.driveAnim -= dt
  if (this.reboundAnim > 0) this.reboundAnim -= dt
  if (this.scoredAnim > 0) this.scoredAnim -= dt
  if (this._screenShake > 0) this._screenShake -= dt
  this._updateJump(dt)
  this._updateScorePopups(dt)
  // Commentary fade
  for (var ci = this._commentary.length - 1; ci >= 0; ci--) {
    this._commentary[ci].life -= dt
    if (this._commentary[ci].life <= 0) this._commentary.splice(ci, 1)
  }
  this.offEnergy = Math.min(100, this.offEnergy + dt * 0.008)
  this.defEnergy = Math.min(100, this.defEnergy + dt * 0.008)
  // Stamina: realistic exertion/recovery
  var moving = Math.abs(this.offInput.mx) > 0.05 || Math.abs(this.offInput.my) > 0.05
  if (this.ball.has) {
    if (moving) {
      this.stamina = Math.max(0, this.stamina - dt * 0.007)
      this._runPhase += dt * 0.008
      // Dust particles at feet while running
      if (Math.random() < 0.3) this._spawnParticles(this.off.x, this._s(FLOOR_Y - 2), 'rgba(180,150,120,0.4)', 1)
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 0.010) // 运球静止恢复
    }
  } else {
    if (!moving) {
      this.stamina = Math.min(100, this.stamina + dt * 0.035) // 无球静止快速恢复
    } else {
      this.stamina = Math.max(0, this.stamina - dt * 0.004) // 无球跑动极慢消耗
    }
  }
  this._dribblePhase += dt * 0.0012
  this.shotClockTimer += dt
  if (this._grabCooldown > 0) this._grabCooldown -= dt
  if (this.shotClockTimer >= 24000) this._chg('进攻超时！')

  this._phys(dt)
  this._move(dt)
  this._shootUpd(dt)
  this._checkBallGrab()
  this._collide()
  this._win()
}

GameEngine.prototype._phys = function(dt) {
  // Dribble hand alternation
  this._dribbleSwitchTimer += dt
  if (this._dribbleSwitchTimer > 400) {
    this._dribbleSwitchTimer = 0
    this._dribbleHand = this._dribbleHand === 0 ? 1 : (this._dribbleHand === 1 ? -1 : 1)
  }

  if (!this.ballInAir) {
    if (this.ball.has) {
      // Shooting pose: ball at raised shooting hand
      if (this.shooting || (this.shotReleased && this.shotResult)) {
        if (this._jumpType === 'dunk') {
          // 扣篮: 球举在手上方，随跳跃上升到筐上方
          this.ball.x = this.off.x
          this.ball.y = this.off.y - this.off.r * 5.5 + this._s(this._jumpY)
        } else if (this._jumpType === 'layup') {
          // 上篮: 球前伸，单手挑篮
          this.ball.x = this.off.x + this.off.r * 0.8
          this.ball.y = this.off.y - this.off.r * 2.8 + this._s(this._jumpY)
        } else {
          this.ball.x = this.off.x + this.off.r * 0.1
          this.ball.y = this.off.y - this.off.r * 3.2 + this._s(this._jumpY)
        }
      } else if (this.driveAnim > 0) {
        this.ball.x = this.off.x + this.off.r
        this.ball.y = this.off.y - this.off.r * 1.2
      } else {
        // Dribble: ball alternates sides + bounces to floor
        var handOff = this._dribbleHand * this.off.r * 0.5
        this.ball.x = this.off.x + this.off.r + handOff
        var handY = this.off.y - this.off.r * 1.2
        var floorY = this._s(FLOOR_Y - 14)
        // Ball bounces hand → floor → hand (triangle wave)
        var phase = (this._dribblePhase * 3.2) % 1
        if (phase < 0.45) {
          this.ball.y = handY + (floorY - handY) * (phase / 0.45)
        } else if (phase < 0.55) {
          this.ball.y = floorY
        } else {
          this.ball.y = floorY - (floorY - handY) * ((phase - 0.55) / 0.45)
        }
      }
    }
    return
  }
  this.ball.vy += GRAVITY * (dt / 16)
  this.ball.x += this.ball.vx * (dt / 16)
  this.ball.y += this.ball.vy * (dt / 16)
  this.ball.rot += 0.12 * (dt / 16)

  this._trail.push({ x: this.ball.x, y: this.ball.y, life: 300 })
  if (this._trail.length > 12) this._trail.shift()
  for (var i = this._trail.length - 1; i >= 0; i--) {
    this._trail[i].life -= dt
    if (this._trail[i].life <= 0) this._trail.splice(i, 1)
  }

  var bx = this.ball.x, by = this.ball.y, br = this.ball.r
  var rx = this._s(RIM_X), ry = this._s(RIM_Y), rr = this._s(RIM_R)
  var spd = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy)

  // Rim collision — generous scoring window
  var dx = bx - rx, dy = by - ry
  var dist = Math.sqrt(dx * dx + dy * dy)
  var collR = rr + br + this._s(2)

  // === SCORE DETECTION (priority, no cooldown) ===
  // Wide window: ball anywhere in the cylinder above/below rim
  var inCylinder = Math.abs(dx) < rr * 4.5 && by > ry - this._s(35) && by < ry + this._s(30)
  // Cross-frame: ball was above rim last frame, now below (or vice versa)
  var crossedRim = (this._lastBallY && ((this._lastBallY < ry && by >= ry) || (this._lastBallY > ry && by <= ry))) && Math.abs(dx) < rr * 4
  if ((inCylinder || crossedRim) && this.ballInAir && !this.ball.has && !this._scoredThisShot) {
    this._scoredThisShot = true
    this._score()
    this._lastBallY = null
    return
  }
  this._lastBallY = by

  if (dist < collR && this._ballRimCooldown <= 0) {
    // Rim bounce only from outside
    if (by < ry - this._s(6) || Math.abs(dx) > rr * 0.5) {
      this._rimStuckCounter++
      if (dist < 0.01) dist = 0.01
      var nx = dx / dist, ny = dy / dist
      var dot = this.ball.vx * nx + this.ball.vy * ny
      this.ball.vx -= 1.9 * dot * nx
      this.ball.vy -= 1.9 * dot * ny
      this.ball.vx *= 0.45; this.ball.vy *= 0.45
      var pushOut = collR - dist + 8
      this.ball.x += nx * pushOut
      this.ball.y += ny * pushOut
      if (this._rimStuckCounter >= 3) {
        this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 5 + 6)
        this.ball.vy = -(Math.random() * 4 + 4)
        this._rimStuckCounter = 0
      } else if (spd < 3.5) {
        this.ball.vy = -(Math.random() * 3 + 2.5)
        this.ball.vx = (Math.random() - 0.5) * 4.5
      }
      this._ballRimCooldown = 80
      this._spawnParticles(bx, by, '#ff8c00', 3)
    }
  }
  if (this._ballRimCooldown > 0) this._ballRimCooldown -= dt

  // Slide-off detection
  if (this._ballRimCooldown <= 0 && dist < collR + this._s(8) && spd < 1.5 && by < ry) {
    this.ball.vy += 1.5
    this.ball.vx += (dx > 0 ? 1 : -1) * 2
  }

  // Backboard collision
  var bbX = this._s(900), bbW = this._s(12)
  if (bx > bbX - br - this._s(2) && bx < bbX + bbW + this._s(2) && by > this._s(105) && by < this._s(255)) {
    if (bx > bbX - this._s(2)) {
      this.ball.x = bbX - br - this._s(4)
      this.ball.vx = -Math.abs(this.ball.vx) * 0.55
      if (Math.abs(this.ball.vx) < 2) this.ball.vx = -(Math.random() * 2.5 + 1.5)
    }
    this.ball.vy *= 0.75
    if (Math.abs(this.ball.vy) < 1) this.ball.vy = (Math.random() - 0.5) * 3 - 1
    this._spawnParticles(bx, by, '#ffffff', 3)
  }

  // Floor bounce
  var fl = this._s(FLOOR_Y - 6)
  if (by > fl && this.ball.vy > 0) {
    this.ball.y = fl - br
    this.ball.vy = -Math.abs(this.ball.vy) * 0.45
    this.ball.vx *= 0.6
    if (Math.abs(this.ball.vy) < 0.6) { this.ballInAir = false; this.ballLoose = true }
  }

  // Wall bounce (no out-of-bounds, ball bounces off screen edges)
  if (bx < this._s(5)) { this.ball.x = this._s(5) + br; this.ball.vx = Math.abs(this.ball.vx) * 0.6 }
  if (bx > this._s(940)) { this.ball.x = this._s(940) - br; this.ball.vx = -Math.abs(this.ball.vx) * 0.6 }
  if (by > this._s(470)) { this.ball.y = this._s(470) - br; this.ball.vy = -Math.abs(this.ball.vy) * 0.5; this.ball.vx *= 0.7 }
  // Top: open (no bounce, ball can go high)

  // Particles
  for (var j = this._particles.length - 1; j >= 0; j--) {
    var pt = this._particles[j]
    pt.life -= dt
    pt.x += pt.vx * (dt / 16)
    pt.y += pt.vy * (dt / 16)
    if (pt.life <= 0) this._particles.splice(j, 1)
  }
}

GameEngine.prototype._move = function(dt) {
  var maxX = this._s(930), minX = this._s(30)
  var maxY = this._s(FLOOR_Y - 20), minY = this._s(180)
  var t = dt / 16

  // --- Initialize velocity state ---
  if (!this._offVX) { this._offVX = 0; this._offVY = 0; this._defVX = 0; this._defVY = 0 }

  // === OFFENSE: inertia-based movement ===
  var staminaMod = this.stamina < 20 ? 0.55 + (this.stamina / 20) * 0.45 : 1.0
  var maxSpd = this._offSp * staminaMod * 0.85
  if (this.driveAnim > 0) maxSpd = 5.5
  var accel = maxSpd * 0.12, friction = maxSpd * 0.08
  var omx = this.offInput.mx, omy = this.offInput.my
  if (this.driveAnim > 0) omx = omx || 1

  var inAir = this._jumpPhase !== 'none' && this._jumpType === 'shoot'
  if (inAir) { omx = this._jumpMx; omy = this._jumpMy; accel *= 0.15 }

  // Accelerate toward input direction
  if (omx !== 0 || omy !== 0) {
    var om = Math.sqrt(omx * omx + omy * omy) || 1
    this._offVX += (omx / om) * accel * t
    this._offVY += (omy / om) * accel * 0.6 * t
  }
  // Friction
  var spd = Math.sqrt(this._offVX * this._offVX + this._offVY * this._offVY)
  if (spd > 0) {
    var fricForce = Math.min(friction * t, spd)
    this._offVX -= (this._offVX / spd) * fricForce
    this._offVY -= (this._offVY / spd) * fricForce
  }
  // Cap speed
  if (spd > maxSpd) { this._offVX *= maxSpd / spd; this._offVY *= maxSpd / spd }
  this.off.x += this._offVX * t; this.off.y += this._offVY * t

  // === DEFENSE: smart AI ===
  var defSpd = this._defSp * 0.8
  var dAccel = defSpd * 0.14, dFric = defSpd * 0.09
  var tgtX, tgtY
  if (this.ballLoose || (!this.ball.has && this.ballInAir)) {
    tgtX = this.ball.x; tgtY = this.ball.y
  } else {
    // Position between offensive player and basket
    var rimX = this._s(RIM_X), rimY = this._s(RIM_Y + 100)
    var midX = (this.off.x + rimX) / 2, midY = (this.off.y + rimY) / 2
    // Offset toward the off player but keep rim behind
    tgtX = midX + (this.off.x - rimX) * 0.15
    tgtY = midY + (this.off.y - rimY) * 0.1
    // Stay within defined defense range
    var dx2 = this.off.x - this.def.x, dy2 = this.off.y - this.def.y
    var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    if (dist2 < this._s(45)) {
      tgtX = this.def.x - dx2 * 0.3; tgtY = this.def.y - dy2 * 0.3
    }
  }
  var ddx = tgtX - this.def.x, ddy = tgtY - this.def.y
  var dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1
  this._defVX += (ddx / dd) * dAccel * t; this._defVY += (ddy / dd) * dAccel * 0.6 * t
  var dspd = Math.sqrt(this._defVX * this._defVX + this._defVY * this._defVY)
  if (dspd > 0) { var df = Math.min(dFric * t, dspd); this._defVX -= (this._defVX / dspd) * df; this._defVY -= (this._defVY / dspd) * df }
  if (dspd > defSpd) { this._defVX *= defSpd / dspd; this._defVY *= defSpd / dspd }
  this.def.x += this._defVX * t; this.def.y += this._defVY * t

  // === Auto defense actions ===
  if (!this.ball.has && !this.ballInAir && this.ballLoose && dd < this._s(50) && Math.random() < 0.03) {
    this.attemptRebound()
  }
  if (this.ball.has && this.poss !== 1 && dist2 < this._s(55) && this.stealAnim <= 0 && this.defEnergy > 25 && Math.random() < 0.008) {
    this.attemptSteal()
  }
  if (this.ballInAir && !this.ball.has && this.ball.vy < 0 && Math.abs(this.ball.x - this.def.x) < this._s(70) && Math.random() < 0.015 && this.defEnergy > 30) {
    this.attemptBlock()
  }

  // Clamp positions
  this.off.x = Math.max(minX, Math.min(maxX, this.off.x))
  this.off.y = Math.max(minY, Math.min(maxY, this.off.y))
  this.def.x = Math.max(minX, Math.min(maxX, this.def.x))
  this.def.y = Math.max(minY, Math.min(maxY, this.def.y))

  // Store AI input for animation
  this.defInput.mx = ddx / dd; this.defInput.my = ddy / dd
}

GameEngine.prototype._shootUpd = function(dt) {
  if (!this.shooting || this.shotReleased) return
  this._chargePower += dt / 480
  if (this._chargePower > 1.0) this._chargePower = 1.0
  this.shotPower = this._chargePower

  // 扣篮/上篮: 进入滞空第一时间灌篮，然后下落
  if (this._isDunkLayup) {
    if (this._jumpPhase === 'hang' && this._chargePower > 0.03) {
      this.shotReleased = true; this.shooting = false
      this._fire()
      // 灌篮后立即开始下落
      this._jumpPhase = 'falling'; this._jumpTimer = 0
    }
    return
  }
  // 到达满蓄力自动出手
  if (this._chargePower >= 1.0) this.releaseShoot()
}

GameEngine.prototype._collide = function() {
  if (this.stealAnim > 0 && this.ball.has && !this.shooting) {
    var dx = this.def.x - this.off.x, dy = this.def.y - this.off.y
    if (Math.sqrt(dx * dx + dy * dy) < this._s(45)) {
      var c = 0.25 + this._defDf / 99 * 0.35 - this._offDr / 99 * 0.25
      if (Math.random() < c) {
        this._chg('抢断成功！')
        this.stats[this.poss === 0 ? 'p2' : 'p1'].stl++
        this._say('抢断！')
        this._spawnParticles(this.ball.x, this.ball.y, '#ffff00', 12)
      } else { this._say('抢断失败') }
      this.stealAnim = 0
    }
  }
}

GameEngine.prototype._win = function() {
  if (this.gameOver) return
  var d = Math.abs(this.score[0] - this.score[1])
  if (this.score[0] >= 11 && d >= 2) { this.gameOver = true; this.winner = 0 }
  else if (this.score[1] >= 11 && d >= 2) { this.gameOver = true; this.winner = 1 }
}

// ==================== INPUT ====================
GameEngine.prototype.setOffMove = function(mx, my) { this.offInput.mx = mx || 0; this.offInput.my = my || 0 }
GameEngine.prototype.setDefMove = function(mx, my) { this.defInput.mx = mx || 0; this.defInput.my = my || 0 }

// ==================== ACTIONS ====================
GameEngine.prototype.startShoot = function() {
  if (!this.ball.has || this.shooting || this.ballInAir || this.driveAnim > 0) return
  this.shooting = true; this.shotReleased = false; this._chargePower = 0; this.shotPower = 0
  this._isDunkLayup = false; this._fadeaway = false

  // 篮下扣篮/上篮判定: 距篮筐80单位以内 且 体力>60%
  var distToRim = Math.abs(this.off.x - this._s(RIM_X))
  var jumpType = 'shoot'
  if (distToRim < this._s(120) && this.stamina > 40) {
    var offP = this.getOffPlayer()
    var str = offP ? (offP.strength || 50) : 50
    var jmp = offP ? (offP.jumping || 50) : 50
    var spd = offP ? (offP.speed || 50) : 50
    var drb = offP ? (offP.dribbling || 50) : 50
    jumpType = (str + jmp) >= (spd + drb) ? 'dunk' : 'layup'
    this._isDunkLayup = true
  }

  // 后仰跳投: 摇杆往远离篮筐方向(左)推
  if (jumpType === 'shoot' && this.offInput.mx < -0.3) {
    this._fadeaway = true
  }

  // 扣篮/上篮: 不需要绿条, 自动蓄力释放
  if (this._isDunkLayup) {
    this._chargeZoneLo = 0; this._chargeZoneHi = 0 // 隐藏绿条
  } else {
    var sh = this._offSh || 50
    var hw = 0.15 + (sh / 99) * 0.12
    this._chargeZoneLo = 0.90 - hw
    this._chargeZoneHi = 0.90 + hw
  }
  this._triggerJump(jumpType)
}

GameEngine.prototype.releaseShoot = function() {
  if (!this.shooting || this.shotReleased) return
  // 扣篮/上篮: 需要至少150ms蓄力, 然后自动释放
  if (this._isDunkLayup) {
    if (this._chargePower < 0.06) {
      this._say('按住蓄力再投！')
      this._jumpPhase = 'none'; this._jumpY = 0; this._jumpType = 'none'
      return
    }
    return // 等待_shootUpd中滞空自动释放
  }
  this.shotReleased = true; this.shooting = false
  if (this._chargePower < 0.18) {
    this._say('按住蓄力再投！')
    this._jumpPhase = 'none'; this._jumpY = 0; this._jumpType = 'none'
    return
  }
  this._fire()
}

GameEngine.prototype._fire = function() {
  var isDunk = this._jumpType === 'dunk'
  var isLayup = this._jumpType === 'layup'
  var distToRim = Math.abs(this.off.x - this._s(RIM_X))
  var is3 = !isDunk && !isLayup && (this.off.x < this._s(RIM_X - 290))
  var offP = this.getOffPlayer()
  var sh = offP ? (offP.shooting || 50) : 50
  var sp = offP ? (offP.speed || 50) : 50
  var st = offP ? (offP.strength || 50) : 50
  var dr = offP ? (offP.dribbling || 50) : 50
  var jm = offP ? (offP.jumping || 50) : 50
  var dd = this._defDist()

  var label, mp, pts

  if (isDunk) {
    var dunkContest = dd < this._s(30) ? (1 - dd / this._s(30)) * 12 : 0
    mp = 95 + (st / 99) * 5 + (jm / 99) * 5 - dunkContest
    mp = Math.max(82, Math.min(99, mp))
    label = '暴扣！'
    pts = 2
    this._sayCommentary(this._commentaryFor('dunk', offP ? offP.name : ''))
    this._spawnParticles(this._s(RIM_X), this._s(RIM_Y + 25), '#ff6600', 20)
    this._spawnParticles(this._s(RIM_X), this._s(RIM_Y + 25), '#ffff00', 12)
    this._spawnParticles(this._s(RIM_X), this._s(RIM_Y + 25), '#ff0000', 8)
    this._impact = 500
    this._screenShake = Math.max(this._screenShake, 350)
    // Confetti on dunk
    for (var cf = 0; cf < 15; cf++) {
      this._particles.push({ x: this._s(RIM_X), y: this._s(RIM_Y), vx: (Math.random() - 0.5) * 10, vy: -(Math.random() * 8 + 3), life: 800 + Math.random() * 500, color: ['#ffd700','#ff4444','#00ff88','#4488ff','#ff8800'][Math.floor(Math.random()*5)] })
    }
  } else if (isLayup) {
    var layContest = dd < this._s(35) ? (1 - dd / this._s(35)) * 15 : 0
    mp = 90 + (sp / 99) * 8 + (dr / 99) * 6 - layContest
    mp = Math.max(72, Math.min(99, mp))
    label = '上篮！'
    pts = 2
    this._sayCommentary(this._commentaryFor('layup', offP ? offP.name : ''))
    this._impact = 250
  } else if (is3) {
    var t3 = this._timing()
    var distPenalty = Math.max(0, (distToRim - this._s(290)) / this._s(5) * 1.2)
    var contest3 = dd < this._s(100) ? (1 - dd / this._s(100)) * 20 + this._defDf / 99 * 10 : 0
    var faPenalty = this._fadeaway ? 5 : 0
    mp = t3.basePct + (sh / 99) * 22 - distPenalty - contest3 - faPenalty
    mp = Math.max(8, Math.min(98, mp))
    label = this._fadeaway ? '后仰三分！' : t3.label
    pts = 3
    if (t3.label === '完美') this._sayCommentary(this._commentaryFor('three', offP ? offP.name : ''))
    this._impact = 300
  } else {
    var t2 = this._timing()
    var closeBonus = 0
    if (distToRim < this._s(40)) closeBonus = 38
    else if (distToRim < this._s(80)) closeBonus = 30
    else if (distToRim < this._s(140)) closeBonus = 18
    else if (distToRim < this._s(220)) closeBonus = 8
    else if (distToRim < this._s(270)) closeBonus = 3
    var contest2 = dd < this._s(80) ? (1 - dd / this._s(80)) * 20 + this._defDf / 99 * 8 : 0
    var faPenalty2 = this._fadeaway ? 4 : 0
    var faBlockResist = this._fadeaway ? contest2 * 0.35 : 0
    mp = t2.basePct + (sh / 99) * 28 + closeBonus - contest2 + faBlockResist - faPenalty2
    mp = Math.max(15, Math.min(97, mp))
    label = this._fadeaway ? '后仰跳投！' : t2.label
    pts = 2
  }

  // 绿区释放 + 无贴身防守 = 必中
  var goodTiming = label === '完美' || label === '不错'
  var noContest = dd > this._s(45)
  var autoMake = !isDunk && !isLayup && goodTiming && noContest

  // 绿区释放 → 命中率保底95%
  if (goodTiming && !isDunk && !isLayup) mp = Math.max(mp, 95)

  var made = autoMake || (Math.random() * 100 < mp)

  // Stamina cost for actions
  if (isDunk) this.stamina = Math.max(0, this.stamina - 18)
  else if (isLayup) this.stamina = Math.max(0, this.stamina - 10)
  else this.stamina = Math.max(0, this.stamina - 5)

  this.ball.has = false; this.ballInAir = true
  this._grabCooldown = 350
  this._lastBallY = null
  this._scoredThisShot = false

  if (isDunk) {
    // 扣篮: 球悬停在筐上方一瞬，然后猛力砸下
    this.ball.x = this._s(RIM_X)
    this.ball.y = this._s(RIM_Y - 18)
    this.ball.vx = (Math.random() - 0.5) * 0.5
    this.ball.vy = 8 + (st / 99) * 6  // 强力下砸
    this._screenShake = Math.max(this._screenShake, 350)
    if (!made) {
      this.ball.vy = -(Math.random() * 6 + 3)
      this.ball.vx = (Math.random() - 0.5) * 6
    }
  } else if (isLayup) {
    // 上篮: 球从指尖柔和挑入篮筐
    var lx = this.ball.x, ly = this.ball.y
    var ldx = this._s(RIM_X) - lx
    var ldy = this._s(RIM_Y - 8) - ly
    var laySpeed = 4.5 + (dr / 99) * 3
    var layDist = Math.sqrt(ldx * ldx + ldy * ldy) || 1
    this.ball.vx = ldx / layDist * laySpeed * 0.6
    this.ball.vy = ldy / layDist * laySpeed * 0.6 + laySpeed * 0.15
    if (!made) {
      this.ball.vx += (Math.random() - 0.5) * 2.5
      this.ball.vy += (Math.random() - 0.5) * 2
    }
  } else {
    var jumpBoost = (this._jumpPhase === 'rising') ? 3.5 : (this._jumpPhase === 'hang') ? 0 : (this._jumpPhase === 'falling') ? -2 : 0
    var fadeBoost = this._fadeaway ? 5.5 : 0
    var sX = this.ball.x, sY = this.ball.y
    var tgtX = this._s(RIM_X), tgtY = this._s(RIM_Y)
    var ddx = tgtX - sX, ddy = tgtY - sY
    var dist2 = Math.sqrt(ddx * ddx + ddy * ddy)
    var speed = 4 + this.shotPower * 7
    var time = dist2 / speed
    this.ball.vx = ddx / time
    this.ball.vy = ddy / time - 0.5 * GRAVITY * 0.75 * time - jumpBoost - fadeBoost
    if (!made) {
      this.ball.vx += (Math.random() - 0.5) * 2.5
      this.ball.vy += (Math.random() - 0.5) * 2
    }
  }

  this.shotResult = { made: made, pts: pts, timing: label }
  this.shotClockTimer = 0
  // 投篮/上篮出手后立即开始下落
  if (!isDunk && !isLayup && this._jumpPhase !== 'none') {
    this._jumpPhase = 'falling'
    this._jumpTimer = 0
    this._fallStart = this._jumpY
    this._fallDur = 400
  }
}

GameEngine.prototype._timing = function() {
  var p = this.shotPower
  var lo = this._chargeZoneLo, hi = this._chargeZoneHi
  var mid = (lo + hi) / 2, hw = Math.max((hi - lo) / 2, 0.01)
  if (p < 0.20) return { label: '太早', basePct: 35 }
  if (p < lo) return { label: '早了', basePct: 70 }
  if (p <= hi || p <= 1.0) {
    var dist = Math.abs(p - mid) / hw
    if (dist < 0.55) return { label: '完美', basePct: 99 }
    if (dist < 0.90) return { label: '不错', basePct: 96 }
    return { label: '一般', basePct: 88 }
  }
  return { label: '太晚', basePct: 50 }
}
GameEngine.prototype._defDist = function() {
  var dx = this.def.x - this.off.x, dy = this.def.y - this.off.y
  return Math.sqrt(dx * dx + dy * dy)
}
GameEngine.prototype._contest = function(d) {
  if (d > this._s(70)) return 0
  return (1 - d / this._s(70)) * 30 + this._defDf / 99 * 10
}

GameEngine.prototype._score = function() {
  this.ballInAir = false; this.ball.has = false
  this.ball.x = this._s(RIM_X); this.ball.y = this._s(RIM_Y + 25)
  this.ball.vx = 0; this.ball.vy = 0
  this._rimStuckCounter = 0
  // Prevent rim collision from re-triggering on the stationary ball
  this._ballRimCooldown = 2000
  if (this.shotResult && this.shotResult.made) {
    this.score[this.poss] += this.shotResult.pts
    this.stats[this.poss === 0 ? 'p1' : 'p2'].pts += this.shotResult.pts
    this.scoredAnim = 1200
    this._say(this.shotResult.timing + '！+' + this.shotResult.pts + '分')
    this._spawnParticles(this._s(RIM_X), this._s(RIM_Y + 30), '#ffd700', 20)
    this._scorePopups.push({ x: this._s(RIM_X), y: this._s(RIM_Y), text: '+' + this.shotResult.pts, life: 1200, maxLife: 1200 })
    this._screenShake = 180
    var that = this
    setTimeout(function() {
      // Swap possession for alternate mode
      if (that.scoringMode !== 'keep') {
        that.poss = that.poss === 0 ? 1 : 0
      }
      that._resetPos()
      that.shotClockTimer = 0
      that.shotResult = null
      that.ballInAir = false
      that.ballLoose = false
      that.stealAnim = 0; that.blockAnim = 0; that.driveAnim = 0
      that.scoredAnim = 0
      that.offEnergy = Math.min(100, that.offEnergy + 30)
      that.defEnergy = Math.min(100, that.defEnergy + 30)
      var o = that.poss === 0 ? that.p1 : that.p2
      var d = that.poss === 0 ? that.p2 : that.p1
      that._offSp = 2.5 * (0.6 + (o ? o.speed / 99 : 0.5) * 0.8)
      that._defSp = 2.5 * (0.6 + (d ? d.speed / 99 : 0.5) * 0.7)
      that._offSh = o ? o.shooting : 50
      that._offDr = o ? o.dribbling : 50
      that._defDf = d ? d.defense : 50
      that._defJp = d ? d.jumping : 50
    }, 1200)
  } else {
    this._say('打铁！抢篮板！')
    this._spawnParticles(this.ball.x, this.ball.y, '#ffffff', 8)
    this.ball.x = this._s(RIM_X) + (Math.random() - 0.5) * this._s(100)
    this.ball.y = this._s(RIM_Y + 40)
    this.ball.vx = (Math.random() - 0.5) * 5
    this.ball.vy = Math.random() * 2 - 4
    this.ballInAir = true
    this.shotResult = null
  }
}

GameEngine.prototype._chg = function(reason) {
  if (this.scoredAnim > 0) return
  var that = this
  if (reason) that._say(reason)
  setTimeout(function() {
    that.poss = that.poss === 0 ? 1 : 0
    that._resetPos()
    that.shotClockTimer = 0
    that.shotResult = null
    that.ballInAir = false
    that.ballLoose = false
    that.stealAnim = 0; that.blockAnim = 0; that.driveAnim = 0
    that.offEnergy = Math.min(100, that.offEnergy + 30)
    that.defEnergy = Math.min(100, that.defEnergy + 30)
    var o = that.poss === 0 ? that.p1 : that.p2
    var d = that.poss === 0 ? that.p2 : that.p1
    that._offSp = 2.5 * (0.6 + (o ? o.speed / 99 : 0.5) * 0.8)
    that._defSp = 2.5 * (0.6 + (d ? d.speed / 99 : 0.5) * 0.7)
    that._offSh = o ? o.shooting : 50
    that._offDr = o ? o.dribbling : 50
    that._defDf = d ? d.defense : 50
    that._defJp = d ? d.jumping : 50
  }, 800)
}

GameEngine.prototype._say = function(t) { this.msg = t; this.msgTimer = 2000 }
GameEngine.prototype.jumpBallJump = function() {
  if (this._jumpBallPhase === 'done') return
  if (this._jumpPhase !== 'none') return
  this._jumpPhase = 'crouch'
  this._jumpTimer = 0; this._jumpY = 0
  this._jumpType = 'jumpball'
}
GameEngine.prototype._sayCommentary = function(t) {
  this._commentary.push({ text: t, time: Date.now(), life: 4000 })
  if (this._commentary.length > 5) this._commentary.shift()
}

GameEngine.prototype._commentaryFor = function(event, name) {
  var pool = {
    dunk: [
      name + ' 腾空而起！暴力灌筐！',
      name + ' 飞身暴扣！势大力沉！',
      '天哪！' + name + ' 单手劈扣！',
      name + ' 高高跃起，狠狠砸进篮筐！',
      '太残暴了！' + name + ' 的扣篮！',
    ],
    layup: [
      name + ' 轻盈上篮，漂亮！',
      name + ' 巧妙挑篮得手！',
      '好球！' + name + ' 的上篮！',
    ],
    three: [
      '三分命中！' + name + ' 远程发炮！',
      name + ' 三分线外手起刀落！',
      'BANG！' + name + ' 三分入网！',
    ],
    steal: [
      '抢断！' + name + ' 快手夺球！',
      name + ' 闪电抢断！球权转换！',
    ],
    block: [
      name + ' 送上火锅！拒绝得分！',
      name + ' 劈头盖脸的盖帽！',
      '钉板大帽！' + name + ' 守护篮下！',
    ],
    score: [
      '球进了！' + name + ' 拿下关键分！',
      name + ' 稳稳命中！',
      '好球！比分来到 ' + this.score[0] + '-' + this.score[1],
    ],
  }
  var list = pool[event]
  if (!list) return
  return list[Math.floor(Math.random() * list.length)]
}

GameEngine.prototype._updateJump = function(dt) {
  if (this._jumpPhase === 'none') return
  this._jumpTimer += dt

  // Easing functions
  var easeOut = function(t) { return 1 - Math.pow(1 - t, 3) }
  var easeIn = function(t) { return t * t * t }

  if (this._jumpPhase === 'crouch') {
    var cd = 80, cdepth = 8
    if (this._jumpType === 'dunk') { cd = 80; cdepth = 30 }
    else if (this._jumpType === 'layup') { cd = 70; cdepth = 12 }
    else if (this._jumpType === 'block') { cd = 40; cdepth = 6 }
    var prog = Math.min(1, this._jumpTimer / cd)
    this._jumpY = cdepth * easeIn(prog)
    if (prog >= 1) {
      this._jumpPhase = 'rising'
      this._jumpTimer = 0
      this._jumpStart = cdepth
      this._jumpPeak = this._jumpType === 'dunk' ? -220 : this._jumpType === 'block' ? -100 : -85
      this._jumpRiseDur = this._jumpType === 'dunk' ? 420 : this._jumpType === 'block' ? 220 : 380
    }
  } else if (this._jumpPhase === 'rising') {
    var rProg = Math.min(1, this._jumpTimer / this._jumpRiseDur)
    this._jumpY = this._jumpStart + (this._jumpPeak - this._jumpStart) * easeOut(rProg)
    if (rProg >= 1) {
      this._jumpPhase = 'hang'
      this._jumpTimer = 0
    }
  } else if (this._jumpPhase === 'hang') {
    var hd = this._jumpType === 'dunk' ? 120 : this._jumpType === 'block' ? 30 : 50
    if (this._jumpTimer >= hd) {
      this._jumpPhase = 'falling'
      this._jumpTimer = 0
      this._fallStart = this._jumpY
      this._fallDur = this._jumpType === 'dunk' ? 380 : this._jumpType === 'block' ? 180 : 420
    }
  } else if (this._jumpPhase === 'falling') {
    var fProg = Math.min(1, this._jumpTimer / this._fallDur)
    this._jumpY = this._fallStart + (0 - this._fallStart) * easeIn(fProg)
    if (fProg >= 1) {
      this._jumpY = 0
      this._jumpPhase = 'none'
      this._jumpTimer = 0
      this._jumpType = 'none'
    }
  }
}

GameEngine.prototype._triggerJump = function(type) {
  if (this._jumpPhase !== 'none') return
  this._jumpPhase = 'crouch'
  this._jumpTimer = 0
  this._jumpY = 0
  this._jumpVy = 0
  this._jumpType = type
  // Store pre-jump momentum: during air phase, player can't change direction
  if (type === 'shoot') {
    this._jumpMx = this.offInput.mx
    this._jumpMy = this.offInput.my
  } else {
    this._jumpMx = this.defInput.mx
    this._jumpMy = this.defInput.my
  }
}

GameEngine.prototype._updateScorePopups = function(dt) {
  for (var i = this._scorePopups.length - 1; i >= 0; i--) {
    var p = this._scorePopups[i]
    p.life -= dt
    p.y -= 1.2 * (dt / 16)
    if (p.life <= 0) this._scorePopups.splice(i, 1)
  }
}

GameEngine.prototype._spawnParticles = function(x, y, color, count) {
  for (var i = 0; i < count; i++) {
    this._particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      life: 400 + Math.random() * 300,
      color: color
    })
  }
}

GameEngine.prototype.attemptDrive = function() {
  if (!this.ball.has || this.shooting || this.driveAnim > 0 || this.offEnergy < 30) { if (this.offEnergy < 30) this._say('体力不足'); return }
  this.driveAnim = 600; this.offEnergy -= 30; this.stamina = Math.max(0, this.stamina - 12); this._say('突破！')
  this._spawnParticles(this.off.x, this.off.y, '#0088ff', 10)
  var d = this._defDist()
  if (d < this._s(35)) {
    var c = 0.35 + (this._offSp / 5) * 0.35 - this._defDf / 99 * 0.25
    if (Math.random() > c) { this._say('突破被阻！'); this.driveAnim = 200; var that = this; setTimeout(function() { that._chg('进攻犯规！') }, 300) }
  }
}

GameEngine.prototype.attemptSteal = function() {
  if (!this.ball.has || this.shooting || this.stealAnim > 0 || this.defEnergy < 20) { if (this.defEnergy < 20) this._say('体力不足'); return }
  this.stealAnim = 400; this.defEnergy -= 20; this.stamina = Math.max(0, this.stamina - 8)
  var dx = this.def.x - this.off.x, dy = this.def.y - this.off.y
  var dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < this._s(70)) {
    var c = (dist < this._s(50) ? 0.3 : 0.12) + this._defDf / 99 * 0.35 - this._offDr / 99 * 0.3
    if (Math.random() < c) {
      this._chg('抢断成功！')
      this.stats[this.poss === 0 ? 'p2' : 'p1'].stl++
      this._say('抢断成功！')
      this._sayCommentary(this._commentaryFor('steal', this.getDefPlayer() ? this.getDefPlayer().name : ''))
      this._impact = 100
      this._spawnParticles(this.ball.x, this.ball.y, '#ffff00', 15)
      return
    }
  }
  this._say('抢断失败')
}

GameEngine.prototype.attemptBlock = function() {
  if (!this.ballInAir || this.blockAnim > 0 || this.defEnergy < 25) { if (!this.ballInAir) this._say('等投篮再盖帽'); else this._say('体力不足'); return }
  this.blockAnim = 500; this.defEnergy -= 25; this.stamina = Math.max(0, this.stamina - 12)
  this._triggerJump('block')
  this._screenShake = Math.max(this._screenShake, 120)
  var dx = this.def.x - this.ball.x, dy = this.def.y - this.ball.y
  var dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < this._s(80) && this.ball.vy < 0) {
    var c = 0.15 + this._defDf / 99 * 0.25 + this._defJp / 99 * 0.2
    if (Math.random() < c) {
      this.ball.vy = Math.abs(this.ball.vy) * 1.5
      this.ball.vx = (Math.random() - 0.5) * 8
      this.shotResult = null
      this._say('盖帽！')
      this._sayCommentary(this._commentaryFor('block', this.getDefPlayer() ? this.getDefPlayer().name : ''))
      this._impact = 200
      this._spawnParticles(this.ball.x, this.ball.y, '#ff4444', 18)
      this.stats[this.poss === 0 ? 'p2' : 'p1'].blk++
      var that = this
      setTimeout(function() { if (that.ballInAir) that._chg('盖帽出界！') }, 2000)
      return
    }
  }
  this._say('盖帽失败')
}

GameEngine.prototype.attemptRebound = function() {
  if (this.ball.has) return
  var dOff = this._dist(this.off, this.ball)
  var dDef = this._dist(this.def, this.ball)
  var grabRange = this._s(70)
  if (dOff < grabRange && dOff <= dDef) { this._doRebound(this.poss); return }
  if (dDef < grabRange && dDef < dOff) { this._doRebound(1 - this.poss); return }
  this._say('太远了，靠近点！')
}

GameEngine.prototype._checkBallGrab = function() {
  if (this.ball.has || this.scoredAnim > 0) return
  // Aggressive ground-ball pickup: ball on floor always grabbable
  if (!this.ballInAir && !this.ballLoose) this.ballLoose = true
  if (!this.ballInAir && !this.ballLoose) return
  var dOff = this._dist(this.off, this.ball)
  var dDef = this._dist(this.def, this.ball)
  var range = this._s(65)
  if (dOff < range && dOff <= dDef) { this._doRebound(this.poss); return }
  if (dDef < range && dDef < dOff) { this._doRebound(1 - this.poss); return }
}

GameEngine.prototype._dist = function(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

GameEngine.prototype._doRebound = function(who) {
  this.ballLoose = false; this.ball.has = true; this.ballInAir = false
  this.reboundAnim = 400
  var statKey = who === 0 ? 'p1' : 'p2'
  this.stats[statKey].reb++
  this.poss = who; this.shotClockTimer = 0; this.shotResult = null
  this._spawnParticles(this.ball.x, this.ball.y, '#00ff88', 12)
  var pname = who === 0 ? (this.p1 ? this.p1.name : 'P1') : (this.p2 ? this.p2.name : 'P2')
  this._say(pname + ' 抢到篮板！')
  var o = this.poss === 0 ? this.p1 : this.p2
  var d = this.poss === 0 ? this.p2 : this.p1
  this._offSp = 2.5 * (0.6 + (o ? o.speed / 99 : 0.5) * 0.8)
  this._defSp = 2.5 * (0.6 + (d ? d.speed / 99 : 0.5) * 0.7)
  this._offSh = o ? o.shooting : 50
  this._offDr = o ? o.dribbling : 50
  this._defDf = d ? d.defense : 50
  this._defJp = d ? d.jumping : 50
}

// ==================== RENDER ====================
GameEngine.prototype.render = function() {
  var ctx = this.ctx
  if (!ctx) return
  var w = this.w, h = this.h

  // Screen shake
  var shakeX = 0, shakeY = 0
  if (this._screenShake > 0) {
    var intensity = this._screenShake / 200
    shakeX = (Math.random() - 0.5) * this._s(8) * intensity
    shakeY = (Math.random() - 0.5) * this._s(8) * intensity
  }
  ctx.save()
  ctx.translate(shakeX, shakeY)

  // Background: always Guo Ailun photo
  if (this.bgImage) {
    ctx.drawImage(this.bgImage, 0, 0, w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.30)'
    ctx.fillRect(0, 0, w, h)
  }
  // If image not loaded yet, just black background — no gradient fallback

  this._drawCourt(ctx)
  if (this._jumpBallPhase !== 'done') this._drawReferee(ctx)
  this._drawBallShadow(ctx)
  this._drawPlayers(ctx)
  this._drawBall(ctx)
  this._drawParticles(ctx)
  this._drawScorePopups(ctx)
  this._drawUI(ctx)
  ctx.restore()
}

GameEngine.prototype._drawCourt = function(ctx) {
  var a = this.bgImage ? 0.55 : 1.0
  var fy = this._s(FLOOR_Y)
  var offP = this.poss === 0 ? this.p1 : this.p2
  var tc = offP ? (offP.teamColor || '#1a6dd4') : '#1a6dd4'

  // Wall gradient
  var wg = ctx.createLinearGradient(0, 0, 0, fy)
  wg.addColorStop(0, 'rgba(15,12,25,0.7)'); wg.addColorStop(1, 'rgba(25,18,35,0.3)')
  ctx.fillStyle = wg; ctx.fillRect(0, 0, this.w, fy)

  // Crowd silhouettes
  var t = Date.now() * 0.0005
  for (var i = 0; i < 40; i++) {
    var cx2 = i * this._s(26) + this._s(6), cr = this._s(7 + (i % 3) * 2)
    ctx.fillStyle = 'rgba(40,35,60,' + (0.6 + Math.sin(t + i) * 0.15) + ')'
    ctx.beginPath(); ctx.arc(cx2, this._s(18) + Math.sin(t * 2 + i) * this._s(1.5), cr, 0, Math.PI * 2); ctx.fill()
  }

  // Floor
  var fg = ctx.createLinearGradient(0, fy, 0, this.h)
  fg.addColorStop(0, this._rgba('#c89450', a)); fg.addColorStop(0.3, this._rgba('#b07838', a))
  fg.addColorStop(1, this._rgba('#7a4520', a))
  ctx.fillStyle = fg; ctx.fillRect(0, fy, this.w, this.h - fy)

  // Wood grain
  for (var gx = 0; gx < this.w; gx += this._s(55)) {
    ctx.fillStyle = (Math.floor(gx / this._s(55)) % 2) ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'
    ctx.fillRect(gx, fy, this._s(55), this.h - fy)
  }

  // Team-colored key
  ctx.fillStyle = this._rgba(tc, 0.18 * a)
  ctx.fillRect(this._s(720), fy, this._s(220), this._s(80))
  ctx.strokeStyle = this._rgba(tc, 0.4 * a); ctx.lineWidth = this._s(2.5)
  ctx.strokeRect(this._s(720), fy, this._s(220), this._s(80))

  // Lines
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = this._s(2)
  ctx.beginPath(); ctx.moveTo(this._s(940), fy); ctx.lineTo(this._s(940), this.h); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(this._s(15), fy); ctx.lineTo(this._s(960), fy); ctx.stroke()
  ctx.setLineDash([this._s(7), this._s(3)]); ctx.lineWidth = this._s(1.5)
  ctx.beginPath(); ctx.arc(this._s(RIM_X), fy, this._s(290), 0, Math.PI, true); ctx.stroke()
  ctx.setLineDash([])

  // Pole
  var pg = ctx.createLinearGradient(this._s(930), 0, this._s(937), 0)
  pg.addColorStop(0, '#666'); pg.addColorStop(0.5, '#999'); pg.addColorStop(1, '#444')
  ctx.fillStyle = pg; ctx.fillRect(this._s(930), this._s(110), this._s(7), fy - this._s(110))

  // Glass backboard
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(this._s(898), this._s(115), this._s(13), this._s(140))
  ctx.strokeStyle = '#222'; ctx.lineWidth = this._s(2); ctx.strokeRect(this._s(898), this._s(115), this._s(13), this._s(140))
  ctx.strokeStyle = '#d00'; ctx.lineWidth = this._s(1.5); ctx.strokeRect(this._s(900), this._s(152), this._s(7), this._s(48))

  // Backboard with glass effect
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillRect(this._s(898), this._s(118), this._s(14), this._s(142))
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 2.5
  ctx.strokeRect(this._s(898), this._s(118), this._s(14), this._s(142))
  // Inner target square
  ctx.strokeStyle = '#e00000'
  ctx.lineWidth = 2
  ctx.strokeRect(this._s(900), this._s(155), this._s(8), this._s(50))

  var rimX = this._s(RIM_X), rimY = this._s(RIM_Y), rimWR = this._s(RIM_R), rimHR = this._s(RIM_R) * 0.28

  // ---- Rim shadow on backboard ----
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.beginPath(); ctx.ellipse(rimX + this._s(1), rimY + this._s(3), rimWR * 1.05, rimHR * 1.2, 0, 0, Math.PI * 2); ctx.fill()

  // ---- Rim glow when scored ----
  if (this.scoredAnim > 0) {
    var glowAlpha = this.scoredAnim / 1200 * 0.3
    ctx.strokeStyle = 'rgba(255,200,0,' + glowAlpha + ')'
    ctx.lineWidth = this._s(6)
    ctx.beginPath(); ctx.ellipse(rimX, rimY, rimWR + this._s(3), rimHR + this._s(1.5), 0, 0, Math.PI * 2); ctx.stroke()
  }

  // ---- 3D Rim (side-view ellipse) ----
  // Outer ring
  ctx.strokeStyle = '#772211'; ctx.lineWidth = this._s(3.5)
  ctx.beginPath(); ctx.ellipse(rimX, rimY, rimWR + this._s(0.5), rimHR + this._s(0.2), 0, 0, Math.PI * 2); ctx.stroke()
  // Main rim ring (red-orange gradient)
  var rimGrad = ctx.createLinearGradient(rimX, rimY - rimHR - this._s(1), rimX, rimY + rimHR + this._s(1))
  rimGrad.addColorStop(0, '#ff5533'); rimGrad.addColorStop(0.3, '#ff2200'); rimGrad.addColorStop(0.6, '#dd1100'); rimGrad.addColorStop(1, '#990000')
  ctx.strokeStyle = rimGrad; ctx.lineWidth = this._s(2.5)
  ctx.beginPath(); ctx.ellipse(rimX, rimY, rimWR, rimHR, 0, 0, Math.PI * 2); ctx.stroke()
  // Inner highlight
  ctx.strokeStyle = 'rgba(255,180,140,0.5)'; ctx.lineWidth = this._s(0.8)
  ctx.beginPath(); ctx.ellipse(rimX - this._s(0.5), rimY - this._s(0.5), rimWR - this._s(0.6), rimHR - this._s(0.3), 0, -Math.PI * 0.55, -Math.PI * 0.05); ctx.stroke()

  // ---- Net (short, thick visible white cords) ----
  var netDepth = this._s(38)
  var netBotX = rimX, netBotY = rimY + netDepth
  var netBotW = this._s(14)

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.beginPath()
  ctx.moveTo(rimX - rimWR, rimY); ctx.lineTo(netBotX - netBotW, netBotY)
  ctx.lineTo(netBotX + netBotW, netBotY); ctx.lineTo(rimX + rimWR, rimY)
  ctx.closePath(); ctx.fill()

  var swish = 0
  if (this.scoredAnim > 0) {
    swish = Math.sin(this.scoredAnim * 0.06) * this._s(5) * Math.min(1, this.scoredAnim / 700)
  }

  var netCords = 10
  // Horizontal rings (4 levels, getting narrower)
  for (var ringLvl = 0; ringLvl < 4; ringLvl++) {
    var frac = (ringLvl + 1) / 5
    var ringY = rimY + netDepth * frac
    var ringWR = rimWR * (1 - frac * 0.55)
    var ringHR = rimHR * (1 - frac * 0.6)
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 + 0.15 * (1 - frac)) + ')'
    ctx.lineWidth = this._s(1.0)
    ctx.beginPath(); ctx.ellipse(rimX, ringY, ringWR, Math.max(ringHR, this._s(2)), 0, 0, Math.PI * 2); ctx.stroke()
  }

  // Vertical cords (thick white lines)
  for (var ci = 0; ci < netCords; ci++) {
    var ca = (ci / netCords) * Math.PI * 2
    var topX = rimX + Math.cos(ca) * rimWR * 0.95
    var topY = rimY + Math.sin(ca) * rimHR * 0.5
    var botX = rimX + swish * 0.15 + Math.cos(ca + swish * 0.02) * netBotW * 0.8
    var botY = netBotY + swish * 0.2
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.08 * Math.sin(ca)) + ')'
    ctx.lineWidth = this._s(1.0)
    ctx.beginPath()
    ctx.moveTo(topX, topY)
    var cpX = (topX + botX) / 2 + swish * (ci % 3 === 0 ? 0.5 : ci % 3 === 1 ? -0.4 : 0.05)
    var cpY = (topY + botY) / 2 - this._s(2) - Math.abs(swish) * 0.2
    ctx.quadraticCurveTo(cpX, cpY, botX, botY)
    ctx.stroke()
  }
}

GameEngine.prototype._drawReferee = function(ctx) {
  var rx = this._s(500), rr = this._s(22)
  var floorY = this._s(FLOOR_Y)
  var ry = floorY // feet on floor
  var bob = Math.sin(Date.now() * 0.003) * this._s(1.5)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath(); ctx.ellipse(rx, floorY, rr * 0.5, rr * 0.1, 0, 0, Math.PI * 2); ctx.fill()

  // Legs (black pants)
  ctx.fillStyle = '#222'
  ctx.fillRect(rx - rr * 0.4, ry - rr * 1.8, rr * 0.28, rr * 1.8)
  ctx.fillRect(rx + rr * 0.12, ry - rr * 1.8, rr * 0.28, rr * 1.8)

  // Shoes
  ctx.fillStyle = '#111'
  ctx.beginPath(); ctx.ellipse(rx - rr * 0.26, ry - rr * 0.02, rr * 0.28, rr * 0.08, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(rx + rr * 0.26, ry - rr * 0.02, rr * 0.28, rr * 0.08, 0, 0, Math.PI * 2); ctx.fill()

  // Body (striped shirt)
  ctx.fillStyle = '#ddd'
  ctx.fillRect(rx - rr * 0.6, ry - rr * 3.8 + bob, rr * 1.2, rr * 2.2)
  // Black stripes
  ctx.fillStyle = '#111'
  ctx.fillRect(rx - rr * 0.6, ry - rr * 3.8 + bob, rr * 1.2, rr * 0.45)
  ctx.fillRect(rx - rr * 0.6, ry - rr * 2.7 + bob, rr * 1.2, rr * 0.45)

  // Left arm (down)
  ctx.strokeStyle = '#d4a574'; ctx.lineWidth = this._s(2.8)
  ctx.beginPath(); ctx.moveTo(rx - rr * 0.5, ry - rr * 3.2 + bob); ctx.lineTo(rx - rr * 1.0, ry - rr * 2.2 + bob); ctx.stroke()

  // Right arm (raised, tossing ball)
  ctx.beginPath(); ctx.moveTo(rx + rr * 0.5, ry - rr * 3.4 + bob); ctx.lineTo(rx + rr * 0.6, ry - rr * 5.0 + bob); ctx.stroke()

  // Ball in hand (during countdown and raise phases)
  if (this._jumpBallPhase === 'countdown' || this._jumpBallPhase === 'raise') {
    ctx.fillStyle = '#ff8c00'
    ctx.beginPath(); ctx.arc(rx + rr * 0.6, ry - rr * 5.2 + bob, rr * 0.4, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#884400'; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.arc(rx + rr * 0.6, ry - rr * 5.2 + bob, rr * 0.4, 0, Math.PI * 2); ctx.stroke()
  }

  // Head
  ctx.fillStyle = '#d4a574'
  ctx.beginPath(); ctx.arc(rx, ry - rr * 4.4 + bob, rr * 0.8, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#b8936e'; ctx.lineWidth = this._s(1)
  ctx.beginPath(); ctx.arc(rx, ry - rr * 4.4 + bob, rr * 0.8, 0, Math.PI * 2); ctx.stroke()

  // Hair
  ctx.fillStyle = '#333'
  ctx.beginPath(); ctx.arc(rx, ry - rr * 4.35 + bob, rr * 0.82, Math.PI, 0); ctx.fill()

  // Whistle
  ctx.fillStyle = '#ccc'
  ctx.beginPath(); ctx.arc(rx, ry - rr * 3.9 + bob, rr * 0.15, 0, Math.PI * 2); ctx.fill()

  // Label
  ctx.fillStyle = '#ffd700'
  ctx.font = 'bold ' + Math.floor(rr * 0.6) + 'px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('REFEREE', rx, ry + rr * 0.5)
}

GameEngine.prototype._drawBallShadow = function(ctx) {
  if (!this.ballInAir) return
  var bx = this.ball.x, by = this.ball.y
  var floorY = this._s(FLOOR_Y)
  var alpha = 0.1 + (by / this._s(COURT_H)) * 0.2
  var shadowScale = 0.5 + (by / this._s(COURT_H)) * 0.3
  ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')'
  ctx.beginPath()
  ctx.ellipse(bx, floorY, this.ball.r * shadowScale, this.ball.r * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
}

GameEngine.prototype._drawPlayers = function(ctx) {
  var o = this.getOffPlayer(), d = this.getDefPlayer()
  var offVis = this.poss === 0 ? this._p1Vis : this._p2Vis
  var defVis = this.poss === 0 ? this._p2Vis : this._p1Vis
  var offColor = o ? o.teamColor || '#1a6dd4' : '#1a6dd4'
  var defColor = d ? d.teamColor || '#e03030' : '#e03030'

  // Defender first (behind)
  var defPose = this.blockAnim > 0 ? 'block' : 'defense'
  this._drawPlayer(ctx, this.def, d, defColor, '守', defPose, defVis)

  // Offense
  var offPose = 'idle'
  if (this._jumpType === 'dunk' && (this.shooting || this.shotReleased)) offPose = 'dunk'
  else if (this.shooting || (this.shotReleased && this.shotResult)) offPose = 'shoot'
  else if (this.driveAnim > 0) offPose = 'drive'
  else if (this.ball.has && !this.ballInAir) offPose = 'dribble'
  this._drawPlayer(ctx, this.off, o, offColor, '攻', offPose, offVis)

  // Block jump effect
  if (this.blockAnim > 0) {
    var bp = this.blockAnim / 500
    ctx.strokeStyle = 'rgba(255,200,0,' + (0.5 * (1 - bp)) + ')'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(this.def.x, this.def.y - this.def.r - bp * this._s(60), this._s(18) * (1 + bp), 0, Math.PI * 2)
    ctx.stroke()
  }

  // Drive trail
  if (this.driveAnim > 0) {
    ctx.fillStyle = 'rgba(0,136,255,0.12)'
    for (var ti = 0; ti < 4; ti++) {
      ctx.beginPath()
      ctx.arc(this.off.x + this.off.r - ti * this._s(12), this.off.y, this._s(18) * (1 - ti * 0.2), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

GameEngine.prototype._drawPlayer = function(ctx, p, data, color, label, pose, vis) {
  if (!data) return
  var cx = p.x, cy = p.y, r = p.r
  if (!vis) vis = { size: 1, build: 1, skin: 3, hair: 2, acc: 0 }

  // ---- Jump (dynamic from engine state machine) ----
  var jumpY = 0
  if (pose === 'block' && this._jumpType === 'block') jumpY = this._s(this._jumpY)
  else if (pose === 'shoot' && this._jumpType === 'shoot') jumpY = this._s(this._jumpY)
  else if (pose === 'dunk' && this._jumpType === 'dunk') jumpY = this._s(this._jumpY)
  else if (pose === 'shoot' && this._jumpType === 'layup') jumpY = this._s(this._jumpY)

  // ---- Lean (dribble = forward, fadeaway = backward) ----
  var leanX = 0
  if (pose === 'dribble') leanX = r * 0.15
  if (pose === 'shoot' && this._fadeaway) leanX = -r * 0.55

  // ---- Skin tones ----
  var skins = [
    { b: '#f5d5b8', d: '#d4a87c', l: '#fdf0e5' },
    { b: '#f0c8a0', d: '#c8946a', l: '#fae8d5' },
    { b: '#e8b88a', d: '#c08060', l: '#f5dcc8' },
    { b: '#d4a574', d: '#a87050', l: '#e8c8a8' },
    { b: '#c08a5a', d: '#8a5535', l: '#d8b898' },
    { b: '#a06840', d: '#704020', l: '#c89870' },
    { b: '#7a4a28', d: '#4a2810', l: '#a87050' },
  ]
  var sk = skins[vis.skin % 7]
  var st = sk.b; var sd = sk.d; var sl = sk.l

  // ---- Build ----
  var bf = 0.88 + vis.build * 0.24

  // ---- Body layout ----
  var floorY = this._s(FLOOR_Y)
  // Dribble bob: subtle vertical bounce when dribbling
  var dribbleBob = (pose === 'dribble') ? Math.abs(Math.sin(this._dribblePhase * 1.6)) * r * 0.04 : 0
  var footY = floorY + jumpY - dribbleBob
  var ankleY = footY - r * 0.08
  var kneeY = ankleY - r * 0.62
  var hipY = kneeY - r * 0.62
  var waistY = hipY + r * 0.06
  var bellyY = hipY - r * 0.25
  var armpitY = hipY - r * 0.82
  var shoulderY = hipY - r * 1.08
  var neckTopY = shoulderY - r * 0.18
  var headCY = neckTopY - r * 0.38
  var headR = r * 0.4
  var blw = Math.max(0.6, r * 0.03)

  // ---- Shadow ----
  var shS = 1 - Math.abs(jumpY) / (r * 4 + 1)
  if (shS < 0.15) shS = 0.15
  ctx.fillStyle = 'rgba(0,0,0,' + (0.25 * shS) + ')'
  ctx.beginPath()
  ctx.ellipse(cx, floorY, r * 0.6 * shS * bf, r * 0.08 * shS, 0, 0, Math.PI * 2)
  ctx.fill()

  // ---- Leg positions ----
  var lHX, lKX, lAX, rHX, rKX, rAX, lKneeY = kneeY, rKneeY = kneeY
  if (pose === 'defense') {
    // Defense stance with subtle shuffle animation
    var defMoving = Math.abs(this.defInput.mx) > 0.05 || Math.abs(this.defInput.my) > 0.05
    var defT = defMoving ? Math.sin(this._runPhase * 1.5) * r * 0.08 : 0
    lHX = cx - r * 0.2 * bf; lKX = cx - r * 0.32 * bf + defT; lAX = cx - r * 0.5 * bf + defT * 1.2
    rHX = cx + r * 0.2 * bf; rKX = cx + r * 0.32 * bf - defT; rAX = cx + r * 0.5 * bf - defT * 1.2
    lKneeY = kneeY - Math.abs(defT) * 0.5; rKneeY = kneeY - Math.abs(defT) * 0.5
  } else if (pose === 'drive') {
    lHX = cx - r * 0.18 * bf; lKX = cx - r * 0.12 * bf; lAX = cx - r * 0.25 * bf
    rHX = cx + r * 0.22 * bf; rKX = cx + r * 0.32 * bf; rAX = cx + r * 0.5 * bf
  } else {
    // Running animation: legs swing forward/back + slightly lift
    var isMoving = pose === 'dribble' && (Math.abs(this.offInput.mx) > 0.05 || Math.abs(this.offInput.my) > 0.05)
    var runT = isMoving ? Math.sin(this._runPhase) : 0
    var stride = isMoving ? r * 0.2 : 0
    var lift = isMoving ? r * 0.08 : 0
    lHX = cx - r * 0.16 * bf
    lKX = cx - r * 0.18 * bf + runT * stride
    lAX = cx - r * 0.25 * bf + runT * stride * 1.5
    lKneeY = kneeY - Math.abs(runT) * lift
    rHX = cx + r * 0.16 * bf
    rKX = cx + r * 0.18 * bf - runT * stride
    rAX = cx + r * 0.25 * bf - runT * stride * 1.5
    rKneeY = kneeY - Math.abs(runT) * lift
  }

  var lKY = lKneeY, rKY = rKneeY

  var legW = r * 0.17 * bf

  // ---- Draw LEFT LEG (behind) ----
  // Upper leg
  ctx.fillStyle = st
  ctx.beginPath(); ctx.moveTo(lHX - legW * 0.7, hipY); ctx.lineTo(lKX - legW * 0.6, lKY); ctx.lineTo(lKX + legW * 0.6, lKY); ctx.lineTo(lHX + legW * 0.7, hipY); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
  // Lower leg
  ctx.fillStyle = st
  ctx.beginPath(); ctx.moveTo(lKX - legW * 0.6, lKY); ctx.lineTo(lAX - legW * 0.5, ankleY); ctx.lineTo(lAX + legW * 0.5, ankleY); ctx.lineTo(lKX + legW * 0.6, lKY); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
  // Shoe
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath(); ctx.ellipse(lAX, ankleY + r * 0.06, r * 0.22, r * 0.09, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#333'
  ctx.beginPath(); ctx.ellipse(lAX, ankleY + r * 0.1, r * 0.16, r * 0.05, 0, Math.PI, 0); ctx.fill()
  // Sock
  ctx.fillStyle = '#fff'
  ctx.fillRect(lAX - legW * 0.65, ankleY - r * 0.14, legW * 1.3, r * 0.16)

  // ---- DRAW SHORTS ----
  var sTop = hipY - r * 0.06
  var sBot = hipY + r * 0.32
  var sFlare = r * 0.08 * bf
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.42 * bf, sTop); ctx.lineTo(cx - r * 0.5 * bf - sFlare, sBot); ctx.lineTo(cx + r * 0.5 * bf + sFlare, sBot); ctx.lineTo(cx + r * 0.42 * bf, sTop)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = blw; ctx.stroke()
  // Waistband
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(cx - r * 0.43 * bf, sTop - r * 0.03, r * 0.86 * bf, r * 0.06)

  // ---- Draw RIGHT LEG (front) ----
  // Upper leg
  ctx.fillStyle = st
  ctx.beginPath(); ctx.moveTo(rHX - legW * 0.7, hipY); ctx.lineTo(rKX - legW * 0.6, rKY); ctx.lineTo(rKX + legW * 0.6, rKY); ctx.lineTo(rHX + legW * 0.7, hipY); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
  // Lower leg
  ctx.fillStyle = st
  ctx.beginPath(); ctx.moveTo(rKX - legW * 0.6, rKY); ctx.lineTo(rAX - legW * 0.5, ankleY); ctx.lineTo(rAX + legW * 0.5, ankleY); ctx.lineTo(rKX + legW * 0.6, rKY); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
  // Shoe
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath(); ctx.ellipse(rAX, ankleY + r * 0.06, r * 0.22, r * 0.09, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#333'
  ctx.beginPath(); ctx.ellipse(rAX, ankleY + r * 0.1, r * 0.16, r * 0.05, 0, Math.PI, 0); ctx.fill()
  // Sock
  ctx.fillStyle = '#fff'
  ctx.fillRect(rAX - legW * 0.65, ankleY - r * 0.14, legW * 1.3, r * 0.16)

  // ---- UPPER BODY (lean applied) ----
  ctx.save()
  ctx.translate(leanX, 0)

  // ---- JERSEY ----
  var jBot = hipY + r * 0.02
  var jTop = shoulderY - r * 0.02
  var jMid = (jTop + jBot) / 2
  var jW = r * 0.46 * bf

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.22 * bf, jTop)
  ctx.lineTo(cx - jW, armpitY); ctx.lineTo(cx - r * 0.42 * bf, waistY); ctx.lineTo(cx - r * 0.38 * bf, jBot)
  ctx.lineTo(cx + r * 0.38 * bf, jBot)
  ctx.lineTo(cx + r * 0.42 * bf, waistY); ctx.lineTo(cx + jW, armpitY); ctx.lineTo(cx + r * 0.22 * bf, jTop)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = blw; ctx.stroke()

  // V-neck
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.22 * bf, jTop); ctx.lineTo(cx, jTop + r * 0.15); ctx.lineTo(cx + r * 0.22 * bf, jTop)
  ctx.lineTo(cx + r * 0.28 * bf, jTop + r * 0.01); ctx.lineTo(cx, jTop + r * 0.22); ctx.lineTo(cx - r * 0.28 * bf, jTop + r * 0.01)
  ctx.closePath(); ctx.fill()

  // Side stripe
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(cx - r * 0.35 * bf, jTop + r * 0.2, r * 0.06, jBot - jTop - r * 0.35)
  ctx.fillRect(cx + r * 0.29 * bf, jTop + r * 0.2, r * 0.06, jBot - jTop - r * 0.35)

  // ---- NUMBER ----
  ctx.fillStyle = '#fff'
  ctx.font = 'bold ' + Math.floor(r * 0.58) + 'px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(data.num || '?', cx, (jTop + bellyY) / 2)

  // ---- ARMS ----
  var armW = r * 0.15 * bf
  var lEX, lEY, lHndX, lHndY, rEX, rEY, rHndX, rHndY

  if (pose === 'dunk') {
    // Dunk: one arm fully extended straight up holding ball above head
    rEX = cx + r * 0.05; rEY = shoulderY - r * 1.6; rHndX = cx - r * 0.05; rHndY = shoulderY - r * 2.9
    lEX = cx - r * 0.25; lEY = shoulderY - r * 0.5; lHndX = cx - r * 0.5; lHndY = shoulderY - r * 0.8
  } else if (pose === 'shoot') {
    // Shooting arm raised high overhead, guide hand at ball side
    rEX = cx + r * 0.15; rEY = shoulderY - r * 1.0; rHndX = cx + r * 0.1; rHndY = shoulderY - r * 2.1
    lEX = cx - r * 0.22; lEY = shoulderY - r * 0.8; lHndX = cx - r * 0.12; lHndY = shoulderY - r * 1.95
  } else if (pose === 'block') {
    // Both arms fully extended straight up
    rEX = cx + r * 0.08; rEY = shoulderY - r * 1.2; rHndX = cx + r * 0.02; rHndY = shoulderY - r * 2.4
    lEX = cx - r * 0.08; lEY = shoulderY - r * 1.2; lHndX = cx - r * 0.02; lHndY = shoulderY - r * 2.4
  } else if (pose === 'dribble') {
    rEX = cx + r * 0.25; rEY = shoulderY + r * 0.15; rHndX = cx + r * 0.3; rHndY = shoulderY + r * 0.65
    lEX = cx - r * 0.28; lEY = shoulderY - r * 0.15; lHndX = cx - r * 0.45; lHndY = shoulderY + r * 0.05
  } else if (pose === 'drive') {
    rEX = cx + r * 0.3; rEY = shoulderY - r * 0.08; rHndX = cx + r * 0.6; rHndY = shoulderY - r * 0.35
    lEX = cx - r * 0.3; lEY = shoulderY + r * 0.15; lHndX = cx - r * 0.5; lHndY = shoulderY + r * 0.4
  } else if (pose === 'defense') {
    rEX = cx + r * 0.35; rEY = shoulderY + r * 0.02; rHndX = cx + r * 0.85; rHndY = shoulderY - r * 0.18
    lEX = cx - r * 0.35; lEY = shoulderY + r * 0.02; lHndX = cx - r * 0.85; lHndY = shoulderY - r * 0.18
  } else {
    rEX = cx + r * 0.25; rEY = shoulderY + r * 0.1; rHndX = cx + r * 0.42; rHndY = shoulderY + r * 0.4
    lEX = cx - r * 0.25; lEY = shoulderY + r * 0.1; lHndX = cx - r * 0.42; lHndY = shoulderY + r * 0.4
  }

  // Function to draw a single arm
  var drawArm = function(ex, ey, hx, hy, side) {
    var shX = cx + side * r * 0.2 * bf
    ctx.fillStyle = st
    ctx.beginPath()
    ctx.moveTo(shX, shoulderY - armW * 0.4); ctx.lineTo(ex - armW * 0.5, ey); ctx.lineTo(ex + armW * 0.5, ey); ctx.lineTo(shX, shoulderY + armW * 0.4)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
    ctx.fillStyle = st
    ctx.beginPath()
    ctx.moveTo(ex - armW * 0.45, ey); ctx.lineTo(hx - armW * 0.4, hy); ctx.lineTo(hx + armW * 0.4, hy); ctx.lineTo(ex + armW * 0.45, ey)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
    ctx.fillStyle = st
    ctx.beginPath(); ctx.arc(hx, hy, r * 0.1, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
  }

  drawArm(lEX, lEY, lHndX, lHndY, -1)
  drawArm(rEX, rEY, rHndX, rHndY, 1)

  // ---- NECK ----
  ctx.fillStyle = st
  ctx.fillRect(cx - r * 0.11 * bf, neckTopY, r * 0.22 * bf, shoulderY - neckTopY + r * 0.02)

  // ---- HEAD ----
  var headGrad = ctx.createRadialGradient(cx, headCY - headR * 0.1, headR * 0.3, cx, headCY, headR)
  headGrad.addColorStop(0, sl); headGrad.addColorStop(0.7, st); headGrad.addColorStop(1, sd)
  ctx.fillStyle = headGrad
  ctx.beginPath(); ctx.arc(cx, headCY, headR, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()

  // ---- HAIR (3 styles) ----
  var hairColor = vis.skin >= 5 ? '#0a0a0a' : '#1a1a1a'
  ctx.fillStyle = hairColor
  if (vis.hair === 0 || vis.hair === 3) {
    // Short
    ctx.beginPath(); ctx.arc(cx, headCY - headR * 0.08, headR * 1.02, Math.PI, 0); ctx.fill()
  } else if (vis.hair === 1 || vis.hair === 4) {
    // Flat top
    ctx.fillRect(cx - headR * 1.02, headCY - headR * 1.02, headR * 2.04, headR * 0.55)
    ctx.beginPath(); ctx.arc(cx, headCY - headR * 0.05, headR * 1.02, Math.PI, 0); ctx.fill()
  } else {
    // Curly
    ctx.beginPath()
    ctx.arc(cx, headCY - headR * 0.05, headR * 1.12, Math.PI, 0)
    ctx.lineTo(cx + headR * 1.12, headCY - headR * 0.05)
    ctx.arc(cx, headCY - headR * 0.05, headR * 1.12, 0, Math.PI)
    ctx.closePath(); ctx.fill()
  }

  // ---- Face ----
  // Eyebrows
  ctx.strokeStyle = hairColor; ctx.lineWidth = Math.max(0.8, r * 0.06); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx - headR * 0.45, headCY - headR * 0.3); ctx.lineTo(cx - headR * 0.08, headCY - headR * 0.22); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + headR * 0.45, headCY - headR * 0.3); ctx.lineTo(cx + headR * 0.08, headCY - headR * 0.22); ctx.stroke()

  // Eyes
  var eyeSY = headCY - headR * 0.05
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.ellipse(cx - headR * 0.27, eyeSY, headR * 0.18, headR * 0.14, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(cx + headR * 0.27, eyeSY, headR * 0.18, headR * 0.14, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath(); ctx.arc(cx - headR * 0.25, eyeSY, headR * 0.09, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + headR * 0.29, eyeSY, headR * 0.09, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(cx - headR * 0.27, eyeSY - headR * 0.04, headR * 0.035, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + headR * 0.27, eyeSY - headR * 0.04, headR * 0.035, 0, Math.PI * 2); ctx.fill()

  // Nose
  ctx.strokeStyle = sd; ctx.lineWidth = blw + 0.2
  ctx.beginPath(); ctx.moveTo(cx, headCY - headR * 0.1); ctx.lineTo(cx, headCY + headR * 0.15); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx - headR * 0.06, headCY + headR * 0.15, headR * 0.07, 0.1, Math.PI - 0.1); ctx.stroke()

  // Mouth
  ctx.strokeStyle = '#b87060'; ctx.lineWidth = Math.max(0.5, r * 0.03)
  ctx.beginPath(); ctx.arc(cx, headCY + headR * 0.28, headR * 0.16, 0.15, Math.PI - 0.15); ctx.stroke()

  // ---- HEADBAND ----
  if (data.num && data.num >= 10) {
    var hbTop = headCY - headR * 0.85
    ctx.fillStyle = '#fff'
    ctx.fillRect(cx - headR * 0.95, hbTop, headR * 1.9, headR * 0.12)
    ctx.beginPath()
    ctx.moveTo(cx + headR * 0.85, hbTop + headR * 0.02); ctx.lineTo(cx + headR * 1.05, hbTop - headR * 0.1); ctx.lineTo(cx + headR * 0.88, hbTop + headR * 0.08)
    ctx.closePath(); ctx.fill()
  }

  // ---- NAME ----
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = 'bold ' + Math.floor(r * 0.3) + 'px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText(data.name || '', cx, footY + this._s(3))

  // ---- POSSESSION INDICATOR ----
  if (this.ball.has) {
    var indY = headCY - headR - this._s(12)
    var indW = r * 0.55; var indH = r * 0.24
    var indColor = label === '攻' ? '#ffaa00' : '#ff5555'
    ctx.fillStyle = indColor
    ctx.beginPath()
    this._roundRect(ctx, cx - indW / 2, indY, indW, indH, r * 0.12)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold ' + Math.floor(r * 0.26) + 'px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label === '攻' ? '进攻' : '防守', cx, indY + indH / 2)
  }

  ctx.restore()
}

GameEngine.prototype._rgba = function(hex, alpha) {
  var r, g, b
  if (hex[0] === '#') {
    r = parseInt(hex.substr(1, 2), 16)
    g = parseInt(hex.substr(3, 2), 16)
    b = parseInt(hex.substr(5, 2), 16)
  } else { return hex }
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

GameEngine.prototype._darken = function(hex, amount) {
  var r, g, b
  if (hex[0] === '#') {
    r = parseInt(hex.substr(1, 2), 16)
    g = parseInt(hex.substr(3, 2), 16)
    b = parseInt(hex.substr(5, 2), 16)
  } else { return hex }
  r = Math.floor(r * (1 - amount))
  g = Math.floor(g * (1 - amount))
  b = Math.floor(b * (1 - amount))
  return 'rgb(' + r + ',' + g + ',' + b + ')'
}

GameEngine.prototype._lighten = function(hex, amount) {
  var r, g, b
  if (hex[0] === '#') {
    r = parseInt(hex.substr(1, 2), 16)
    g = parseInt(hex.substr(3, 2), 16)
    b = parseInt(hex.substr(5, 2), 16)
  } else { return hex }
  r = Math.min(255, Math.floor(r + (255 - r) * amount))
  g = Math.min(255, Math.floor(g + (255 - g) * amount))
  b = Math.min(255, Math.floor(b + (255 - b) * amount))
  return 'rgb(' + r + ',' + g + ',' + b + ')'
}

GameEngine.prototype._roundRect = function(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x + r, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

GameEngine.prototype._drawBall = function(ctx) {
  var bx = this.ball.x, by = this.ball.y, br = this.ball.r

  // Loose ball glow
  if (this.ballLoose) {
    var pulse = 0.5 + 0.5 * Math.sin(Date.now() / 250)
    ctx.strokeStyle = 'rgba(0,255,136,' + (0.3 + pulse * 0.4) + ')'
    ctx.lineWidth = 3 + pulse * 2
    ctx.beginPath()
    ctx.arc(bx, by, br + this._s(8) + pulse * this._s(4), 0, Math.PI * 2)
    ctx.stroke()
  }

  // Trail
  if (this.ballInAir) {
    for (var i = 0; i < this._trail.length; i++) {
      var t = this._trail[i]
      var alpha = t.life / 300 * 0.25
      if (alpha > 0) {
        ctx.fillStyle = 'rgba(255,140,0,' + alpha + ')'
        ctx.beginPath(); ctx.arc(t.x, t.y, br * 0.5, 0, Math.PI * 2); ctx.fill()
      }
    }
  }

  // Ball shadow on floor
  if (this.ballInAir) {
    var shAlpha = 0.08 + (by / this._s(COURT_H)) * 0.1
    ctx.fillStyle = 'rgba(0,0,0,' + shAlpha + ')'
    ctx.beginPath()
    ctx.ellipse(bx, this._s(FLOOR_Y - 2), br * 0.7, br * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Ball body with orange gradient
  var grad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.35, br * 0.1, bx, by, br)
  grad.addColorStop(0, '#ffbb44')
  grad.addColorStop(0.6, '#ee8811')
  grad.addColorStop(1, '#bb5500')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#884400'; ctx.lineWidth = 1.2; ctx.stroke()

  // Ball seams (rotating)
  ctx.save()
  ctx.translate(bx, by)
  ctx.rotate(this.ball.rot || 0)
  ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 0.9
  // Horizontal seam
  ctx.beginPath(); ctx.moveTo(-br * 0.95, 0); ctx.lineTo(br * 0.95, 0); ctx.stroke()
  // Vertical seam
  ctx.beginPath(); ctx.moveTo(0, -br * 0.95); ctx.lineTo(0, br * 0.95); ctx.stroke()
  // Curved seams
  ctx.beginPath(); ctx.arc(0, 0, br * 0.55, -0.6, 0.6); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, br * 0.55, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke()
  ctx.restore()

  // Ball highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.25, 0, Math.PI * 2)
  ctx.fill()
}

GameEngine.prototype._drawParticles = function(ctx) {
  for (var i = 0; i < this._particles.length; i++) {
    var pt = this._particles[i]
    var alpha = pt.life / 700
    if (alpha > 0) {
      ctx.fillStyle = pt.color; ctx.globalAlpha = alpha
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

GameEngine.prototype._drawScorePopups = function(ctx) {
  for (var i = 0; i < this._scorePopups.length; i++) {
    var p = this._scorePopups[i]
    var alpha = Math.min(1, p.life / 600)
    var scale = 1 + (1 - p.life / p.maxLife) * 0.5
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(p.x, p.y)
    ctx.scale(scale, scale)
    ctx.font = 'bold ' + this._s(22) + 'px sans-serif'
    ctx.fillStyle = '#ffd700'
    ctx.textAlign = 'center'
    ctx.fillText(p.text, 0, 0)
    ctx.restore()
  }
}

GameEngine.prototype._drawUI = function(ctx) {
  var w = this.w, h = this.h, s = this.s
  var p1 = this.p1, p2 = this.p2

  // === Scoreboard bar ===
  var barH = this._s(36), barY = this._s(2)
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, barY, w, barH)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, barY + barH - 1, w, 1)

  // Team colors
  var c1 = p1 ? (p1.teamColor || '#1a6dd4') : '#1a6dd4'
  var c2 = p2 ? (p2.teamColor || '#e03030') : '#e03030'
  ctx.fillStyle = c1; ctx.fillRect(this._s(4), barY + this._s(3), this._s(3), barH - this._s(6))
  ctx.fillStyle = c2; ctx.fillRect(w - this._s(7), barY + this._s(3), this._s(3), barH - this._s(6))

  // Player names
  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.floor(this._s(11)) + 'px sans-serif'; ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'; ctx.fillText((p1 ? p1.name : 'P1'), this._s(12), barY + barH / 2)
  ctx.textAlign = 'right'; ctx.fillText((p2 ? p2.name : 'P2'), w - this._s(12), barY + barH / 2)

  // Score
  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.floor(this._s(16)) + 'px sans-serif'
  ctx.textAlign = 'center'
  var scText = this.score[0] + ' - ' + this.score[1]
  // Highlight if game point
  if (this.score[0] >= 10 || this.score[1] >= 10) ctx.fillStyle = '#ffd700'
  ctx.fillText(scText, w / 2, barY + barH / 2)

  // Shot clock & game time
  var clockX = w / 2 + this._s(40), clockY = barY + barH / 2
  var sc = Math.max(0, Math.ceil(24 - this.shotClockTimer / 1000))
  ctx.fillStyle = sc <= 5 ? '#ff4444' : 'rgba(255,255,255,0.6)'
  ctx.font = Math.floor(this._s(9)) + 'px sans-serif'
  ctx.fillText(sc + 's', clockX, clockY)
  var gm = Math.floor(Math.max(0, this.gameTimer / 1000) / 60)
  var gs = Math.floor(Math.max(0, this.gameTimer / 1000) % 60)
  ctx.fillText(gm + ':' + (gs < 10 ? '0' : '') + gs, w - this._s(50), clockY)

  // Possession indicator
  var px = this.poss === 0 ? this._s(12) : w - this._s(12)
  ctx.fillStyle = '#ff8c00'; ctx.beginPath()
  ctx.arc(px, barY + barH + this._s(8), this._s(4), 0, Math.PI * 2); ctx.fill()

  // === Score popup ===
  if (this.scoredAnim > 0 && this.shotResult) {
    var a2 = Math.min(1, this.scoredAnim / 600)
    var oy = (1200 - this.scoredAnim) / 1200 * this._s(60)
    ctx.fillStyle = this.shotResult.made ? 'rgba(255,215,0,' + a2 + ')' : 'rgba(255,100,100,' + a2 + ')'
    ctx.font = 'bold ' + Math.floor(this._s(28)) + 'px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(this.shotResult.made ? '+' + this.shotResult.pts : 'MISS', w / 2, this._s(220) - oy)
  }

  // Shot timing label
  if (this.shotReleased && this.shotResult) {
    var tc = this.shotResult.timing === '完美' ? '#ffd700' : this.shotResult.timing === '不错' ? '#0f0' : '#fff'
    ctx.fillStyle = tc; ctx.font = 'bold ' + Math.floor(this._s(13)) + 'px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(this.shotResult.timing, w / 2, this._s(250))
  }

  // Message
  if (this.msgTimer > 0) {
    var ma = Math.min(1, this.msgTimer / 300)
    ctx.fillStyle = 'rgba(255,255,255,' + ma + ')'
    ctx.font = 'bold ' + Math.floor(this._s(16)) + 'px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(this.msg, w / 2, this._s(320))
  }

  // Stamina bars (bottom corners)
  var sbW = this._s(50), sbH = this._s(4), sbY = h - this._s(20)
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(this._s(8), sbY, sbW, sbH)
  var sc2 = this.stamina / 100
  ctx.fillStyle = sc2 > 0.5 ? '#0c6' : sc2 > 0.25 ? '#fa0' : '#f44'
  ctx.fillRect(this._s(8), sbY, sbW * sc2, sbH)
}

module.exports = GameEngine
