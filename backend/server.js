require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const request = require("request");

const app = express();
const PORT = process.env.PORT || 5000;
const REDIRECT_URI = "http://localhost:5000/auth/callback";
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let latest_token = null;
const playlistCache = {};
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

app.get("/auth/login", (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const scope = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-modify-playback-state",
    "user-read-playback-state",
    "user-read-currently-playing",
    "app-remote-control",
    "playlist-read-private"
  ].join(" ");

  const query = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope,
    redirect_uri: REDIRECT_URI,
    state,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${query.toString()}`);
});

app.get("/auth/callback", (req, res) => {
  const code = req.query.code || null;

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      latest_token = body.access_token;
      res.redirect(`http://localhost:5173/#access_token=${latest_token}`);
    } else {
      console.error("Token exchange failed:", body);
      res.redirect("/error");
    }
  });
});

app.get("/api/playlist/:playlistId", async (req, res) => {
  const playlistId = req.params.playlistId;
  const now = Date.now();

  const cacheEntry = playlistCache[playlistId];
  if (cacheEntry && now < cacheEntry.expiresAt) {
    return res.json({ tracks: pickRandomTracks(cacheEntry.tracks, 3) });
  }

  try {
    const token = latest_token;
    const allTracks = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const items = response.data.items;
      if (!items.length) break;

      allTracks.push(...items);
      offset += limit;
    }

    playlistCache[playlistId] = {
      tracks: allTracks,
      expiresAt: now + CACHE_TTL_MS,
    };

    res.json({ tracks: pickRandomTracks(allTracks, 3) });
  } catch (err) {
    console.error("Failed to fetch playlist:", err.message);
    res.status(500).json({ error: "Failed to fetch playlist" });
  }
});

function pickRandomTracks(tracks, count = 3) {
  const shuffled = [...tracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
