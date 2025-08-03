import { useState, useRef, useEffect } from "react";
import WebPlayback from "./WebPlayback";

// Enhanced device activation with comprehensive debugging
async function activateBrowserDevice(deviceId, token, maxRetries = 15) {
  if (!deviceId || !token) {
    console.warn("❌ Missing deviceId or token for activation");
    return false;
  }
  
  console.log("🚀 Starting device activation for:", deviceId);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Device activation attempt ${attempt + 1}/${maxRetries}`);
      
      // Check if device exists in Spotify's device list
      const devicesRes = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!devicesRes.ok) {
        console.error("❌ Failed to fetch devices:", devicesRes.status, devicesRes.statusText);
        if (devicesRes.status === 401) {
          console.error("🔑 Token appears to be invalid or expired");
          return false;
        }
        if (devicesRes.status === 403) {
          console.error("🚫 Token missing required scopes or account not Premium");
          return false;
        }
        continue;
      }
      
      const devicesData = await devicesRes.json();
      console.log("📱 Available devices:", devicesData.devices?.map(d => ({ 
        id: d.id.slice(0, 8) + '...', 
        name: d.name, 
        is_active: d.is_active,
        type: d.type
      })));
      
      const targetDevice = devicesData.devices?.find(d => d.id === deviceId);
      if (!targetDevice) {
        console.warn(`⏳ Device ${deviceId.slice(0, 8)}... not found in device list, attempt ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, 500 + (attempt * 100)));
        continue;
      }
      
      console.log("✅ Found target device:", {
        name: targetDevice.name,
        type: targetDevice.type,
        is_active: targetDevice.is_active,
        volume_percent: targetDevice.volume_percent
      });
      
      // If device is already active, we're done
      if (targetDevice.is_active) {
        console.log("🎯 Device is already active!");
        return true;
      }
      
      // Transfer playback to our device
      console.log("🔄 Attempting to transfer playback to device...");
      const transferRes = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
      });
      
      console.log("📡 Transfer response:", transferRes.status, transferRes.statusText);
      
      if (transferRes.ok || transferRes.status === 202 || transferRes.status === 204) {
        // Wait a moment and verify the transfer worked
        console.log("⏱️ Waiting to verify transfer...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const verifyRes = await fetch("https://api.spotify.com/v1/me/player/devices", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const activeDevice = verifyData.devices?.find(d => d.id === deviceId && d.is_active);
          if (activeDevice) {
            console.log("🎉 Device activation successful!");
            return true;
          } else {
            console.log("⚠️ Transfer request succeeded but device not yet active, retrying...");
          }
        }
      } else {
        const errorText = await transferRes.text();
        console.error("❌ Transfer failed:", errorText);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500 + (attempt * 100)));
    } catch (error) {
      console.error("💥 Device activation attempt failed:", error);
    }
  }
  
  console.error("💀 Failed to activate device after all attempts");
  return false;
}

// Enhanced play function with comprehensive debugging
async function playTrackSafely(deviceId, token, trackUri, maxRetries = 8) {
  if (!deviceId || !token || !trackUri) {
    console.warn("❌ Missing parameters for playTrackSafely:", {
      deviceId: !!deviceId,
      token: !!token,
      trackUri: !!trackUri
    });
    return false;
  }
  
  console.log("🎵 Attempting to play track:", trackUri.split(':').pop(), "on device:", deviceId.slice(0, 8) + '...');
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Play attempt ${attempt + 1}/${maxRetries}`);
      
      const devicesRes = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        const activeDevice = devicesData.devices?.find(d => d.id === deviceId && d.is_active);
        
        if (activeDevice) {
          console.log("📱 Device is active, sending play command...");
          const playRes = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ uris: [trackUri] }),
          });
          
          console.log("🎮 Play response:", playRes.status, playRes.statusText);
          
          if (playRes.ok || playRes.status === 202 || playRes.status === 204) {
            console.log("✅ Track play command successful!");
            return true;
          } else {
            const errorText = await playRes.text();
            console.error("❌ Play request failed:", errorText);
          }
        } else {
          console.warn(`⏳ Device not active on attempt ${attempt + 1}, available devices:`, 
            devicesData.devices?.map(d => ({ name: d.name, active: d.is_active })));
        }
      } else {
        console.error("❌ Failed to check devices:", devicesRes.status);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500 + (attempt * 100)));
    } catch (error) {
      console.error("💥 Play track attempt failed:", error);
    }
  }
  
  console.error("💀 Failed to play track after all attempts");
  return false;
}

export default function Scoreboard({ player1, player2, picks, token }) {
  const [selected, setSelected] = useState({ 1: new Set(), 2: new Set() });
  const [activeTrack, setActiveTrack] = useState(null);
  const [webplayDeviceId, setWebplayDeviceId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [activating, setActivating] = useState(false);
  
  const lastPlayedRef = useRef("");
  const activationAttempted = useRef(false);

  // Enhanced debugging logs
  useEffect(() => {
    console.log("=== SCOREBOARD DEBUG ===");
    console.log("🎮 webplayDeviceId:", webplayDeviceId ? webplayDeviceId.slice(0, 8) + '...' : 'None');
    console.log("🔑 token:", token ? `Present (${token.slice(0, 8)}...)` : 'Missing');
    console.log("✅ playerReady:", playerReady);
    console.log("🔄 activating:", activating);
    console.log("🎵 activeTrack:", activeTrack?.name || 'None');
    console.log("📊 picks:", { p1: picks[1]?.length || 0, p2: picks[2]?.length || 0 });
    console.log("========================");
  }, [webplayDeviceId, token, playerReady, activating, activeTrack, picks]);

  // Activate device when WebPlayback is ready
  useEffect(() => {
    if (webplayDeviceId && token && !activationAttempted.current) {
      console.log("🎯 WebPlayback device ready, starting activation...");
      activationAttempted.current = true;
      setPlayerReady(false);
      setActivating(true);
      
      activateBrowserDevice(webplayDeviceId, token).then(success => {
        console.log("🏁 Device activation result:", success ? '✅ SUCCESS' : '❌ FAILED');
        setPlayerReady(success);
        setActivating(false);
        
        if (!success) {
          console.warn("⚠️ Automatic activation failed. User may need to manually select device in Spotify app.");
        }
      });
    }
  }, [webplayDeviceId, token]);

  function togglePick(playerNum, idx) {
    setSelected(sel => {
      const next = { 1: new Set(sel[1]), 2: new Set(sel[2]) };
      if (next[playerNum].has(idx)) {
        next[playerNum].delete(idx);
      } else {
        next[playerNum].add(idx);
      }
      return next;
    });
  }

  // Play selected track when user clicks card
  async function handleCardClick(track) {
    console.log("🎵 Card clicked:", track.name);
    setActiveTrack(track);
    
    if (webplayDeviceId && token && track?.uri && playerReady) {
      const trackKey = track.uri + "|" + webplayDeviceId;
      if (lastPlayedRef.current === trackKey) {
        console.log("⏭️ Same track already playing, skipping");
        return;
      }
      
      lastPlayedRef.current = trackKey;
      console.log("🚀 Starting playback for:", track.name);
      const success = await playTrackSafely(webplayDeviceId, token, track.uri);
      
      if (!success) {
        console.warn("⚠️ Failed to play track. Try clicking 'Activate Spotify Player' button.");
      }
    } else {
      console.log("❌ Cannot play track - missing requirements:", {
        webplayDeviceId: !!webplayDeviceId,
        token: !!token,
        trackUri: !!track?.uri,
        playerReady
      });
      
      if (!playerReady) {
        console.log("💡 Tip: Wait for player activation or click 'Activate Spotify Player' button");
      }
    }
  }

  // Manual retry for device activation with enhanced feedback
  async function retryDeviceActivation() {
    if (!webplayDeviceId || !token) {
      console.warn("❌ Cannot retry activation - missing deviceId or token");
      return;
    }
    
    console.log("🔄 Manual device activation retry initiated...");
    setActivating(true);
    setPlayerReady(false);
    
    // Reset the attempted flag to allow retry
    activationAttempted.current = false;
    
    const success = await activateBrowserDevice(webplayDeviceId, token);
    setPlayerReady(success);
    setActivating(false);
    
    if (success && activeTrack?.uri) {
      console.log("🎵 Activation successful, attempting to play current track...");
      await playTrackSafely(webplayDeviceId, token, activeTrack.uri);
    }
    
    // Reset flag for future auto-attempts
    activationAttempted.current = true;
  }

  const score1 = selected[1].size;
  const score2 = selected[2].size;

  function renderPlayerColumn(playerNum, picksArr, playerName, accentColor) {
    return (
      <div className="flex-1 flex flex-col items-center min-w-[340px] max-w-xl">
        <h2
          className="text-[2rem] font-extrabold uppercase mb-6 tracking-wider"
          style={{
            color: accentColor,
            lineHeight: 1.1,
            letterSpacing: "0.09em"
          }}
        >
          {playerName}
        </h2>
        {picksArr.map((track, i) => (
          <div
            key={i}
            className={`
              flex items-center relative w-full mb-7 rounded-xl border-2 select-none cursor-pointer transition-all
              ${selected[playerNum].has(i)
                ? "border-green-400 bg-black"
                : "border-zinc-700 bg-black hover:border-purple-400"
              }
            `}
            style={{
              minHeight: 128,
              maxHeight: 128,
              minWidth: 320,
              maxWidth: 520,
              padding: '18px 20px',
              boxSizing: 'border-box'
            }}
            onClick={e => {
              if (e.target.closest("button")) return;
              handleCardClick(track);
            }}
          >
            <img
              src={track.album.images[1]?.url || track.album.images[0]?.url || ""}
              className="rounded-lg w-20 h-20 object-cover mr-6 border border-zinc-800 flex-shrink-0"
              alt="cover"
              draggable={false}
            />
            <div className="flex-1 flex flex-col overflow-x-auto min-w-0">
              <div className="font-extrabold text-2xl mb-1 text-white leading-snug truncate" style={{ letterSpacing: ".01em" }}>
                {track.name}
              </div>
              <div className="text-base font-semibold text-gray-300 truncate">
                {track.artists.map(a => a.name).join(", ")}
              </div>
              <div className="flex items-center gap-2 mt-2 min-h-[22px]">
                <span
                  className="text-green-400 font-bold text-base"
                  style={{ visibility: activeTrack?.uri === track.uri ? "visible" : "hidden" }}
                >Now Playing</span>
                <span
                  className="text-green-300 text-base font-bold"
                  style={{ visibility: selected[playerNum].has(i) ? "visible" : "hidden" }}
                >+1</span>
              </div>
            </div>
            <button
              onClick={e => {
                e.stopPropagation();
                togglePick(playerNum, i);
              }}
              className={`
                ml-4 px-0 py-2 rounded-lg font-bold text-lg border transition-all h-10 flex items-center justify-center
                ${selected[playerNum].has(i)
                  ? "bg-green-500 text-white border-green-400"
                  : "bg-zinc-800 text-green-300 border-green-400 hover:bg-green-600 hover:text-white"}
              `}
              style={{
                minWidth: 80,
                width: 80,
                boxShadow: "none",
                fontWeight: 700,
              }}
            >
              {selected[playerNum].has(i) ? "Picked" : "Pick"}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white flex flex-col pb-52">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center pt-12 pb-6">
        <div className="flex items-end justify-center w-full gap-14 mb-14">
          {renderPlayerColumn(1, picks[1], player1, "#85f1e6")}
          <div
            className="text-[2.4rem] font-extrabold leading-normal mx-6 select-none px-7 py-2"
            style={{
              color: "#cac8ff",
              letterSpacing: ".09em"
            }}
          >VS</div>
          {renderPlayerColumn(2, picks[2], player2, "#7eefff")}
        </div>
      </div>
      
      {/* Web Player above scoreboard */}
      <div className="w-full flex items-center justify-center py-3 fixed left-0 bottom-24 z-50 bg-zinc-950 bg-opacity-95 border-t border-zinc-700">
        <div className="w-[400px]">
          {(activeTrack && activeTrack.uri) ? (
            <>
              <WebPlayback
                token={token}
                trackUri={activeTrack.uri}
                onReady={setWebplayDeviceId}
              />
              {(!playerReady || activating) && (
                <div className="pt-2 text-center">
                  <button
                    onClick={retryDeviceActivation}
                    disabled={activating}
                    className={`px-4 py-2 my-2 rounded font-bold transition ${
                      activating 
                        ? "bg-gray-600 text-gray-300 cursor-not-allowed" 
                        : "bg-green-700 text-white hover:bg-green-800"
                    }`}
                    type="button"
                  >
                    {activating ? "Activating..." : "Activate Spotify Player"}
                  </button>
                  <div className="text-xs text-zinc-400 mt-1">
                    {activating 
                      ? "Connecting to Spotify..." 
                      : "If this doesn't work, open Spotify app and select 'Doowops Player' from devices."
                    }
                  </div>
                  {webplayDeviceId && (
                    <div className="text-xs text-zinc-500 mt-1">
                      Device ID: {webplayDeviceId.slice(0, 8)}...
                    </div>
                  )}
                  <div className="text-xs text-zinc-500 mt-1">
                    Debug: Check browser console for detailed logs
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-xl text-zinc-400 py-3 font-semibold">
              Click any card to play it here!
            </div>
          )}
        </div>
      </div>
      
      {/* Scoreboard bar at bottom */}
      <div className="fixed bottom-0 left-0 w-full flex items-center justify-center py-4 bg-black z-50 border-t border-zinc-800">
        <span className="mr-6">
          <span className="text-2xl font-extrabold" style={{ color: "#20e6b3" }}>
            {player1}
          </span>
          <span className="ml-2 text-3xl text-white font-black"> {score1}</span>
        </span>
        <span className="text-3xl font-extrabold text-gray-400 mx-7">|</span>
        <span>
          <span className="text-2xl font-extrabold" style={{ color: "#b2e7ff" }}>
            {player2}
          </span>
          <span className="ml-2 text-3xl text-white font-black"> {score2}</span>
        </span>
      </div>
    </div>
  );
}
