var playersData = require('../../utils/players')

Page({
  data: {
    p1Name: '未选择',
    p1Color: '#444',
    p2Name: '未选择',
    p2Color: '#444',
    selLabel: '挑战者',
    ready: false,
    teamNames: [],
    teamIndex: 0,
    playerList: [],
    selId: '',
  },

  _player1: null,
  _player2: null,
  _selectingFor: 1,
  _allTeams: [],

  onLoad: function() {
    var teams = playersData.getTeams()
    var names = []
    for (var i = 0; i < teams.length; i++) {
      names.push(teams[i].name)
    }
    this._allTeams = teams
    var list = this._makeList(teams[0].id)
    this.setData({
      teamNames: names,
      teamIndex: 0,
      playerList: list,
    })
  },

  _makeList: function(teamId) {
    var raw = playersData.getPlayersByTeam(teamId)
    var list = []
    for (var i = 0; i < raw.length; i++) {
      var p = raw[i]
      list.push({
        id: p.id,
        num: p.num,
        name: p.name,
        pos: p.pos,
        shoot: p.shooting,
        speed: p.speed,
        str: p.strength,
        def: p.defense,
        drib: p.dribbling,
        jump: p.jumping,
        teamId: p.teamId,
        teamColor: p.teamColor,
        teamAbbr: p.teamAbbr,
        full: p,
      })
    }
    return list
  },

  onTeamChange: function(e) {
    var idx = parseInt(e.detail.value)
    var team = this._allTeams[idx]
    if (!team) return
    var list = this._makeList(team.id)
    this.setData({
      teamIndex: idx,
      playerList: list,
      selId: '',
    })
  },

  onCardTap: function(e) {
    var pid = e.currentTarget.dataset.pid
    var player = null
    var list = this.data.playerList
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === pid) { player = list[i]; break }
    }
    if (!player) return

    this.setData({ selId: pid })

    if (this._selectingFor === 1) {
      this._player1 = player.full
      this._selectingFor = 2
      this.setData({
        p1Name: player.name,
        p1Color: player.teamColor,
        selLabel: '防守者',
      })
      // 切换到另一支球队
      var teams = this._allTeams
      var nextIdx = 0
      for (var j = 0; j < teams.length; j++) {
        if (teams[j].id !== player.teamId) { nextIdx = j; break }
      }
      var list2 = this._makeList(teams[nextIdx].id)
      this.setData({
        teamIndex: nextIdx,
        playerList: list2,
        selId: '',
      })
    } else {
      this._player2 = player.full
      this._selectingFor = 1
      this.setData({
        p2Name: player.name,
        p2Color: player.teamColor,
        selLabel: '挑战者',
        ready: true,
      })
    }
  },

  onStart: function() {
    if (!this._player1 || !this._player2) {
      wx.showToast({ title: '请选择双方球员', icon: 'none' })
      return
    }
    var app = getApp()
    app.globalData.onlineMode = false
    app.globalData.player1 = this._player1
    app.globalData.player2 = this._player2
    wx.navigateTo({ url: '/pages/game/game?mode=local' })
  },

  onOnline: function() {
    var app = getApp()
    app.globalData.onlineMode = true
    wx.navigateTo({ url: '/pages/online/online' })
  },
})
