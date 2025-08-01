import React from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { FaSpotify } from "react-icons/fa";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function LoginPage({ error }) {
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
      <div className="text-center mt-10">
        {error && (
          <div className="mb-2 text-red-400 font-semibold">
            {error}
          </div>
        )}
        <a
          href={`${BACKEND_URL}/auth/login`}
          className="bg-green-600 px-6 py-2 text-white rounded font-bold shadow hover:bg-green-700 transition"
        >
          Login with Spotify
        </a>
      </div>
    </div>
  );
}
