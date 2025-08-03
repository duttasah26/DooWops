import React, { useState, useEffect } from "react";
import { FaSpotify, FaPlus } from "react-icons/fa";

// If playlist covers ever have issues, you can hardcode backup images here.
const HARDCODED_PLAYLISTS = [
  {
    name: "9X-FM",
    id: "6utZxFzH2JKGp944C3taxO",
    url: "https://open.spotify.com/playlist/6utZxFzH2JKGp944C3taxO"
  },
  {
    name: "Sangeet Bangla FM",
    id: "5HmrH4b9CB1AgkQxqlkscV",
    url: "https://open.spotify.com/playlist/5HmrH4b9CB1AgkQxqlkscV"
  },
  {
    name: "106.2 AMAR FM",
    id: "42zqvt1YVP0hhErybNdDj1",
    url: "https://open.spotify.com/playlist/42zqvt1YVP0hhErybNdDj1"
  }
];
function extractPlaylistId(str) {
  if (!str) return "";
  let v = str.trim();
  if (v.startsWith("https://open.spotify.com/playlist/")) {
    v = v.split("/playlist/")[1].split("?")[0];
  }
  return v;
}
async function fetchPlaylistCover(playlistId, token) {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.images?.[0]?.url || null;
  } catch {
    return null;
  }
}

export default function GameStartScreen({ onStart, token }) {
  const [playlistCovers, setPlaylistCovers] = useState({});
  const [chosenId, setChosenId] = useState(HARDCODED_PLAYLISTS[0].id);
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customPlaylist, setCustomPlaylist] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [numRounds, setNumRounds] = useState(5);

  // Fetch covers ONCE per token
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const covers = {};
      for (const p of HARDCODED_PLAYLISTS) {
        covers[p.id] = null;
        try {
          const url = await fetchPlaylistCover(p.id, token);
          covers[p.id] = url;
        } catch {}
      }
      if (!cancelled) setPlaylistCovers(covers);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const activeIsCustom = customInputOpen;
  const activePlaylistId = activeIsCustom ? extractPlaylistId(customPlaylist) : chosenId;
  const playlistValid = activeIsCustom ? !!activePlaylistId : !!chosenId;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-black px-2">
      <div className="w-full max-w-2xl flex flex-col items-center py-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wide mb-7 text-center text-white">
          Start a 1v1
        </h2>
        {/* Playlists row */}
        <div className="flex flex-wrap justify-center gap-5 w-full mb-7">
          {HARDCODED_PLAYLISTS.map(p => (
            <button
              type="button"
              key={p.id}
              onClick={() => { setCustomInputOpen(false); setChosenId(p.id); }}
              className={`flex flex-col items-center rounded-lg border-2 bg-black hover:bg-zinc-900 px-2 py-3 transition-all focus:outline-none
                ${!activeIsCustom && chosenId === p.id ? "border-green-400 ring-2 ring-green-200" : "border-zinc-700"}
                `}
              style={{
                width: 132, minHeight: 178,
                boxShadow: (!activeIsCustom && chosenId === p.id) ? "0 0 0 3px #27efb055" : "none"
              }}
            >
              <div className="rounded-lg mb-2 overflow-hidden" style={{ width: 92, height: 92, background: "#171726" }}>
                {playlistCovers[p.id] ? (
                  <img src={playlistCovers[p.id]} alt={p.name} className="w-full h-full object-cover" style={{ minHeight: 92 }} />
                ) : (
                  <div className="flex items-center justify-center h-full w-full text-3xl text-purple-400">
                    <FaSpotify />
                  </div>
                )}
              </div>
              <span className="font-bold text-base text-white text-center">{p.name}</span>
              <a
                className="text-blue-400 text-xs underline mt-1"
                rel="noreferrer"
                target="_blank"
                href={p.url}
                onClick={e => e.stopPropagation()}
                tabIndex={-1}
              >
                View
              </a>
            </button>
          ))}
          {/* Custom Card */}
          <button
            type="button"
            onClick={() => setCustomInputOpen(true)}
            className={`flex flex-col items-center rounded-lg border-2 bg-black px-2 py-3 hover:bg-zinc-900 focus:outline-none transition-all
              ${activeIsCustom ? "border-green-400 ring-2 ring-green-200" : "border-zinc-700"}`}
            style={{
              width: 132, minHeight: 178
            }}
          >
            <div className="rounded-lg flex justify-center items-center mb-2" style={{ width: 92, height: 92, background: "#181820" }}>
              <FaPlus className={`text-4xl ${activeIsCustom ? "text-green-400" : "text-zinc-400"}`} />
            </div>
            <span className="font-bold text-base text-white">Custom Playlist</span>
          </button>
        </div>

        {activeIsCustom && (
          <div className="w-full flex flex-col gap-2 items-center mb-3">
            <input
              type="text"
              className="rounded px-3 py-2 text-black w-full max-w-xs text-base border border-green-500"
              placeholder="Spotify Playlist URL or ID"
              value={customPlaylist}
              onChange={e => setCustomPlaylist(e.target.value)}
              autoFocus
            />
            <span className="text-xs text-gray-400">Paste the playlist URL or ID</span>
          </div>
        )}

        {/* Player Names */}
        <div className="flex gap-3 items-center w-full mb-4">
          <input value={player1}
            onChange={e => setPlayer1(e.target.value)}
            placeholder="Player 1 name"
            className="p-3 rounded-lg text-black text-lg flex-1 outline-none min-w-0"
            autoComplete="off"
            style={{ minWidth: 0 }}
          />
          <span className="mx-1 font-bold text-white text-2xl">vs</span>
          <input value={player2}
            onChange={e => setPlayer2(e.target.value)}
            placeholder="Player 2 name"
            className="p-3 rounded-lg text-black text-lg flex-1 outline-none min-w-0"
            autoComplete="off"
            style={{ minWidth: 0 }}
          />
        </div>
        {/* Rounds */}
        <div className="mb-2 w-full flex flex-row items-center justify-center">
          <label className="text-white font-semibold">
            Rounds:
            <input
              type="number"
              className="ml-2 w-16 p-2 rounded text-black font-bold text-lg border border-zinc-400"
              min={2}
              max={10}
              value={numRounds}
              onChange={e => setNumRounds(Number(e.target.value))}
            />
          </label>
          <span className="text-xs ml-3 text-gray-400">(Last round: 5 songs!)</span>
        </div>
        <button
          className={`mt-4 w-full text-center bg-green-600 text-white py-3 rounded-xl font-bold text-xl shadow transition
            ${!playlistValid || !player1.trim() || !player2.trim() || numRounds < 2
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-green-700"
            }`}
          onClick={() => {
            if (!playlistValid || !player1.trim() || !player2.trim() || numRounds < 2) return;
            onStart({
              playlistId: activeIsCustom ? extractPlaylistId(customPlaylist) : chosenId,
              player1: player1.trim(),
              player2: player2.trim(),
              numRounds
            });
          }}
          disabled={!playlistValid || !player1.trim() || !player2.trim() || numRounds < 2}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}


