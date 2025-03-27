import { useEffect, useState } from "react";

const WebPlayback = ({ token, trackUri, onReady }) => {
  const [player, setPlayer] = useState(undefined);
  const [isPaused, setPaused] = useState(false);
  const [isActive, setActive] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [deviceId, setDeviceId] = useState(null);

  // Load SDK and initialize player
  useEffect(() => {
    if (!window.Spotify) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "Doowops Player",
        getOAuthToken: cb => cb(token),
        volume: 0.8,
      });

      setPlayer(player);

      player.addListener("ready", ({ device_id }) => {
        console.log("✅ Ready with Device ID", device_id);
        setDeviceId(device_id);
        localStorage.setItem("spotify_device_id", device_id);
        onReady(device_id);
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        setPaused(state.paused);
        setPosition(state.position);
        setDuration(state.duration);
        setActive(true);
      });

      player.connect();
    };

    return () => {
      if (player) player.disconnect();
    };
  }, [token]);

  // Play new song when trackUri changes
  useEffect(() => {
    if (deviceId && trackUri) {
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        body: JSON.stringify({ uris: [trackUri] }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).catch(err => console.error("⚠️ Error playing track", err));
    }
  }, [trackUri, deviceId]);

  const handleSeek = (e) => {
    const newPos = (e.target.value / 100) * duration;
    player.seek(newPos);
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
    <div className="mt-4 space-y-4">
      <input
        type="range"
        min="0"
        max="100"
        value={(position / duration) * 100}
        onChange={handleSeek}
        className="w-full"
      />
      <div className="flex justify-center">
        <button
          onClick={() => player.togglePlay()}
          className="px-6 py-2 bg-green-500 text-white rounded"
        >
          {isPaused ? "▶️ Play" : "⏸ Pause"}
        </button>
      </div>
    </div>
  );
};

export default WebPlayback;

