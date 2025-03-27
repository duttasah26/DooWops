import { useState, useEffect } from "react";
import WebPlayback from "./WebPlayback";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { FaForward, FaVolumeUp } from "react-icons/fa";
import "./App.css";

const MOCK_PLAYLIST_ID = "6utZxFzH2JKGp944C3taxO";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function App() {
  const [token, setToken] = useState("");
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [volume, setVolume] = useState(80);

  useEffect(() => {
    const hash = window.location.hash;
    let storedToken = localStorage.getItem("spotify_token");

    if (!storedToken && hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        localStorage.setItem("spotify_token", token);
        setToken(token);
        window.history.replaceState(null, null, " ");
      }
    } else if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchRandomTracks = async () => {
    const res = await fetch(`${BACKEND_URL}/api/playlist/${MOCK_PLAYLIST_ID}`);
    const data = await res.json();
    setTracks(data.tracks);
    setCurrentIndex(0);
  };

  const reset = () => {
    setSelectedTrack(null);
    fetchRandomTracks();
  };

  useEffect(() => {
    if (token) fetchRandomTracks();
  }, [token]);

  const currentTrack = tracks[currentIndex]?.track;

  useEffect(() => {
    const autoPlay = async () => {
      if (!deviceId || !currentTrack || !token) return;
      try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: "PUT",
          body: JSON.stringify({ uris: [currentTrack.uri] }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("🛑 Failed to autoplay:", err);
      }
    };

    autoPlay();
  }, [deviceId, currentTrack, token]);

  return (
    <div className="min-h-screen w-full relative bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      {/* Particle Background */}
      <Particles
        id="tsparticles"
        init={loadSlim}
        options={{
          background: { color: "#00000000" },
          fpsLimit: 60,
          particles: {
            color: { value: "#ffffff" },
            links: {
              enable: true,
              color: "#ffffff",
              distance: 150,
              opacity: 0.1,
              width: 1,
            },
            move: { enable: true, speed: 0.6 },
            number: { value: 30 },
            size: { value: { min: 1, max: 2 } },
            opacity: { value: 0.3 },
          },
        }}
      />

      {/* Header */}
      <header className="absolute top-6 left-6 z-50">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <span>🎵</span> <span>Doowops</span>
        </h1>
      </header>

      {/* Your Choice */}
      {selectedTrack && (
        <div className="absolute top-6 right-6 bg-slate-800 p-3 rounded flex items-center space-x-3 shadow-lg z-50">
          <img src={selectedTrack.album.images[2]?.url} alt="thumb" className="w-12 h-12 rounded" />
          <div>
            <p className="text-xs text-gray-400 font-semibold">YOUR CHOICE:</p>
            <p className="text-sm font-semibold">{selectedTrack.name}</p>
            <p className="text-xs text-gray-300">
              {selectedTrack.artists.map((a) => a.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Player */}
      <main className="flex flex-col items-center justify-start pt-28 pb-20 px-4">
        {token && currentTrack && (
          <div className="p-4 border rounded-xl shadow bg-zinc-900 text-white space-y-4 relative max-w-md w-full">
            <div className="relative">
              <img src={currentTrack.album.images[0].url} alt={currentTrack.name} className="rounded w-full" />
              <button
                disabled={currentIndex >= tracks.length - 1}
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="absolute top-1/2 right-[-2rem] transform -translate-y-1/2 text-purple-500 bg-white p-3 rounded-full shadow-lg text-4xl hover:scale-110 transition-all duration-200"
              >
                <FaForward />
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-semibold">{currentTrack.name}</h2>
              <p className="text-sm text-gray-300">
                {currentTrack.artists.map((a) => a.name).join(", ")}
              </p>
            </div>

            <WebPlayback token={token} trackUri={currentTrack.uri} onReady={setDeviceId} volume={volume} />

            <div className="flex gap-4 justify-center mt-4">
              <button
                disabled={!!selectedTrack}
                onClick={() => setSelectedTrack(currentTrack)}
                className={`px-4 py-2 ${selectedTrack ? "bg-gray-500" : "bg-green-600"} text-white rounded`}
              >
                Select This Song
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        )}

        {!token && (
          <div className="text-center mt-6">
            <a
              href={`${BACKEND_URL}/auth/login`}
              className="bg-green-600 px-6 py-2 text-white rounded"
            >
              Login with Spotify
            </a>
          </div>
        )}
      </main>

      {/* Volume Control */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <FaVolumeUp className="text-gray-400" />
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
          className="w-32"
        />
      </div>
    </div>
  );
}
