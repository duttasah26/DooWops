import { useState, useEffect } from "react";
import WebPlayback from "./WebPlayback";
import "./App.css";

const MOCK_PLAYLIST_ID = "6utZxFzH2JKGp944C3taxO";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function App() {
  const [token, setToken] = useState("");
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    console.log("🌐 Full window.location.hash:", hash);

    let token = localStorage.getItem("spotify_token");

    if (!token && hash) {
      const params = new URLSearchParams(hash.substring(1));
      token = params.get("access_token");

      if (token) {
        console.log("🔐 Storing new access token:", token);
        localStorage.setItem("spotify_token", token);
        window.history.replaceState(null, null, " ");
      }
    }

    if (token) {
      console.log("✅ Using stored token:", token);
      setToken(token);
    } else {
      console.log("❌ No token found in localStorage or URL");
    }
  }, []);

  const fetchRandomTracks = async () => {
    const res = await fetch(`${BACKEND_URL}/api/playlist/${MOCK_PLAYLIST_ID}`);
    const data = await res.json();
    setTracks(data.tracks);
    setCurrentIndex(0);
    setSelectedTrack(null);
  };

  useEffect(() => {
    if (token) fetchRandomTracks();
  }, [token]);

  const currentTrack = tracks[currentIndex]?.track;

  const handleSkip = () => {
    if (currentIndex < tracks.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedTrack(null); // Deselect if you're skipping
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6 font-sans">
      <h1 className="text-3xl font-bold text-center">🎵 Doowops</h1>

      {!token && (
        <div className="text-center mt-4">
          <a
            href="http://localhost:5000/auth/login"
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Login with Spotify
          </a>
        </div>
      )}

      {token && currentTrack && (
        <div className="p-4 border rounded-xl shadow bg-white space-y-4">
          <img
            src={currentTrack.album.images[0].url}
            alt={currentTrack.name}
            className="rounded w-full"
          />
          <h2 className="text-xl font-semibold">{currentTrack.name}</h2>
          <p className="text-sm text-gray-500">
            {currentTrack.artists.map((a) => a.name).join(", ")}
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => setSelectedTrack(currentTrack)}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Select This Song
            </button>

            <button
              disabled={currentIndex >= tracks.length - 1}
              onClick={handleSkip}
              className="px-4 py-2 border rounded"
            >
              ⏭ Skip
            </button>
          </div>

          <WebPlayback
            token={token}
            trackUri={currentTrack.uri}
            onReady={setDeviceId}
          />
        </div>
      )}

      {selectedTrack && (
        <div className="mt-6 p-4 border rounded-xl bg-green-100">
          <h3 className="text-lg font-bold">✅ You Selected:</h3>
          <p className="text-base">{selectedTrack.name}</p>
          <p className="text-sm text-gray-600">
            {selectedTrack.artists.map((a) => a.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
