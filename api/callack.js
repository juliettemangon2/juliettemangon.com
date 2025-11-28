// api/callback.js

module.exports = async (req, res) => {
  const code = req.query.code;

  if (!code) {
    res.statusCode = 400;
    res.end("Missing code parameter");
    return;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  const basicAuth = Buffer.from(clientId + ":" + clientSecret).toString("base64");

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + basicAuth,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri
    })
  });

  const data = await tokenResponse.json();

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.statusCode = 200;
  res.end(
    "<h1>Spotify tokens</h1><pre>" +
      JSON.stringify(data, null, 2) +
      "</pre><p>Copy the <strong>refresh_token</strong> and add it in Vercel as SPOTIFY_REFRESH_TOKEN.</p>"
  );
};
