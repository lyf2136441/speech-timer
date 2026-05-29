// DeepSeek兼容代理 v2 — system→user消息转换 + 防重复启动
// 自动随Claude Code启动，无需手动运行

var http = require('http')
var https = require('https')
var net = require('net')
var PORT = 8787
var TARGET = 'https://api.deepseek.com'

// 检查端口是否已被占用
var tester = net.createServer()
tester.once('error', function() {
  // 端口已被占用，说明代理已运行，静默退出
  process.exit(0)
})
tester.listen(PORT, function() {
  tester.close()
  startProxy()
})

function startProxy() {
  var server = http.createServer(function(req, res) {
    var body = ''
    req.on('data', function(c) { body += c })
    req.on('end', function() {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', '*')
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

      try {
        var data = JSON.parse(body)

        if (data.messages) {
          var systemContent = []
          var newMessages = []
          for (var i = 0; i < data.messages.length; i++) {
            var m = data.messages[i]
            if (m.role === 'system') {
              systemContent.push(typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
            } else {
              if (systemContent.length > 0 && m.role === 'user') {
                m = Object.assign({}, m)
                var sc = systemContent.join('\n\n')
                if (typeof m.content === 'string') {
                  m.content = '[System]\n' + sc + '\n\n[User]\n' + m.content
                } else if (Array.isArray(m.content)) {
                  m.content = [{type:'text',text:'[System]\n' + sc + '\n\n[User]\n'}].concat(m.content)
                }
                systemContent = []
              }
              newMessages.push(m)
            }
          }
          if (systemContent.length > 0) {
            newMessages.unshift({ role: 'user', content: '[System]\n' + systemContent.join('\n\n') })
          }
          data.messages = newMessages
        }

        var payload = JSON.stringify(data)
        var targetUrl = TARGET + req.url

        var proxyReq = https.request(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers['authorization'] || '',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, function(proxyRes) {
          res.writeHead(proxyRes.statusCode, proxyRes.headers)
          proxyRes.pipe(res)
        })

        proxyReq.on('error', function(e) {
          res.writeHead(502)
          res.end(JSON.stringify({ error: { message: 'Proxy error: ' + e.message } }))
        })

        proxyReq.write(payload)
        proxyReq.end()
      } catch(e) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: { message: 'Parse error: ' + e.message } }))
      }
    })
  })

  server.on('error', function() {
    process.exit(0) // 端口冲突，已有实例
  })

  server.listen(PORT, '127.0.0.1', function() {
    // 静默启动，不打印日志
  })
}
