import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-faerion-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const FAERION_API_BASE = "http://team.heavencloud.in:2004/api"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url) 
    const endpoint = url.searchParams.get('endpoint')
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the target URL - endpoint should already have /api prefix removed by frontend
    const targetUrl = `${FAERION_API_BASE}${endpoint}`
    console.log(`[PROXY] ${req.method} to: ${targetUrl}`)

    // Get the Faerion auth token from custom header
    const faerionToken = req.headers.get('x-faerion-token')
    console.log(`[PROXY] Token received: ${faerionToken ? 'YES (length: ' + faerionToken.length + ')' : 'NO'}`)

    // Prepare headers for the backend request
    const backendHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    // Add Authorization header with Bearer token
    if (faerionToken) {
      backendHeaders['Authorization'] = `Bearer ${faerionToken}`
      console.log(`[PROXY] Sending Authorization: Bearer ${faerionToken.substring(0, 20)}...`)
    } else {
      console.log('[PROXY] WARNING: No token provided')
    }

    // Get request body for POST/PUT/DELETE
    let body: string | undefined
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.text()
      console.log(`[PROXY] Request body length: ${body?.length || 0}`)
    }

    // Make the request to Faerion API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: backendHeaders,
      body: body || undefined,
    })

    // Get response data
    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    console.log(`[PROXY] Response status: ${response.status}`)
    if (response.status !== 200 && response.status !== 201) {
      console.log(`[PROXY] Error response:`, responseData)
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: unknown) {
    console.error('[PROXY] Error:', error)
    const message = error instanceof Error ? error.message : 'Proxy request failed'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
