// 游戏常量定义

// 场地尺寸 (Canvas坐标系，适配不同屏幕)
const COURT = {
  WIDTH: 750,          // 设计宽度 (rpx基准)
  HEIGHT: 500,         // 半场长度
  BASELINE_Y: 500,     // 底线Y坐标
  RIM_X: 375,          // 篮筐X坐标
  RIM_Y: 60,           // 篮筐Y坐标
  THREE_LINE_Y: 350,   // 三分线顶端Y
  THREE_RADIUS: 280,   // 三分线半径
  PAINT_WIDTH: 160,    // 禁区宽度
  PAINT_HEIGHT: 200,   // 禁区高度
  RIM_RADIUS: 12,      // 篮筐半径
  BALL_RADIUS: 10,     // 篮球半径
  PLAYER_RADIUS: 25,   // 球员半径
}

// 游戏物理参数
const PHYSICS = {
  BALL_GRAVITY: 0.4,       // 篮球重力
  SHOOT_BASE_SPEED: 8,     // 投篮基础速度
  MAX_SHOOT_POWER: 14,     // 最大投篮力度
  MIN_SHOOT_POWER: 4,      // 最小投篮力度
  DRIBBLE_BOUNCE_SPEED: 6, // 运球反弹速度
  PLAYER_SPEED_BASE: 2.5,  // 球员基础移速
  DRIVE_SPEED_BOOST: 5,    // 突破加速
  STEAL_RANGE: 35,         // 抢断距离
  BLOCK_RANGE: 40,         // 盖帽距离
  BLOCK_JUMP_HEIGHT: 60,   // 盖帽起跳高度
  CONTEST_RANGE: 50,       // 干扰距离
}

// 游戏规则
const RULES = {
  WIN_SCORE: 11,          // 获胜分数
  SHOT_CLOCK: 24,         // 进攻时间（秒）
  POSSESSION_SWITCH: true, // 得分后交换球权
  NEED_WIN_BY_2: true,    // 需要领先2分
}

// 游戏状态枚举
const GAME_STATE = {
  SELECTING: 'selecting',
  JUMP_BALL: 'jump_ball',
  PLAYING: 'playing',
  SHOOTING: 'shooting',
  BLOCK_ANIM: 'block_anim',
  STEAL_ANIM: 'steal_anim',
  SCORED: 'scored',
  POSSESSION_CHANGE: 'possession_change',
  GAME_OVER: 'game_over',
}

// 球员属性名
const ATTR_NAMES = ['投篮', '速度', '力量', '防守', '控球', '弹跳']
const ATTR_KEYS = ['shooting', 'speed', 'strength', 'defense', 'dribbling', 'jumping']

// 颜色主题
const COLORS = {
  BG: '#0f0f1a',
  COURT: '#c68642',
  COURT_LINE: '#ffffff',
  PAINT: '#b87a3a',
  RIM: '#ff4444',
  BACKBOARD: '#dddddd',
  BALL: '#ff8c00',
  HOME: '#1a6dd4',
  AWAY: '#e03030',
  SHOT_METER_BG: '#333333',
  SHOT_METER_GOOD: '#00ff00',
  SHOT_METER_OK: '#ffff00',
  SHOT_METER_BAD: '#ff0000',
  ENERGY_BAR: '#00ccff',
  ENERGY_BG: '#333333',
  TEXT: '#ffffff',
  TEXT_DIM: '#aaaaaa',
  BUTTON_BG: 'rgba(255,255,255,0.15)',
  BUTTON_ACTIVE: 'rgba(255,255,255,0.35)',
}

// 投篮时机判定区间
const SHOT_TIMING = {
  PERFECT: { min: 0.45, max: 0.55, label: '完美', basePercent: 95 },
  GOOD: { min: 0.35, max: 0.65, label: '不错', basePercent: 70 },
  OK: { min: 0.20, max: 0.80, label: '一般', basePercent: 40 },
  BAD: { min: 0, max: 1, label: '太差', basePercent: 15 },
}

module.exports = {
  COURT,
  PHYSICS,
  RULES,
  GAME_STATE,
  ATTR_NAMES,
  ATTR_KEYS,
  COLORS,
  SHOT_TIMING,
}
