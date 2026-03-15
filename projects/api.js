const BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}, sessionId = '') {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'x-session-id': sessionId } : {}),
      ...options.headers,
    },
    ...options,
  })

  const data = await res.json()

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }

  return data
}

export async function decodePhrase(phrase, context = '', sessionId) {
  return request(
    '/decode',
    {
      method: 'POST',
      body: JSON.stringify({ phrase, context }),
    },
    sessionId
  )
}

export async function fetchHistory(sessionId) {
  return request('/history', {}, sessionId)
}

export async function deleteHistoryEntry(id, sessionId) {
  return request(`/history/${id}`, { method: 'DELETE' }, sessionId)
}

export async function clearAllHistory(sessionId) {
  return request('/history', { method: 'DELETE' }, sessionId)
}