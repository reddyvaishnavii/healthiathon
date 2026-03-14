#!/usr/bin/env node
/**
 * Phase 1 Automated Test Runner
 * Run this script to verify backend and frontend are working correctly
 * 
 * Usage: node test-runner.js
 */

const http = require('http')

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, label, message) {
  console.log(`${color}${label}\t${message}${COLORS.reset}`)
}

function testEndpoint(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    http.get(url, (res) => {
      const latency = Date.now() - startTime
      const success = res.statusCode === expectedStatus
      
      if (success) {
        log(COLORS.green, '✅', `${url} (${res.statusCode}) - ${latency}ms`)
        resolve(true)
      } else {
        log(COLORS.red, '❌', `${url} (${res.statusCode}) - Expected ${expectedStatus}`)
        resolve(false)
      }
    }).on('error', (err) => {
      log(COLORS.red, '❌', `${url} - ${err.message}`)
      resolve(false)
    })
  })
}

async function runTests() {
  console.clear()
  console.log(`${COLORS.cyan}`)
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║     Phase 1: WebSocket Real-Time Foundation - Test Suite    ║')
  console.log('║                     Test Runner v1.0                         ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log(`${COLORS.reset}\n`)
  
  const results = {
    backend: false,
    frontend: false,
    routes: []
  }
  
  // Test 1: Backend Health
  console.log(`${COLORS.blue}[TEST 1] Backend Health Check${COLORS.reset}`)
  log(COLORS.yellow, '🧪', 'Testing http://localhost:3001/health...')
  results.backend = await testEndpoint('http://localhost:3001/health', 200)
  console.log()
  
  // Test 2: Frontend
  console.log(`${COLORS.blue}[TEST 2] Frontend Server${COLORS.reset}`)
  log(COLORS.yellow, '🧪', 'Testing http://localhost:5173...')
  results.frontend = await testEndpoint('http://localhost:5173', 200)
  console.log()
  
  // Test 3: API Routes
  console.log(`${COLORS.blue}[TEST 3] API Route Tests${COLORS.reset}`)
  
  const routes = [
    { path: '/api/decode', method: 'POST', desc: 'Decode endpoint' },
    { path: '/api/history', method: 'GET', desc: 'History retrieval' }
  ]
  
  for (const route of routes) {
    log(COLORS.yellow, '🧪', `Testing ${route.method} ${route.path}...`)
    const success = await testEndpoint(`http://localhost:3001${route.path}`, 200)
    results.routes.push({ path: route.path, success })
  }
  console.log()
  
  // Summary
  console.log(`${COLORS.blue}═════════════════════════════════════════════════════════════${COLORS.reset}`)
  console.log(`${COLORS.blue}[SUMMARY]${COLORS.reset}\n`)
  
  const allPass = results.backend && results.frontend
  
  if (allPass) {
    log(COLORS.green, '✅', 'All critical services are running!')
    console.log(`
${COLORS.green}Phase 1 Status: READY FOR TESTING${COLORS.reset}

Next steps:
1. Open http://localhost:5173 in your browser
2. Go to the "Live" tab
3. Click "Start Live Analysis"
4. Allow camera/microphone access
5. Watch frames transmit in real-time!

WebSocket Connection: ${results.backend ? '✅ Ready' : '❌ Failed'}
Frontend Server: ${results.frontend ? '✅ Ready' : '❌ Failed'}
`)
  } else {
    log(COLORS.red, '❌', 'Some services are not responding!')
    console.log(`
${COLORS.red}Services Status:${COLORS.reset}
- Backend (Port 3001): ${results.backend ? '✅ Running' : '❌ NOT RUNNING'}
- Frontend (Port 5173): ${results.frontend ? '✅ Running' : '❌ NOT RUNNING'}

${COLORS.yellow}To fix:${COLORS.reset}
1. Backend: cd backend && npm run dev
2. Frontend: cd frontend && npm run dev
`)
  }
  
  console.log(`${COLORS.blue}═════════════════════════════════════════════════════════════${COLORS.reset}\n`)
  
  process.exit(allPass ? 0 : 1)
}

runTests().catch(err => {
  log(COLORS.red, '❌', `Test runner error: ${err.message}`)
  process.exit(1)
})
