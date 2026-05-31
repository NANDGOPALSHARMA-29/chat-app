const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Client folder ki files serve karo
app.use(express.static(path.join(__dirname, '../client')));

// Rooms ko store karne ke liye object
// Structure: { roomId: { password: "1234", users: ["Nand", "Nitin"] } }
const rooms = {};

// Jab bhi koi user connect kare
io.on('connection', (socket) => {
  console.log('Ek user connect hua:', socket.id);

  // --- Room banana ---
  socket.on('create-room', ({ roomId, password, username }) => {
    
    // Agar room pehle se exist karta hai
    if (rooms[roomId]) {
      socket.emit('error', 'Ye room ID pehle se exist karti hai');
      return;
    }

    // Room banao aur creator ko andar daalo
    rooms[roomId] = { password, users: [username] };
    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;

    socket.emit('room-joined', { roomId, username });
    console.log(`Room bana: ${roomId} by ${username}`);
  });
  // --- Rejoin --- chat page load hone pe naya socket reconnect karta hai
  socket.on('rejoin-room', ({ roomId, username }) => {
    if (!rooms[roomId]) return;

    if (!rooms[roomId].users.includes(username)) {
      rooms[roomId].users.push(username);
    }
    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;
    console.log(`${username} ne rejoin kiya: ${roomId}`);
  });
  // --- Room join karna ---
  socket.on('join-room', ({ roomId, password, username }) => {

    // Room exist karta hai?
    if (!rooms[roomId]) {
      socket.emit('error', 'Ye room exist nahi karti');
      return;
    }

    // Password sahi hai?
    if (rooms[roomId].password !== password) {
      socket.emit('error', 'Password galat hai');
      return;
    }

    // Room mein ghuso
    rooms[roomId].users.push(username);
    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;

    socket.emit('room-joined', { roomId, username });

    // Baaki logo ko batao ki naya banda aaya
    socket.to(roomId).emit('user-joined', username);
    console.log(`${username} joined room: ${roomId}`);
  });

  // --- Message bhejna ---
  socket.on('send-message', (message) => {
    const roomId = socket.roomId;

    // Us room mein saare logo ko message bhejo
    io.to(roomId).emit('receive-message', {
      username: socket.username,
      message,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });
  });

 // --- User disconnect hua ---
  socket.on('disconnect', () => {
    const { username, roomId } = socket;

    // Username nahi hai matlab ye ek extra connection tha — ignore karo
    if (!username || !roomId) return;

    if (rooms[roomId]) {
      rooms[roomId].users = rooms[roomId].users.filter(u => u !== username);

      if (rooms[roomId].users.length === 0) {
        setTimeout(() => {
          if (rooms[roomId] && rooms[roomId].users.length === 0) {
            delete rooms[roomId];
            console.log(`Room delete hui: ${roomId}`);
          }
        }, 10000);
      } else {
        socket.to(roomId).emit('user-left', username);
      }
    }
    console.log('User disconnect hua:', username);
  });
});

// Server start karo port 3000 pe
server.listen(3000, () => {
  console.log('Server chal raha hai: http://localhost:3000');
});