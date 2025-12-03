
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
    console.log("Connected to server");

    // Create a room first
    const roomId = "test-room-" + Date.now();
    const userId = "test-user";

    socket.emit("create-room", {
        roomId,
        roomName: "Test Room",
        user: { id: userId, name: "Test User" }
    });

    socket.on("create-success", ({ roomId }) => {
        console.log("Room created:", roomId);

        // Join the room
        socket.emit("join-room", {
            roomId,
            user: { id: userId, name: "Test User" }
        }, (response) => {
            if (response.success) {
                console.log("Joined room successfully");

                // Start browser
                console.log("Starting browser...");
                socket.emit("sfu:startBrowser", { roomId }, (res) => {
                    if (res.error) {
                        console.error("Error starting browser:", res.error);
                    } else {
                        console.log("Browser started, producerId:", res.producerId);
                    }

                    // Keep alive for a bit to see logs
                    setTimeout(() => {
                        socket.emit("sfu:stopBrowser", { roomId }, () => {
                            console.log("Browser stopped");
                            process.exit(0);
                        });
                    }, 10000);
                });
            } else {
                console.error("Failed to join room:", response.error);
                process.exit(1);
            }
        });
    });
});

socket.on("error", (err) => {
    console.error("Socket error:", err);
});
