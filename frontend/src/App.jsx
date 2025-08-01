import { useState, useEffect } from "react";
import WebPlayback from "./WebPlayback";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { FaRedo, FaSpotify, FaForward, FaCheck } from "react-icons/fa";
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
    const storedToken = localStorage.getItem("spotify_token");
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
    setSelectedTrack(null);
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
    <div className="min-h-screen w-screen relative bg-gradient-to-br from-purple-900 to-black text-white overflow-x-hidden">
      <Particles
        id="tsparticles"
        init={loadSlim}
        options={{
          background: { color: "transparent" },
          fpsLimit: 60,
          particles: {
            color: { value: "#ffffff" },
            links: { enable: true, color: "#ffffff", distance: 150, opacity: 0.2, width: 1 },
            move: { enable: true, speed: 0.5 },
            number: { value: 40 },
            opacity: { value: 0.3 },
            size: { value: { min: 1, max: 3 } },
          },
        }}
      />

      {/* Doowops Logo */}
      <div className="absolute top-4 left-6 flex items-center gap-2 z-50">
        <FaSpotify className="text-green-500 text-3xl" />
        <h1 className="text-3xl font-bold">DooWops</h1>
      </div>

      {/* Selected Track Card */}
      {selectedTrack && (
        <div className="absolute top-4 right-6 bg-gray-900 p-3 rounded flex items-center space-x-3 shadow-lg z-50">
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

      {/* Main Content */}
      <div className="flex flex-col items-center justify-start mt-32 relative z-40">
        {token && currentTrack ? (
          <div className="w-full max-w-md px-4 space-y-4">
            <div className="bg-zinc-900 rounded-lg p-4 shadow-xl relative">
              <img src={currentTrack.album.images[0].url} alt="cover" className="rounded w-full" />
              <h2 className="text-xl font-semibold mt-2 text-center">{currentTrack.name}</h2>
              <p className="text-sm text-gray-300 text-center">
                {currentTrack.artists.map((a) => a.name).join(", ")}
              </p>

              <p className="text-center text-sm text-purple-300 mt-2">
                Track {currentIndex + 1}/3
              </p>

              <WebPlayback
                token={token}
                trackUri={currentTrack.uri}
                onReady={setDeviceId}
              />

              <div className="flex justify-between items-center mt-4">
                <button
                  disabled={!!selectedTrack}
                  onClick={() => setSelectedTrack(currentTrack)}
                  className="text-green-400 text-2xl hover:scale-110 transition-all"
                  title="Pick Song"
                >
                  <FaCheck />
                </button>

                <button
                  disabled={currentIndex >= tracks.length - 1}
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="text-red-400 text-2xl hover:scale-110 transition-all"
                  title="Next Song"
                >
                  <FaForward />
                </button>
              </div>
            </div>
          </div>
        ) : (
          token && (
            <div className="text-center mt-10 text-gray-400 text-lg">
              🚫 No more songs to play. Click reset below to restart.
            </div>
          )
        )}

        {!token && (
          <div className="text-center mt-10">
            <a
              href={`${BACKEND_URL}/auth/login`}
              className="bg-green-600 px-6 py-2 text-white rounded"
            >
              Login with Spotify
            </a>
          </div>
        )}
      </div>

      {/* Bottom Left Reset */}
      <div className="absolute bottom-6 left-6 z-50">
        <button
          onClick={fetchRandomTracks}
          className="text-white text-2xl hover:text-blue-400 transition-all"
          title="Reset"
        >
          <FaRedo />
        </button>
      </div>
    </div>
  );
}
