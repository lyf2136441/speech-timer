// DeepSeek兼容代理 v3 — system→user转换 + 并发请求串行化 + 400重试
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

// ====== 请求队列：串行化对DeepSeek的并发请求 ======
var requestQueue = []
var isProcessing = false

function processQueue() {
  if (isProcessing || requestQueue.length === 0) return
  isProcessing = true
  var job = requestQueue.shift()
  sendToDeepSeek(job.data, job.retries || 0, function(err, result) {
    if (err && job.retries < 3 && (err.status === 400 || err.status === 429)) {
      // 并发/限流错误 → 放回队尾重试
      job.retries = (job.retries || 0) + 1
      requestQueue.unshift(job)
      isProcessing = false
      setTimeout(processQueue, 500 * job.retries) // 指数退避
    } else if (err && err.status === 400 && job.retries >= 3 && job.data._canSplitTools) {
      // 可能是工具太多，尝试拆分后重试
      job.data._canSplitTools = false
      job.retries = 0
      requestQueue.unshift(job)
      isProcessing = false
      setTimeout(processQueue, 200)
    } else {
      job.callback(err, result)
      isProcessing = false
      processQueue() // 处理下一个
    }
  })
}

function enqueue(data, callback) {
  requestQueue.push({ data: data, retries: 0, callback: callback })
  processQueue()
}

// ====== 实际发送请求到DeepSeek ======
function sendToDeepSeek(data, retryCount, callback) {
  try {
    var payload = JSON.stringify(data)
    var options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': data._authHeader || '',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 120000 // 2分钟超时
    }

    var proxyReq = https.request(TARGET + '/v1/chat/completions', options, function(proxyRes) {
      var chunks = []
      proxyRes.on('data', function(c) { chunks.push(c) })
      proxyRes.on('end', function() {
        var responseBody = Buffer.concat(chunks).toString()
        if (proxyRes.statusCode >= 400) {
          callback({ status: proxyRes.statusCode, body: responseBody }, null)
        } else {
          callback(null, { status: proxyRes.statusCode, headers: proxyRes.headers, body: responseBody })
        }
      })
    })

    proxyReq.on('error', function(e) {
      callback({ status: 502, body: JSON.stringify({ error: { message: 'Proxy error: ' + e.message } }) }, null)
    })
    proxyReq.on('timeout', function() {
      proxyReq.destroy()
      callback({ status: 504, body: JSON.stringify({ error: { message: 'Upstream timeout' } }) }, null)
    })

    proxyReq.write(payload)
    proxyReq.end()
  } catch(e) {
    callback({ status: 400, body: JSON.stringify({ error: { message: 'Parse error: ' + e.message } }) }, null)
  }
}

// ====== 主服务器 ======
function startProxy() {
  var server = http.createServer(function(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

    var chunks = []
    req.on('data', function(c) { chunks.push(c) })
    req.on('end', function() {
      var body = Buffer.concat(chunks).toString()

      try {
        var data = JSON.parse(body)

        // ====== Anthropic → DeepSeek 消息转换 ======
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

        // ====== Anthropic tools → DeepSeek tools ======
        if (data.tools && Array.isArray(data.tools)) {
          // DeepSeek 原生支持 OpenAI tool 格式，需要转换 Anthropic tool 格式
          var deepseekTools = []
          for (var t = 0; t < data.tools.length; t++) {
            var tool = data.tools[t]
            deepseekTools.push({
              type: 'function',
              function: {
                name: tool.name,
                description: tool.description || '',
                parameters: tool.input_schema || { type: 'object', properties: {} }
              }
            })
          }
          data.tools = deepseekTools
        }

        // 保存auth header供队列使用
        data._authHeader = req.headers['authorization'] || req.headers['x-api-key'] || ''
        data._canSplitTools = true

        // 通过队列串行发送，防止并发400错误
        enqueue(data, function(err, result) {
          if (err) {
            // 返回错误给Claude Code
            var errBody = err.body
            try {
              var errObj = JSON.parse(errBody)
              // 如果是并发相关错误，添加提示
              if (err.status === 400 && errBody.indexOf('concurrency') !== -1) {
                errObj.error.message = (errObj.error.message || '') + ' [Proxy: will retry with reduced concurrency]'
              }
              errBody = JSON.stringify(errObj)
            } catch(e) {}
            res.writeHead(err.status, { 'Content-Type': 'application/json' })
            res.end(errBody)
            return
          }

          // ====== DeepSeek response → Anthropic format ======
          try {
            var dsResp = JSON.parse(result.body)

            // 转换 tool_calls → Anthropic content format
            if (dsResp.choices && dsResp.choices[0] && dsResp.choices[0].message) {
              var msg = dsResp.choices[0].message

              // DeepSeek tool_calls → Anthropic tool_use content blocks
              if (msg.tool_calls && msg.tool_calls.length > 0) {
                var anthropicContent = []

                // 如果有文本内容
                if (msg.content && msg.content.trim()) {
                  anthropicContent.push({ type: 'text', text: msg.content })
                }

                // 转换每个tool_call
                for (var tc = 0; tc < msg.tool_calls.length; tc++) {
                  var tcData = msg.tool_calls[tc]
                  var toolInput = {}
                  try {
                    toolInput = JSON.parse(tcData.function.arguments || '{}')
                  } catch(e) {}

                  anthropicContent.push({
                    type: 'tool_use',
                    id: tcData.id || ('toolu_' + Math.random().toString(36).substr(2, 12)),
                    name: tcData.function.name,
                    input: toolInput
                  })
                }

                // 重建为Anthropic格式
                result.body = JSON.stringify({
                  id: dsResp.id || ('msg_' + Math.random().toString(36).substr(2, 12)),
                  type: 'message',
                  role: 'assistant',
                  content: anthropicContent,
                  model: dsResp.model || 'deepseek-v4',
                  stop_reason: anthropicContent.some(function(c) { return c.type === 'tool_use' }) ? 'tool_use' : 'end_turn',
                  stop_sequence: null,
                  usage: dsResp.usage || { input_tokens: 0, output_tokens: 0 }
                })
              } else {
                // 纯文本响应，也转为Anthropic格式
                result.body = JSON.stringify({
                  id: dsResp.id || ('msg_' + Math.random().toString(36).substr(2, 12)),
                  type: 'message',
                  role: 'assistant',
                  content: [{ type: 'text', text: msg.content || '' }],
                  model: dsResp.model || 'deepseek-v4',
                  stop_reason: msg.finish_reason || 'end_turn',
                  stop_sequence: null,
                  usage: dsResp.usage || { input_tokens: 0, output_tokens: 0 }
                })
              }
            }
          } catch(e) {
            // 转换失败，透传原始响应
          }

          res.writeHead(result.status, result.headers || { 'Content-Type': 'application/json' })
          res.end(result.body)
        })

      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
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
