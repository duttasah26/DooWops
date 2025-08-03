import { useState, useEffect } from "react";
import GamePage from "./GamePage";
import LoginPage from "./LoginPage";
import Lobby from "./Lobby";
import Scoreboard from "./Scoreboard";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { FaSpotify } from "react-icons/fa";
import "./App.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function App() {
  // Auth
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState(false);
  const [loading, setLoading] = useState(true);

  // App/game phase management
  const [phase, setPhase] = useState("lobby"); // "lobby", "game", "scoreboard"
  const [gameSettings, setGameSettings] = useState(null);
  const [finalPicks, setFinalPicks] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    const storedToken = localStorage.getItem("spotify_token");
    if (!storedToken && hash) {
      const params = new URLSearchParams(hash.substring(1));
      const t = params.get("access_token");
      if (t) {
        localStorage.setItem("spotify_token", t);
        setToken(t);
        window.history.replaceState(null, null, " ");
      }
    } else if (storedToken) {
      setToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const verify = async () => {
      setLoading(true);
      try {
        // Use any playlist for quick check
        const res = await fetch(`${BACKEND_URL}/api/playlist/6utZxFzH2JKGp944C3taxO`);
        if (!res.ok) {
          setTokenError(true);
          setToken("");
          localStorage.removeItem("spotify_token");
        } else {
          setTokenError(false);
        }
      } catch (err) {
        setTokenError(true);
        setToken("");
        localStorage.removeItem("spotify_token");
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-black text-white">
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
        <div className="absolute top-4 left-6 flex items-center gap-2 z-50">
          <FaSpotify className="text-green-500 text-3xl" />
          <h1 className="text-3xl font-bold">DooWops</h1>
        </div>
        <h2 className="text-xl mt-24">Connecting to Spotify...</h2>
      </div>
    );
  }
  if (!token || tokenError) {
    return <LoginPage error={tokenError ? "Spotify session expired or authentication failed. Please log in again." : undefined} />;
  }

  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white flex flex-col items-center justify-center">
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
        <div className="absolute top-4 left-6 flex items-center gap-2 z-50">
          <FaSpotify className="text-green-500 text-3xl" />
          <h1 className="text-3xl font-bold">DooWops</h1>
        </div>
        <Lobby
          onStart={settings => {
            setGameSettings(settings);
            setFinalPicks(null);
            setPhase("game");
          }}
        />
      </div>
    );
  }

  if (phase === "game") {
    return (
      <GamePage
        token={token}
        playlistId={gameSettings.playlistId}
        player1={gameSettings.player1}
        player2={gameSettings.player2}
        numRounds={gameSettings.numRounds}
        setTokenError={setTokenError}
        onGameEnd={({ picks }) => {
          setFinalPicks(picks);
          setPhase("scoreboard");
        }}
      />
    );
  }

  if (phase === "scoreboard") {
    return (
      <Scoreboard
        player1={gameSettings.player1}
        player2={gameSettings.player2}
        picks={finalPicks}
        token={token}
      />
    );
  }

  return null;
}
