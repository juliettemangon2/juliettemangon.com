// api/now-playing.js

module.exports = async (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!refreshToken) {
    res.statusCode = 500;
    res.end("SPOTIFY_REFRESH_TOKEN is not set");
    return;
  }

  const basicAuth = Buffer.from(clientId + ":" + clientSecret).toString("base64");

  // 1. Exchange refresh token for access token
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + basicAuth,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  const tokenData = await tokenResponse.json();

  // 2. Call currently-playing endpoint
  const nowPlayingResponse = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: {
        Authorization: "Bearer " + tokenData.access_token
      }
    }
  );

  // No content or error
  if (nowPlayingResponse.status === 204 || nowPlayingResponse.status >= 400) {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    res.end(JSON.stringify({ isPlaying: false }));
    return;
  }

  const song = await nowPlayingResponse.json();

  const responseData = {
    isPlaying: song.is_playing,
    title: song.item.name,
    artist: song.item.artists.map(a => a.name).join(", "),
    album: song.item.album.name,
    albumArt: song.item.album.images[0]?.url || null,
    url: song.item.external_urls.spotify
  };

  res.setHeader("Content-Type", "application/json");
  res.statusCode = 200;
  res.end(JSON.stringify(responseData));
};
