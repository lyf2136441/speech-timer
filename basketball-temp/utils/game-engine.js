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
  this._chargePower = 0
  this._chargeZoneLo = 0.82
  this._chargeZoneHi = 0.98
  this._ballRimCooldown = 0
  // Game timer
  var dur = (opts && opts.gameDuration) ? opts.gameDuration : 120
  this.gameTime = dur
  this.gameTimer = dur * 1000
  // Scoring mode: 'alternate' (换发) or 'keep' (连发)
  this.scoringMode = (opts && opts.scoringMode) ? opts.scoringMode : 'alternate'
  this._rimStuckCounter = 0
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
  var size = 0.82 + (height - 175) / 200 * 0.7 // maps ~0.85-1.15

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
  }
}

// ==================== UPDATE ====================
GameEngine.prototype.update = function(dt) {
  if (this.gameOver) return
  dt = Math.min(dt, 33)
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
  this.offEnergy = Math.min(100, this.offEnergy + dt * 0.008)
  this.defEnergy = Math.min(100, this.defEnergy + dt * 0.008)
  // Stamina: drain while dribbling, recover when idle without ball
  if (this.ball.has) {
    var moving = Math.abs(this.offInput.mx) > 0.05 || Math.abs(this.offInput.my) > 0.05
    if (moving) this.stamina = Math.max(0, this.stamina - dt * 0.008)
  } else {
    var idle = Math.abs(this.offInput.mx) < 0.05 && Math.abs(this.offInput.my) < 0.05
    if (idle) this.stamina = Math.min(100, this.stamina + dt * 0.015)
    else this.stamina = Math.min(100, this.stamina + dt * 0.005)
  }
  this._dribblePhase += dt * 0.008
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
          // 扣篮: 球高举过头顶，随跳跃上升
          this.ball.x = this.off.x + this.off.r * 0.3
          this.ball.y = this.off.y - this.off.r * 3.8 + this._jumpY
        } else if (this._jumpType === 'layup') {
          // 上篮: 球前伸，单手挑篮
          this.ball.x = this.off.x + this.off.r * 0.8
          this.ball.y = this.off.y - this.off.r * 2.8 + this._jumpY
        } else {
          this.ball.x = this.off.x + this.off.r * 0.1
          this.ball.y = this.off.y - this.off.r * 3.2 + this._jumpY
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

  // Rim collision
  var dx = bx - rx, dy = by - ry
  var dist = Math.sqrt(dx * dx + dy * dy)
  var collR = rr + br + this._s(2)
  if (dist < collR && this._ballRimCooldown <= 0) {
    // Scoring: ball falling through rim (generous zone)
    if (this.ball.vy > 0.1 && by > ry - this._s(6) && Math.abs(dx) < rr * 2.3) {
      this._score(); return
    }
    this._rimStuckCounter++
    if (dist < 0.01) dist = 0.01
    var nx = dx / dist, ny = dy / dist
    // Strong reflect off rim
    var dot = this.ball.vx * nx + this.ball.vy * ny
    this.ball.vx -= 1.9 * dot * nx
    this.ball.vy -= 1.9 * dot * ny
    this.ball.vx *= 0.45; this.ball.vy *= 0.45
    // Push out firmly
    var pushOut = collR - dist + 8
    this.ball.x += nx * pushOut
    this.ball.y += ny * pushOut
    // Stuck detection: after 3 rim hits, force eject sideways
    if (this._rimStuckCounter >= 3) {
      this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 5 + 6)
      this.ball.vy = -(Math.random() * 4 + 4)
      this._rimStuckCounter = 0
    } else if (spd < 3.5) {
      // Slide-off: ball nearly resting on rim, give it a nudge
      this.ball.vy = -(Math.random() * 3 + 2.5)
      this.ball.vx = (Math.random() - 0.5) * 4.5
    }
    this._ballRimCooldown = 80
    this._spawnParticles(bx, by, '#ff8c00', 3)
  }
  if (this._ballRimCooldown > 0) this._ballRimCooldown -= dt

  // Slide-off detection: ball moving slowly right above rim
  if (this._ballRimCooldown <= 0 && dist < collR + this._s(8) && this.ball.vy > -0.5 && this.ball.vy < 2 && spd < 1.5 && by < ry) {
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

  // Out of bounds
  if (bx < this._s(-30) || bx > this._s(960) || by > this._s(480) || by < this._s(-150)) {
    this._chg('球出界！')
  }

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
  var floor = this._s(FLOOR_Y - 20)
  var maxX = this._s(930), minX = this._s(30)
  var maxY = floor, minY = this._s(180)

  // Offense (X-primary movement)
  var staminaMod = this.stamina < 20 ? 0.55 + (this.stamina / 20) * 0.45 : 1.0
  var os = this._offSp * staminaMod
  if (this.driveAnim > 0) os = 4.5
  var omx = this.offInput.mx, omy = this.offInput.my
  if (this.driveAnim > 0) omx = this.offInput.mx || 1
  // During jump air phase (rising/falling), can't change direction
  var inAir = this._jumpPhase === 'rising' || this._jumpPhase === 'hang' || this._jumpPhase === 'falling'
  if (inAir && this._jumpType === 'shoot') {
    omx = this._jumpMx; omy = this._jumpMy
    os = os * 0.3
  }
  if (omx !== 0 || omy !== 0) {
    var om = Math.sqrt(omx * omx + omy * omy) || 1
    this.off.x += omx / om * os * (dt / 16)
    this.off.y += omy / om * os * 0.5 * (dt / 16)
  }

  // Defense (AI follow - X primary)
  var dmx = this.defInput.mx || 0, dmy = this.defInput.my || 0
  if (this.ballLoose) {
    var bdx = this.ball.x - this.def.x, bdy = this.ball.y - this.def.y
    var bd = Math.sqrt(bdx * bdx + bdy * bdy)
    if (bd > 0) { dmx += bdx / bd * 1.2; dmy += bdy / bd * 0.8 }
  } else {
    var tx = this.off.x - this.def.x, ty = this.off.y - this.def.y
    var td = Math.sqrt(tx * tx + ty * ty)
    var ideal = this._s(60)
    if (td > ideal + 4 && td > 0) { dmx += tx / td * 0.7; dmy += ty / td * 0.5 }
    else if (td < ideal - 4 && td > 0) { dmx -= tx / td * 0.3; dmy -= ty / td * 0.2 }
  }
  var dm = Math.sqrt(dmx * dmx + dmy * dmy)
  if (dm > 1) { dmx /= dm; dmy /= dm }
  if (dm > 0.1) {
    this.def.x += dmx * this._defSp * (dt / 16)
    this.def.y += dmy * this._defSp * 0.5 * (dt / 16)
  }
  this.off.x = Math.max(minX, Math.min(maxX, this.off.x))
  this.off.y = Math.max(minY, Math.min(maxY, this.off.y))
  this.def.x = Math.max(minX, Math.min(maxX, this.def.x))
  this.def.y = Math.max(minY, Math.min(maxY, this.def.y))
}

GameEngine.prototype._shootUpd = function(dt) {
  if (!this.shooting || this.shotReleased) return
  this._chargePower += dt / 1150
  if (this._chargePower > 1.0) this._chargePower = 1.0
  this.shotPower = this._chargePower
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

  // 篮下扣篮/上篮判定: 距篮筐80单位以内
  var distToRim = Math.abs(this.off.x - this._s(RIM_X))
  var jumpType = 'shoot'
  if (distToRim < this._s(80)) {
    var offP = this.getOffPlayer()
    var str = offP ? (offP.strength || 50) : 50
    var jmp = offP ? (offP.jumping || 50) : 50
    var spd = offP ? (offP.speed || 50) : 50
    var drb = offP ? (offP.dribbling || 50) : 50
    jumpType = (str + jmp) >= (spd + drb) ? 'dunk' : 'layup'
  }
  this._triggerJump(jumpType)

  // 绿色区域宽度: 扣篮/上篮更宽(更容易), 投篮基于属性
  var sh = this._offSh || 50
  var hw
  if (jumpType === 'dunk' || jumpType === 'layup') {
    hw = 0.15 + (sh / 99) * 0.10 // wider green zone for close range
  } else {
    hw = 0.05 + (sh / 99) * 0.06
  }
  this._chargeZoneLo = 0.90 - hw
  this._chargeZoneHi = 0.90 + hw
}
GameEngine.prototype.releaseShoot = function() {
  if (!this.shooting || this.shotReleased) return
  this.shotReleased = true; this.shooting = false
  // Minimum charge: quick tap doesn't shoot (lower threshold for dunk/layup)
  var minCharge = (this._jumpType === 'dunk' || this._jumpType === 'layup') ? 0.15 : 0.25
  if (this._chargePower < minCharge) {
    this._say('按住蓄力再投！')
    this._jumpPhase = 'none'
    this._jumpY = 0
    this._jumpVy = 0
    this._jumpType = 'none'
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
    // ========== 扣篮 ==========
    // 公式: 基础85% + 力量加成 + 弹跳加成 - 防守干扰
    var dunkContest = dd < this._s(40) ? (1 - dd / this._s(40)) * 18 : 0
    mp = 85 + (st / 99) * 8 + (jm / 99) * 10 - dunkContest
    mp = Math.max(55, Math.min(99, mp))
    label = '暴扣！'
    pts = 2
  } else if (isLayup) {
    // ========== 上篮 ==========
    // 公式: 基础75% + 速度加成 + 控球加成 - 防守干扰
    var layContest = dd < this._s(45) ? (1 - dd / this._s(45)) * 20 : 0
    mp = 75 + (sp / 99) * 12 + (dr / 99) * 10 - layContest
    mp = Math.max(45, Math.min(99, mp))
    label = '上篮！'
    pts = 2
  } else if (is3) {
    // ========== 三分球 ==========
    // 公式: 时机准确率 + 投篮属性加成 - 距离惩罚 - 防守干扰
    var t3 = this._timing()
    var distPenalty = Math.max(0, (distToRim - this._s(290)) / this._s(5) * 1.2)
    var contest3 = dd < this._s(100) ? (1 - dd / this._s(100)) * 20 + this._defDf / 99 * 10 : 0
    mp = t3.basePct + (sh / 99) * 22 - distPenalty - contest3
    mp = Math.max(8, Math.min(95, mp))
    label = t3.label
    pts = 3
  } else {
    // ========== 两分跳投 ==========
    // 公式: 时机准确率 + 投篮属性加成 + 近距离加成 - 防守干扰
    var t2 = this._timing()
    var closeBonus = 0
    if (distToRim < this._s(60)) closeBonus = 30
    else if (distToRim < this._s(120)) closeBonus = 20
    else if (distToRim < this._s(200)) closeBonus = 10
    else if (distToRim < this._s(260)) closeBonus = 5
    var contest2 = dd < this._s(80) ? (1 - dd / this._s(80)) * 22 + this._defDf / 99 * 8 : 0
    mp = t2.basePct + (sh / 99) * 28 + closeBonus - contest2
    mp = Math.max(12, Math.min(97, mp))
    label = t2.label
    pts = 2
  }

  var made = Math.random() * 100 < mp

  this.ball.has = false; this.ballInAir = true
  this._grabCooldown = 350

  if (isDunk) {
    this.ball.vx = (this._s(RIM_X) - this.ball.x) * 0.04
    this.ball.vy = -(Math.abs(this._jumpVy) * 1.2) + 1
    if (!made) {
      this.ball.vx += (Math.random() - 0.5) * 1.5
      this.ball.vy += (Math.random() - 0.5) * 1.5
    }
  } else if (isLayup) {
    var lx = this.ball.x, ly = this.ball.y
    var ldx = this._s(RIM_X) - lx
    var ldy = this._s(RIM_Y - 15) - ly
    this.ball.vx = ldx * 0.025
    this.ball.vy = ldy * 0.025 - 2.5
    if (!made) {
      this.ball.vx += (Math.random() - 0.5) * 2
      this.ball.vy += (Math.random() - 0.5) * 1.5
    }
  } else {
    var jumpBoost = this._jumpPhase !== 'none' ? Math.max(0, -this._jumpVy) * 0.6 : 0
    var sX = this.ball.x, sY = this.ball.y
    var tgtX = this._s(RIM_X), tgtY = this._s(RIM_Y)
    var ddx = tgtX - sX, ddy = tgtY - sY
    var dist2 = Math.sqrt(ddx * ddx + ddy * ddy)
    var speed = 5 + this.shotPower * 9
    var time = dist2 / speed
    this.ball.vx = ddx / time
    this.ball.vy = ddy / time - 0.5 * GRAVITY * time - jumpBoost
    if (!made) {
      this.ball.vx += (Math.random() - 0.5) * 2.5
      this.ball.vy += (Math.random() - 0.5) * 2
    }
  }

  this.shotResult = { made: made, pts: pts, timing: label }
  this.shotClockTimer = 0
}

GameEngine.prototype._timing = function() {
  var p = this.shotPower
  var lo = this._chargeZoneLo, hi = this._chargeZoneHi
  var mid = (lo + hi) / 2, hw = (hi - lo) / 2
  var staminaPen = this.stamina < 25 ? (25 - this.stamina) * 1.6 : 0
  if (p < 0.30) return { label: '太早', basePct: Math.max(5, 25 - staminaPen) }
  if (p < lo) return { label: '早了', basePct: Math.max(10, 50 - staminaPen) }
  if (p <= hi) {
    var dist = Math.abs(p - mid) / Math.max(hw, 0.01)
    if (dist < 0.25) return { label: '完美', basePct: Math.max(30, 99 - staminaPen) }
    if (dist < 0.60) return { label: '不错', basePct: Math.max(25, 92 - staminaPen) }
    return { label: '一般', basePct: Math.max(15, 75 - staminaPen) }
  }
  return { label: '太晚', basePct: Math.max(5, 35 - staminaPen) }
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
      that.stamina = Math.min(100, that.stamina + 20)
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
    that.stamina = Math.min(100, that.stamina + 20)
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

GameEngine.prototype._updateJump = function(dt) {
  if (this._jumpPhase === 'none') return
  this._jumpTimer += dt

  if (this._jumpPhase === 'crouch') {
    var crouchDur = 100, crouchDepth = this._s(10)
    if (this._jumpType === 'block') { crouchDur = 50; crouchDepth = this._s(7) }
    else if (this._jumpType === 'dunk') { crouchDur = 70; crouchDepth = this._s(14) }
    else if (this._jumpType === 'layup') { crouchDur = 80; crouchDepth = this._s(11) }
    var prog = Math.min(1, this._jumpTimer / crouchDur)
    this._jumpY = crouchDepth * (prog * prog)
    if (prog >= 1) {
      this._jumpPhase = 'rising'
      this._jumpTimer = 0
      if (this._jumpType === 'block') this._jumpVy = -9.5
      else if (this._jumpType === 'dunk') this._jumpVy = -9.0
      else if (this._jumpType === 'layup') this._jumpVy = -7.0
      else this._jumpVy = -6.5
    }
  } else if (this._jumpPhase === 'rising') {
    var grav = (this._jumpType === 'block' ? 0.30 : 0.28) * (dt / 16)
    this._jumpVy += grav
    this._jumpY += this._jumpVy * (dt / 16)
    if (this._jumpVy >= -0.2) {
      this._jumpPhase = 'hang'
      this._jumpTimer = 0
    }
  } else if (this._jumpPhase === 'hang') {
    // Brief float at peak
    var hangDur = this._jumpType === 'block' ? 60 : 90
    if (this._jumpTimer >= hangDur) {
      this._jumpPhase = 'falling'
      this._jumpTimer = 0
    }
  } else if (this._jumpPhase === 'falling') {
    var gravF = (this._jumpType === 'block' ? 0.30 : 0.28) * (dt / 16)
    this._jumpVy += gravF
    this._jumpY += this._jumpVy * (dt / 16)
    if (this._jumpY >= 0) {
      this._jumpY = 0
      this._jumpVy = 0
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
  this.driveAnim = 600; this.offEnergy -= 30; this._say('突破！')
  this._spawnParticles(this.off.x, this.off.y, '#0088ff', 10)
  var d = this._defDist()
  if (d < this._s(35)) {
    var c = 0.35 + (this._offSp / 5) * 0.35 - this._defDf / 99 * 0.25
    if (Math.random() > c) { this._say('突破被阻！'); this.driveAnim = 200; var that = this; setTimeout(function() { that._chg('进攻犯规！') }, 300) }
  }
}

GameEngine.prototype.attemptSteal = function() {
  if (!this.ball.has || this.shooting || this.stealAnim > 0 || this.defEnergy < 20) { if (this.defEnergy < 20) this._say('体力不足'); return }
  this.stealAnim = 400; this.defEnergy -= 20
  var dx = this.def.x - this.off.x, dy = this.def.y - this.off.y
  var dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < this._s(70)) {
    var c = (dist < this._s(50) ? 0.3 : 0.12) + this._defDf / 99 * 0.35 - this._offDr / 99 * 0.3
    if (Math.random() < c) {
      this._chg('抢断成功！')
      this.stats[this.poss === 0 ? 'p2' : 'p1'].stl++
      this._say('抢断成功！')
      this._spawnParticles(this.ball.x, this.ball.y, '#ffff00', 15)
      return
    }
  }
  this._say('抢断失败')
}

GameEngine.prototype.attemptBlock = function() {
  if (!this.ballInAir || this.blockAnim > 0 || this.defEnergy < 25) { if (!this.ballInAir) this._say('等投篮再盖帽'); else this._say('体力不足'); return }
  this.blockAnim = 500; this.defEnergy -= 25
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
  if (this.ballInAir && this._grabCooldown > 0) return
  var dOff = this._dist(this.off, this.ball)
  var dDef = this._dist(this.def, this.ball)
  var grabRange = this._s(55)
  if (dOff < grabRange) { this._doRebound(this.poss); return }
  if (dDef < grabRange) { this._doRebound(1 - this.poss); return }
  if (dOff < grabRange * 1.5 && dOff < dDef) { this._doRebound(this.poss); return }
  if (dDef < grabRange * 1.5 && dDef < dOff) { this._doRebound(1 - this.poss); return }
  this._say('太远了，靠近点！')
}

GameEngine.prototype._checkBallGrab = function() {
  if (this.ball.has || this._grabCooldown > 0) return
  if (!this.ballInAir && !this.ballLoose) return
  if (this.scoredAnim > 0) return
  var dOff = this._dist(this.off, this.ball)
  var dDef = this._dist(this.def, this.ball)
  var range = this._s(38)
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
  this._drawBallShadow(ctx)
  this._drawPlayers(ctx)
  this._drawBall(ctx)
  this._drawParticles(ctx)
  this._drawScorePopups(ctx)
  this._drawUI(ctx)
  ctx.restore()
}

GameEngine.prototype._drawCourt = function(ctx) {
  var s = this.s

  // Arena wall with team-colored gradient (more transparent with bg image)
  var offP = this.poss === 0 ? this.p1 : this.p2
  var tc = offP ? (offP.teamColor || '#1a6dd4') : '#1a6dd4'
  var wallAlpha = this.bgImage ? 0.35 : 1.0
  var wallGrad = ctx.createLinearGradient(0, 0, 0, this._s(FLOOR_Y))
  wallGrad.addColorStop(0, this._darken(tc, 0.85 * wallAlpha))
  wallGrad.addColorStop(0.7, this._darken(tc, 0.7 * wallAlpha))
  wallGrad.addColorStop(1, this._darken(tc, 0.55 * wallAlpha))
  ctx.fillStyle = wallGrad
  ctx.fillRect(0, 0, this.w, this._s(FLOOR_Y))

  // Crowd with color variation and subtle animation
  var crowdColors = ['rgba(30,30,55,0.8)', 'rgba(50,30,40,0.7)', 'rgba(25,40,50,0.7)', 'rgba(40,25,45,0.7)', 'rgba(35,35,50,0.8)']
  var crowdShift = Math.sin(Date.now() * 0.001) * this._s(2)
  for (var ci = 0; ci < 32; ci++) {
    var cx = ci * this._s(32) + this._s(8)
    var crowdR = this._s(8) + (ci % 3) * this._s(2)
    ctx.fillStyle = crowdColors[ci % 5]
    ctx.beginPath()
    ctx.arc(cx, this._s(22) + crowdShift * (ci % 3), crowdR, 0, Math.PI * 2)
    ctx.fill()
  }
  // Second row of crowd
  for (var cj = 0; cj < 28; cj++) {
    var cx2 = cj * this._s(36) + this._s(20)
    ctx.fillStyle = crowdColors[(cj + 2) % 5]
    ctx.beginPath()
    ctx.arc(cx2, this._s(10), this._s(6) + (cj % 2) * this._s(2), 0, Math.PI * 2)
    ctx.fill()
  }

  // Court floor with richer gradient (semi-transparent with bg image)
  var floorAlpha = this.bgImage ? 0.55 : 1.0
  var gFloor = ctx.createLinearGradient(0, this._s(FLOOR_Y), 0, this.h)
  gFloor.addColorStop(0, this._rgba('#d4a45c', floorAlpha))
  gFloor.addColorStop(0.15, this._rgba('#c89450', floorAlpha))
  gFloor.addColorStop(0.5, this._rgba('#b07838', floorAlpha))
  gFloor.addColorStop(1, this._rgba('#7a4520', floorAlpha))
  ctx.fillStyle = gFloor
  ctx.fillRect(0, this._s(FLOOR_Y), this.w, this.h - this._s(FLOOR_Y))

  // Parquet floor pattern (alternating panels)
  var panelW = this._s(60)
  for (var px = 0; px < this.w; px += panelW) {
    var shade = (Math.floor(px / panelW) % 2 === 0) ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
    ctx.fillStyle = shade
    ctx.fillRect(px, this._s(FLOOR_Y), panelW, this.h - this._s(FLOOR_Y))
  }
  // Horizontal wood lines
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1
  for (var gy = this._s(FLOOR_Y); gy < this.h; gy += this._s(5)) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(this.w, gy); ctx.stroke()
  }

  // Baseline (thicker, brighter)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(this._s(940), this._s(FLOOR_Y)); ctx.lineTo(this._s(940), this.h); ctx.stroke()

  // Sideline
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(this._s(15), this._s(FLOOR_Y)); ctx.lineTo(this._s(960), this._s(FLOOR_Y)); ctx.stroke()

  // Three-point arc
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 2
  ctx.setLineDash([this._s(8), this._s(4)])
  ctx.beginPath()
  ctx.arc(this._s(RIM_X), this._s(FLOOR_Y), this._s(290), 0, Math.PI, true)
  ctx.stroke()
  ctx.setLineDash([])

  // Free throw line + circle
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(this._s(620), this._s(FLOOR_Y))
  ctx.lineTo(this._s(620), this._s(FLOOR_Y + 50))
  ctx.stroke()

  // Paint area
  ctx.fillStyle = 'rgba(180,120,60,0.25)'
  ctx.fillRect(this._s(720), this._s(FLOOR_Y), this._s(220), this._s(80))
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 2
  ctx.strokeRect(this._s(720), this._s(FLOOR_Y), this._s(220), this._s(80))

  // Pole with metallic gradient
  var poleGrad = ctx.createLinearGradient(this._s(930), 0, this._s(938), 0)
  poleGrad.addColorStop(0, '#777')
  poleGrad.addColorStop(0.3, '#aaa')
  poleGrad.addColorStop(0.6, '#888')
  poleGrad.addColorStop(1, '#555')
  ctx.fillStyle = poleGrad
  ctx.fillRect(this._s(930), this._s(120), this._s(8), this._s(FLOOR_Y - 120))

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

  // Rim glow
  if (this.scoredAnim > 0) {
    var glowAlpha = this.scoredAnim / 1200 * 0.4
    ctx.strokeStyle = 'rgba(255,200,0,' + glowAlpha + ')'
    ctx.lineWidth = 8
    ctx.beginPath(); ctx.arc(this._s(RIM_X), this._s(RIM_Y), this._s(RIM_R + 3), 0, Math.PI * 2); ctx.stroke()
  }
  // Rim
  ctx.strokeStyle = '#ff3333'
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(this._s(RIM_X), this._s(RIM_Y), this._s(RIM_R), 0, Math.PI * 2); ctx.stroke()
  // Rim highlight
  ctx.strokeStyle = 'rgba(255,150,150,0.5)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(this._s(RIM_X), this._s(RIM_Y - 1), this._s(RIM_R - 1), -Math.PI * 0.7, -Math.PI * 0.1)
  ctx.stroke()

  // Rim connector
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(this._s(898), this._s(RIM_Y)); ctx.lineTo(this._s(RIM_X - RIM_R), this._s(RIM_Y)); ctx.stroke()

  // Net (with swish animation)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 0.5
  var swish = 0
  if (this.scoredAnim > 0) {
    swish = Math.sin(this.scoredAnim * 0.05) * this._s(8) * (this.scoredAnim / 1200)
  }
  for (var i = 0; i < 6; i++) {
    var a = -1.9 + i * 0.22
    var sx = this._s(RIM_X) + Math.cos(a) * this._s(RIM_R - 1)
    var sy = this._s(RIM_Y) + Math.sin(a) * this._s(RIM_R - 1)
    var ex = this._s(RIM_X) + swish * 0.3
    var ey = this._s(RIM_Y + 65)
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    var cpx = (sx + ex) / 2 + swish * (i % 2 === 0 ? 1 : -1)
    var cpy = (sy + ey) / 2 - Math.abs(swish) * 0.6
    ctx.quadraticCurveTo(cpx, cpy, ex, ey)
    ctx.stroke()
  }
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
  if (this.shooting || (this.shotReleased && this.shotResult)) offPose = 'shoot'
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
  if (pose === 'block' && this._jumpType === 'block') jumpY = this._jumpY
  if (pose === 'shoot' && this._jumpType === 'shoot') jumpY = this._jumpY

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
  var footY = floorY + jumpY
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
  var lHX, lKX, lAX, rHX, rKX, rAX
  if (pose === 'defense') {
    lHX = cx - r * 0.2 * bf; lKX = cx - r * 0.32 * bf; lAX = cx - r * 0.5 * bf
    rHX = cx + r * 0.2 * bf; rKX = cx + r * 0.32 * bf; rAX = cx + r * 0.5 * bf
  } else if (pose === 'drive') {
    lHX = cx - r * 0.18 * bf; lKX = cx - r * 0.12 * bf; lAX = cx - r * 0.25 * bf
    rHX = cx + r * 0.22 * bf; rKX = cx + r * 0.32 * bf; rAX = cx + r * 0.5 * bf
  } else {
    lHX = cx - r * 0.16 * bf; lKX = cx - r * 0.18 * bf; lAX = cx - r * 0.25 * bf
    rHX = cx + r * 0.16 * bf; rKX = cx + r * 0.18 * bf; rAX = cx + r * 0.25 * bf
  }

  var legW = r * 0.17 * bf

  // ---- Draw LEFT LEG (behind) ----
  // Upper leg
  ctx.fillStyle = st
  ctx.beginPath(); ctx.moveTo(lHX - legW * 0.7, hipY); ctx.lineTo(lKX - legW * 0.6, kneeY); ctx.lineTo(lKX + legW * 0.6, kneeY); ctx.lineTo(lHX + legW * 0.7, hipY); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
  // Lower leg
  ctx.fillStyle = st
  ctx.beginPath(); ctx.moveTo(lKX - legW * 0.6, kneeY); ctx.lineTo(lAX - legW * 0.5, ankleY); ctx.lineTo(lAX + legW * 0.5, ankleY); ctx.lineTo(lKX + legW * 0.6, kneeY); ctx.closePath(); ctx.fill()
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
  ctx.beginPath(); ctx.moveTo(rHX - legW * 0.7, hipY); ctx.lineTo(rKX - legW * 0.6, kneeY); ctx.lineTo(rKX + legW * 0.6, kneeY); ctx.lineTo(rHX + legW * 0.7, hipY); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
  // Lower leg
  ctx.fillStyle = st
  ctx.beginPath(); ctx.moveTo(rKX - legW * 0.6, kneeY); ctx.lineTo(rAX - legW * 0.5, ankleY); ctx.lineTo(rAX + legW * 0.5, ankleY); ctx.lineTo(rKX + legW * 0.6, kneeY); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = sd; ctx.lineWidth = blw; ctx.stroke()
  // Shoe
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath(); ctx.ellipse(rAX, ankleY + r * 0.06, r * 0.22, r * 0.09, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#333'
  ctx.beginPath(); ctx.ellipse(rAX, ankleY + r * 0.1, r * 0.16, r * 0.05, 0, Math.PI, 0); ctx.fill()
  // Sock
  ctx.fillStyle = '#fff'
  ctx.fillRect(rAX - legW * 0.65, ankleY - r * 0.14, legW * 1.3, r * 0.16)

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

  if (pose === 'shoot') {
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

  // Score animation
  if (this.scoredAnim > 0 && this.shotResult) {
    var alpha = Math.min(1, this.scoredAnim / 800)
    var off = (1500 - this.scoredAnim) / 1500 * this._s(50)
    ctx.fillStyle = 'rgba(255,215,0,' + alpha + ')'
    ctx.font = 'bold ' + Math.floor(this._s(24)) + 'px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.shotResult.made ? '+' + this.shotResult.pts : '打铁', w / 2, this._s(250) - off)
  }

  // Shot timing
  if (this.shotReleased && this.shotResult) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = 'bold ' + Math.floor(this._s(14)) + 'px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.shotResult.timing, w / 2, this._s(280))
  }

  // Message
  if (this.msgTimer > 0) {
    var ma = Math.min(1, this.msgTimer / 300)
    ctx.fillStyle = 'rgba(255,255,255,' + ma + ')'
    ctx.font = 'bold ' + Math.floor(this._s(18)) + 'px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.msg, w / 2, h - this._s(100))
  }
}

module.exports = GameEngine
