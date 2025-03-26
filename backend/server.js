require("dotenv").config();
const express = require("express");  //for node.js
const cors = require("cors");   //middleware to allow cross origin resource sharing
const { Server } = require("socket.io"); //web socket library for real-time communication
const mongoose = require("mongoose"); //library to interact with mongoDB
const axios=require("axios"); //HTTP client to make API requests


const app = express ();

const PORT = process.env.PORT || 5000;

app.use(cors());

//json parsing for incoming requests
app.use(express.json());

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

//creating a new Socket.io instance for handling real-time events
const io = new Server(server, {
    cors: {
        origin: "*", //Allow any frontend to connect (for development)
    },
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Listen for when a user disconnects
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

//connecting to MongoDB Atlas using Connection String from .env
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));


//GET /api/playlist/:playlistId
//this is custom API route for the FRONTEND; 

app.get("/api/playlist/:playlistId",async(req,res)=> {
    const playlistId = req.params.playlistId;

    try {
        const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

        const tokenResponse= await axios.post //fetching token
        (
            "https://accounts.spotify.com/api/token",
            "grant_type=client_credentials",
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        //getting token from spotify response
        const accessToken = tokenResponse.data.access_token;

        //fetching playlist tracks
        const response = await axios.get(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            {
                headers: { Authorization: `Bearer ${accessToken}` }, // Use token in the request header
            }
        );

        res.json(response.data);
    }
    catch(error)
    {
        console.error(error);
        res.status(500).json({error:"Error fetching playlist"});

    }
});