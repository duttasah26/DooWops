// === Load .env config and initialize dependencies ===
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

// === In-memory state (simple implementation for single user/global) ===
let latest_token = null;             // Most recent Spotify access token
let latest_refresh_token = null;     // Most recent Spotify refresh token
const playlistCache = {};            // Playlist cache for efficiency
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Playlist cache is valid for 24 hours

app.use(cors());
app.use(express.json());

// ~~~ Start server~~~
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ~~~Begin Spotify Auth (Step 1) ~~~
app.get("/auth/login", (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const scope = [
    "streaming", "user-read-email", "user-read-private", "user-modify-playback-state",
    "user-read-playback-state", "user-read-currently-playing", "app-remote-control",
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

// ~~~ Spotify Auth Callback: Store both access and refresh tokens ~~~
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
      Authorization: "Basic " +
        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      latest_token = body.access_token;
      latest_refresh_token = body.refresh_token; // <-- now store refresh token
      res.redirect(`http://localhost:5173/#access_token=${latest_token}`);
    } else {
      console.error("Token exchange failed:", body);
      res.redirect("/error");
    }
  });
});

// ~~~ Helper: Refresh the access token using the Spotify refresh token ~~~
function refreshAccessToken() {
  return new Promise((resolve, reject) => {
    if (!latest_refresh_token) return reject(new Error("No refresh token available"));

    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        grant_type: "refresh_token",
        refresh_token: latest_refresh_token,
      },
      headers: {
        Authorization: "Basic " +
          Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        latest_token = body.access_token;
        // Some responses may return a new refresh token (rare), handle if present
        if (body.refresh_token) {
          latest_refresh_token = body.refresh_token;
        }
        resolve();
      } else {
        reject(new Error("Failed to refresh access token"));
      }
    });
  });
}

// ~~~ Main API: Fetch N random tracks from a playlist (with refresh logic) ~~~
app.get("/api/playlist/:playlistId", async (req, res) => {
  const playlistId = req.params.playlistId;
  const now = Date.now();

  // Serve cached playlist if available and still fresh
  const cacheEntry = playlistCache[playlistId];
  if (cacheEntry && now < cacheEntry.expiresAt) {
    return res.json({ tracks: pickRandomTracks(cacheEntry.tracks, 3) });
  }

  // Helper to fetch tracks from Spotify API
  async function fetchFromSpotifyApi(token) {
    const allTracks = [];
    let offset = 0;
    const limit = 100; // Spotify max per request

    // Paginate over all tracks
    while (true) {
      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const items = response.data.items;
      if (!items || !items.length) break;
      allTracks.push(...items);
      offset += limit;
    }

    // Cache playlist for 24 hours
    playlistCache[playlistId] = {
      tracks: allTracks,
      expiresAt: now + CACHE_TTL_MS,
    };
    return allTracks;
  }

  // Try to fetch playlist and retry once if token expired
  try {
    const tracks = await fetchFromSpotifyApi(latest_token);
    res.json({ tracks: pickRandomTracks(tracks, 3) });
  } catch (err) {
    // If error is unauthorized, attempt to refresh and retry ONCE
    if (err.response && err.response.status === 401) {
      try {
        await refreshAccessToken();
        const tracks = await fetchFromSpotifyApi(latest_token);
        res.json({ tracks: pickRandomTracks(tracks, 3) });
      } catch (refreshErr) {
        console.error("Failed to refresh token and fetch playlist:", refreshErr.message);
        res.status(500).json({ error: "Unable to refresh token" });
      }
    } else {
      console.error("Failed to fetch playlist:", err.message);
      res.status(500).json({ error: "Failed to fetch playlist" });
    }
  }
});

// ~~~ Helper Function: Pick N random tracks ~~~
function pickRandomTracks(tracks, count = 3) {
  const shuffled = [...tracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

