import { useState, useEffect, useRef } from 'react';

const BASE_URL = 'https://oracleapex.com/ords/yash_tt/ai-builder';

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // ── Create session on load ──
  useEffect(() => {
    fetch(`${BASE_URL}/session/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'react_user' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'success') {
          setSessionId(data.session_id);
        } else {
          setError('Failed to start session: ' + data.message);
        }
      })
      .catch(() => setError('Cannot reach APEX server. Check CORS settings.'));
  }, []);

  // ── Auto scroll to latest message ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──
  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    // Add user message immediately
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);

    try {
      const res = await fetch(`${BASE_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, prompt: userMsg }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.reply },
        ]);
      } else {
        setError('AI error: ' + data.message);
      }
    } catch {
      setError('Network error — check CORS or APEX server.');
    } finally {
      setLoading(false);
    }
  };

  // ── Send on Enter key ──
  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* ── LEFT PANEL — Chat ── */}
      <div className="flex flex-col w-1/2 border-r border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900">
          <div>
            <h1 className="text-sm font-semibold text-white">
              APEX AI Builder
            </h1>
            <p className="text-xs text-gray-500">
              {sessionId ? `Session: ${sessionId.slice(0, 8)}…` : 'Connecting…'}
            </p>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              sessionId ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 text-sm mt-20">
              <p className="text-2xl mb-2">⚡</p>
              <p>Describe the APEX app you want to build.</p>
              <p className="text-xs mt-1">
                e.g. "Build me an employee directory app"
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Loading bubble */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error bar */}
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
              onChange={(e) => setInput(e.target.value)}
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

      {/* ── RIGHT PANEL — Preview ── */}
      <div className="flex flex-col w-1/2 bg-gray-950">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-800 bg-gray-900">
          <h2 className="text-sm font-semibold text-white">Live Preview</h2>
          <p className="text-xs text-gray-500">App plan will appear here</p>
        </div>

        {/* Preview content */}
        <div className="flex-1 flex items-center justify-center text-gray-700">
          <div className="text-center">
            <p className="text-4xl mb-3">🖥</p>
            <p className="text-sm">Preview coming in Day 4</p>
            <p className="text-xs mt-1">AI will return structured JSON plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
