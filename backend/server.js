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
