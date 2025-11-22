// Cloudflare Worker OAuth proxy for Decap CMS (based on sterlingwes/decap-proxy)
const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_API = 'https://api.github.com';

// Generate a simple random state
function generateState() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Create OAuth client
function createOAuth(env) {
  return {
    authorizeURL: ({ redirect_uri, scope, state }) => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri,
        scope,
        state
      });
      return `${GITHUB_AUTHORIZE}?${params.toString()}`;
    },
    
    getToken: async ({ code, redirect_uri }) => {
      const response = await fetch(GITHUB_TOKEN, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri,
          grant_type: 'authorization_code'
        })
      });
      
      const json = await response.json();
      if (json.error) {
        throw new Error(json.error_description || json.error);
      }
      return json.access_token;
    }
  };
}

// Handle auth request
async function handleAuth(url, env) {
  let provider = url.searchParams.get('provider');
  // Default to github when provider is omitted for compatibility with
  // OAuth redirects that don't include the original provider param.
  if (!provider) provider = 'github';
  if (provider !== 'github') {
    return new Response('Invalid provider', { status: 400 });
  }

  const oauth2 = createOAuth(env);
  // Include the provider in the redirect_uri so GitHub will return it
  // to /callback (GitHub appends code & state to the provided redirect URI).
  const redirectUri = `https://${url.hostname}/callback?provider=${encodeURIComponent(provider)}`;
  const authorizationUri = oauth2.authorizeURL({
    redirect_uri: redirectUri,
    scope: 'public_repo', // Use 'repo,user' for private repos, 'public_repo,user' for public
    state: generateState()
  });

  return new Response(null, { 
    headers: { 'Location': authorizationUri }, 
    status: 301 
  });
}

// Create callback response with the specific script that Decap CMS expects
function callbackScriptResponse(status, token) {
  return new Response(`
<html>
<head>
  <script>
    const receiveMessage = (message) => {
      window.opener.postMessage(
        'authorization:github:${status}:${JSON.stringify({ token })}',
        '*'
      );
      window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  </script>
</head>
<body>
  <p>Authorizing Decap...</p>
</body>
</html>`, 
    { 
      headers: { 'Content-Type': 'text/html' } 
    }
  );
}

// Handle callback
async function handleCallback(url, env) {
  let provider = url.searchParams.get('provider');
  // Allow missing provider (fall back to github) for compatibility.
  if (!provider) provider = 'github';
  if (provider !== 'github') {
    return new Response('Invalid provider', { status: 400 });
  }

  const code = url.searchParams.get('code');
  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  try {
    const oauth2 = createOAuth(env);
    const redirectUri = `https://${url.hostname}/callback?provider=${encodeURIComponent(provider)}`;
    const accessToken = await oauth2.getToken({
      code,
      redirect_uri: redirectUri
    });
    
    return callbackScriptResponse('success', accessToken);
  } catch (error) {
    console.error('OAuth error:', error);
    return callbackScriptResponse('error', error.message);
  }
}

function makeCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204, 
        headers: makeCorsHeaders() 
      });
    }

    // Handle auth endpoint (both /auth and /auth/login for compatibility)
    if (path === '/auth' || path === '/auth/login') {
      return handleAuth(url, env);
    }

    // Handle callback
    if (path === '/callback') {
      return handleCallback(url, env);
    }

    // Default response
    return new Response('Decap CMS OAuth Proxy', { 
      headers: makeCorsHeaders() 
    });
  }
};