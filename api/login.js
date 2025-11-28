// api/login.js

module.exports = (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const scope = [
    "user-read-currently-playing",
    "user-read-playback-state"
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri
  });

  const url = "https://accounts.spotify.com/authorize?" + params.toString();
  res.writeHead(302, { Location: url });
  res.end();
};
