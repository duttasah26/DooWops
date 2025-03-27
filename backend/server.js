require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const axios = require("axios");
const request = require("request");

const app = express();

const PORT = process.env.PORT || 5000;
const REDIRECT_URI = "http://localhost:5000/auth/callback";
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let latest_token = null;

app.use(cors());
app.use(express.json());

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log(`👤 User connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// 🔐 Redirect to Spotify Login
app.get("/auth/login", (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const scope = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-modify-playback-state",
    "user-read-playback-state"
  ].join(" ");

  const query = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope,
    redirect_uri: REDIRECT_URI,
    state,
  });

  console.log("🔗 Redirecting to Spotify with query:", query.toString());
  res.redirect(`https://accounts.spotify.com/authorize?${query.toString()}`);
});

// 🎧 Spotify Redirect Callback
app.get("/auth/callback", (req, res) => {
    const code = req.query.code || null;
    console.log("📥 Received code from Spotify:", code);
  
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
        const access_token = body.access_token;
        latest_token = access_token;
  
        console.log("🔐 Access token from Spotify:", access_token);
  
        // ✅ Redirect back to frontend with access_token in URL **hash**
        res.redirect(`http://localhost:5173/#access_token=${access_token}`);
      } else {
        console.error("❌ Token exchange failed:", body);
        res.redirect("/error");
      }
    });
  });
  

// 🎫 Frontend Token Polling
app.get("/auth/token", (req, res) => {
  console.log("🔍 /auth/token requested");
  if (latest_token) {
    console.log("✅ Returning token");
    res.json({ access_token: latest_token });
  } else {
    console.log("❌ No token available to return");
    res.status(404).json({ error: "No token available" });
  }
});

// 🎶 Fetch Playlist & Random Tracks
app.get("/api/playlist/:playlistId", async (req, res) => {
  const playlistId = req.params.playlistId;
  console.log("🎵 Fetching playlist:", playlistId);

  try {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    let allTracks = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const items = response.data.items;
      if (!items.length) break;

      allTracks.push(...items);
      offset += limit;
    }

    const randomTracks = pickRandomTracks(allTracks, 3);
    res.json({ tracks: randomTracks });

  } catch (err) {
    console.error("❌ Error fetching playlist tracks:", err.message);
    res.status(500).json({ error: "Playlist fetch failed" });
  }
});

function pickRandomTracks(tracks, count = 2) {
  const shuffled = [...tracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
