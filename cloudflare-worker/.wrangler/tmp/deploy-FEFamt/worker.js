var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.mjs
var GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
var GITHUB_TOKEN = "https://github.com/login/oauth/access_token";
function generateState() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
__name(generateState, "generateState");
function createOAuth(env) {
  return {
    authorizeURL: /* @__PURE__ */ __name(({ redirect_uri, scope, state }) => {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri,
        scope,
        state
      });
      return `${GITHUB_AUTHORIZE}?${params.toString()}`;
    }, "authorizeURL"),
    getToken: /* @__PURE__ */ __name(async ({ code, redirect_uri }) => {
      const response = await fetch(GITHUB_TOKEN, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri,
          grant_type: "authorization_code"
        })
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(json.error_description || json.error);
      }
      return json.access_token;
    }, "getToken")
  };
}
__name(createOAuth, "createOAuth");
async function handleAuth(url, env) {
  const provider = url.searchParams.get("provider");
  if (provider !== "github") {
    return new Response("Invalid provider", { status: 400 });
  }
  const oauth2 = createOAuth(env);
  const authorizationUri = oauth2.authorizeURL({
    redirect_uri: `https://${url.hostname}/callback`,
    scope: "public_repo,user",
    // Use 'repo,user' for private repos, 'public_repo,user' for public
    state: generateState()
  });
  return new Response(null, {
    headers: { "Location": authorizationUri },
    status: 301
  });
}
__name(handleAuth, "handleAuth");
function callbackScriptResponse(status, token) {
  return new Response(
    `
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
  <\/script>
</head>
<body>
  <p>Authorizing Decap...</p>
</body>
</html>`,
    {
      headers: { "Content-Type": "text/html" }
    }
  );
}
__name(callbackScriptResponse, "callbackScriptResponse");
async function handleCallback(url, env) {
  const provider = url.searchParams.get("provider");
  if (provider !== "github") {
    return new Response("Invalid provider", { status: 400 });
  }
  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("Missing code", { status: 400 });
  }
  try {
    const oauth2 = createOAuth(env);
    const accessToken = await oauth2.getToken({
      code,
      redirect_uri: `https://${url.hostname}/callback`
    });
    return callbackScriptResponse("success", accessToken);
  } catch (error) {
    console.error("OAuth error:", error);
    return callbackScriptResponse("error", error.message);
  }
}
__name(handleCallback, "handleCallback");
function makeCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
__name(makeCorsHeaders, "makeCorsHeaders");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: makeCorsHeaders()
      });
    }
    if (path === "/auth" || path === "/auth/login") {
      return handleAuth(url, env);
    }
    if (path === "/callback") {
      return handleCallback(url, env);
    }
    return new Response("Decap CMS OAuth Proxy", {
      headers: makeCorsHeaders()
    });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
