import { useState, useEffect, useRef } from 'react'

const BASE_URL = 'https://oracleapex.com/ords/yash_tt/ai-builder'

const PAGE_TYPE_ICONS = {
  Report:    '📋',
  Form:      '📝',
  Dashboard: '📊',
  Calendar:  '📅',
  Chart:     '📈',
}

export default function App() {
  const [sessionId, setSessionId]   = useState(null)
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [appPlan, setAppPlan]       = useState(null)
  const [planJson, setPlanJson]     = useState(null)
  const [accepting, setAccepting]   = useState(false)
  const [accepted, setAccepted]     = useState(null)  // { appId, script }
  const messagesEndRef               = useRef(null)

  // ── Create session on load ──
  useEffect(() => {
    fetch(`${BASE_URL}/session/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'react_user' })
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') setSessionId(data.session_id)
        else setError('Failed to start session: ' + data.message)
      })
      .catch(() => setError('Cannot reach APEX server. Check CORS settings.'))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const cleanReply = (text) =>
    text.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim()

  // ── Send message ──
  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return
    const userMsg = input.trim()
    setInput('')
    setLoading(true)
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])

    try {
      const res = await fetch(`${BASE_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, prompt: userMsg })
      })
      const data = await res.json()

      if (data.status === 'success') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: cleanReply(data.reply)
        }])
        if (data.has_plan === 'Y' && data.plan_json) {
          try {
            const plan = typeof data.plan_json === 'string'
              ? JSON.parse(data.plan_json)
              : data.plan_json
            setAppPlan(plan)
            setPlanJson(data.plan_json)
            setAccepted(null) // reset accepted state on new plan
          } catch { /* silent */ }
        }
      } else {
        setError('AI error: ' + data.message)
      }
    } catch {
      setError('Network error — check CORS or APEX server.')
    } finally {
      setLoading(false)
    }
  }

  // ── Accept & Create App ──
  const acceptApp = async () => {
    if (!sessionId || !planJson || accepting) return
    setAccepting(true)
    setError(null)

    try {
      const res = await fetch(`${BASE_URL}/create-app/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          plan_json:  typeof planJson === 'string'
            ? JSON.parse(planJson)
            : planJson
        })
      })
      const data = await res.json()

      if (data.status === 'success') {
        setAccepted({ appId: data.app_id, script: data.script })
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `✅ App plan accepted! App ID: ${data.app_id}\n\nYour install script is ready. Copy it and run it in APEX SQL Workshop to create the app.`
        }])
      } else {
        setError('Create app error: ' + data.message)
      }
    } catch {
      setError('Network error on create-app.')
    } finally {
      setAccepting(false)
    }
  }

  // ── Copy script to clipboard ──
  const copyScript = () => {
    if (!accepted?.script) return
    navigator.clipboard.writeText(accepted.script)
      .then(() => alert('Script copied! Paste it in APEX SQL Workshop and run it.'))
      .catch(() => alert('Copy failed — please select and copy manually.'))
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">

      {/* ── LEFT — Chat ── */}
      <div className="flex flex-col w-1/2 border-r border-gray-800">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900">
          <div>
            <h1 className="text-sm font-semibold text-white">APEX AI Builder</h1>
            <p className="text-xs text-gray-500">
              {sessionId ? `Session: ${sessionId.slice(0, 8)}…` : 'Connecting…'}
            </p>
          </div>
          <span className={`w-2 h-2 rounded-full ${sessionId ? 'bg-green-500' : 'bg-yellow-500'}`}/>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 text-sm mt-20">
              <p className="text-2xl mb-2">⚡</p>
              <p>Describe the APEX app you want to build.</p>
              <p className="text-xs mt-1">e.g. "Build me an employee directory app"</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef}/>
        </div>

        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-800 bg-gray-900">
          <div className="flex gap-2">
            <textarea
              className="flex-1 bg-gray-800 text-gray-100 text-sm rounded-xl px-4 py-2.5 resize-none outline-none border border-gray-700 focus:border-blue-500 transition-colors placeholder-gray-600"
              rows={2}
              placeholder="Describe your APEX app… (Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={!sessionId || loading}
            />
            <button
              onClick={sendMessage}
              disabled={!sessionId || loading || !input.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Live Preview ── */}
      <div className="flex flex-col w-1/2 bg-gray-950">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {appPlan ? appPlan.app_name : 'Live Preview'}
            </h2>
            <p className="text-xs text-gray-500">
              {appPlan ? appPlan.app_description : 'App plan will appear here'}
            </p>
          </div>
          {appPlan && (
            <span className="text-xs bg-green-900/50 text-green-400 border border-green-700 px-2 py-1 rounded-full">
              {appPlan.pages?.length} pages
            </span>
          )}
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!appPlan ? (
            <div className="flex items-center justify-center h-full text-gray-700">
              <div className="text-center">
                <p className="text-4xl mb-3">🖥</p>
                <p className="text-sm">Send a prompt to generate your app plan</p>
                <p className="text-xs mt-1">The wireframe will appear here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">

              {/* App header card */}
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🏗</span>
                  <h3 className="text-sm font-semibold text-white">{appPlan.app_name}</h3>
                </div>
                <p className="text-xs text-gray-400">{appPlan.app_description}</p>
              </div>

              {/* Page cards */}
              {appPlan.pages?.map((page, i) => (
                <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                      <span>{PAGE_TYPE_ICONS[page.page_type] || '📄'}</span>
                      <span className="text-sm font-medium text-white">
                        Page {page.page_no} — {page.page_name}
                      </span>
                    </div>
                    <span className="text-xs bg-blue-900/50 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full">
                      {page.page_type}
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {page.regions?.map((region, j) => (
                      <div key={j} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                        <span className="text-xs text-gray-300">{region}</span>
                      </div>
                    ))}
                    {page.sql_query && (
                      <div className="mt-2 bg-gray-950 rounded-lg px-3 py-2 border border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">SQL</p>
                        <code className="text-xs text-green-400 font-mono">
                          {page.sql_query.length > 80
                            ? page.sql_query.slice(0, 80) + '…'
                            : page.sql_query}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Accept button / Script panel */}
              {!accepted ? (
                <button
                  onClick={acceptApp}
                  disabled={accepting}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-xl transition-colors mt-2"
                >
                  {accepting ? '⏳ Generating script…' : '✅ Accept & Create App in APEX'}
                </button>
              ) : (
                <div className="bg-gray-900 rounded-xl border border-green-700 overflow-hidden mt-2">
                  <div className="flex items-center justify-between px-4 py-3 bg-green-900/30 border-b border-green-700">
                    <div>
                      <p className="text-sm font-semibold text-green-400">✅ Script Ready!</p>
                      <p className="text-xs text-gray-400">App ID: {accepted.appId}</p>
                    </div>
                    <button
                      onClick={copyScript}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      📋 Copy Script
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-2">Run these steps to create your app:</p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                        <p className="text-xs text-gray-300">Click <strong>"Copy Script"</strong> above</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                        <p className="text-xs text-gray-300">Go to <strong>APEX → SQL Workshop → SQL Scripts → Upload</strong></p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                        <p className="text-xs text-gray-300">Paste and run the script</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                        <p className="text-xs text-gray-300">Open your new app at <strong>f?p={accepted.appId}:1</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}