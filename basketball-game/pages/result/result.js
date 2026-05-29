var ATTR_NAMES = require('../../utils/constants').ATTR_NAMES
var ATTR_KEYS = require('../../utils/constants').ATTR_KEYS

Page({
  data: {
    player1: null,
    player2: null,
    score: [0, 0],
    stats: { p1: { pts: 0, blk: 0, stl: 0 }, p2: { pts: 0, blk: 0, stl: 0 } },
    winner: -1,
    winnerName: '',
    attrNames: ATTR_NAMES,
    attrKeys: ATTR_KEYS,
  },

  onLoad: function() {
    var app = getApp()
    var result = app.globalData.gameResult
    if (!result) {
      wx.showToast({ title: '没有比赛数据', icon: 'none' })
      setTimeout(function() { wx.navigateBack() }, 1500)
      return
    }

    this.setData({
      player1: result.player1,
      player2: result.player2,
      score: result.score,
      stats: result.stats,
      winner: result.winner,
      winnerName: result.winner === 0 ? result.player1.name : result.player2.name,
    })
  },

  rematch: function() {
    wx.redirectTo({ url: '/pages/game/game' })
  },

  goHome: function() {
    wx.redirectTo({ url: '/pages/index/index' })
  },
})
