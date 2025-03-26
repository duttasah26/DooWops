import { useState, useEffect } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const MOCK_PLAYLIST_ID = "6utZxFzH2JKGp944C3taxO";

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);

  const fetchRandomTracks = async () => {
    const url = `${BACKEND_URL}/api/playlist/${MOCK_PLAYLIST_ID}`;
    const res = await fetch(url);
    const data = await res.json();
    setTracks(data.tracks);
    setCurrentIndex(0);
    setSelectedTrack(null);
  };

  const playFullTrack = async (uri) => {
    const token = localStorage.getItem("spotify_token");
    const device_id = localStorage.getItem("spotify_device_id");
    if (!token || !device_id) return alert("No token or device available");

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [uri] }),
      });
  };

  useEffect(() => {
    fetchRandomTracks();
  }, []);

  const currentTrack = tracks[currentIndex]?.track;

  const handleReset = () => {
    fetchRandomTracks();
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6 font-sans">
      <h1 className="text-3xl font-bold text-center">🎵 Doowops</h1>

      <div className="flex justify-center">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
        >
          🔁 Start Over
        </button>
      </div>

      {currentTrack ? (
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
              onClick={() => {
                setSelectedTrack(currentTrack);
                playFullTrack(currentTrack.uri);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Select This Song
            </button>

            <button
              disabled={currentIndex >= tracks.length - 1}
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="px-4 py-2 border rounded"
            >
              ⏭ Skip
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center">Loading...</p>
      )}

      {selectedTrack && (
        <div className="mt-6 p-4 border rounded-xl bg-green-100">
          <h3 className="text-lg font-bold">🎧 You Selected:</h3>
          <p className="text-base">{selectedTrack.name}</p>
          <p className="text-sm text-gray-600">
            {selectedTrack.artists.map((a) => a.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

