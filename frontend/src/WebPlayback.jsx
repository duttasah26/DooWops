// WebPlayback.jsx
import { useEffect, useState } from "react";
import { FaPlay, FaPause } from "react-icons/fa";

const WebPlayback = ({ token, trackUri, onReady, volume }) => {
  const [player, setPlayer] = useState(undefined);
  const [isPaused, setPaused] = useState(false);
  const [isActive, setActive] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  // Update player volume when prop changes
  useEffect(() => {
    if (player && volume != null) {
      player.setVolume(volume / 100);
    }
  }, [volume, player]);

  useEffect(() => {
    if (!window.Spotify) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const playerInstance = new window.Spotify.Player({
        name: "Doowops Player",
        getOAuthToken: cb => cb(token),
        volume: volume / 100,
      });

      setPlayer(playerInstance);

      playerInstance.addListener("ready", ({ device_id }) => {
        onReady(device_id);
      });

      playerInstance.addListener("player_state_changed", (state) => {
        if (!state) return;
        setPaused(state.paused);
        setPosition(state.position);
        setDuration(state.duration);
        setActive(true);
      });

      playerInstance.connect();
    };

    return () => {
      if (player) player.disconnect();
    };
  }, [token]);

  const handleSeek = (e) => {
    const newPos = (e.target.value / 100) * duration;
    player.seek(newPos);
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!isActive) {
    return (
      <div className="text-center p-8">
        <p className="text-xl font-semibold">🔌 Connect to a Spotify Device</p>
        <p className="text-gray-500">Open Spotify and choose "Doowops Player".</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm w-12 text-right">{formatTime(position)}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={(position / duration) * 100}
          onChange={handleSeek}
          className="w-full"
        />
        <span className="text-sm w-12">{formatTime(duration)}</span>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => player.togglePlay()}
          className="px-6 py-2 bg-green-600 text-white rounded text-xl flex items-center justify-center gap-2"
        >
          {isPaused ? <FaPlay /> : <FaPause />}
        </button>
      </div>
    </div>
  );
};

export default WebPlayback;

