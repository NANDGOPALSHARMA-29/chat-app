const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../client')));

const rooms = {};

io.on('connection', (socket) => {

  socket.on('create-room', ({ roomId, password, username }) => {
    if (rooms[roomId]) {
      socket.emit('error', 'Ye room ID pehle se exist karti hai');
      return;
    }
    rooms[roomId] = { password, users: {} };
    rooms[roomId].users[username] = true;
    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;
    socket.emit('room-joined', { roomId, username });
  });

  socket.on('rejoin-room', ({ roomId, username }) => {
    if (!rooms[roomId]) return;

    // Pehle se pending leave timer cancel karo
    if (rooms[roomId].leaveTimers && rooms[roomId].leaveTimers[username]) {
      clearTimeout(rooms[roomId].leaveTimers[username]);
      delete rooms[roomId].leaveTimers[username];
    }

    const isNew = !rooms[roomId].users[username];
    rooms[roomId].users[username] = true;

    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;

    // Sirf tabhi batao jab genuinely naya banda ho
    if (isNew) {
      socket.to(roomId).emit('user-joined', username);
    }
  });

  socket.on('join-room', ({ roomId, password, username }) => {
    if (!rooms[roomId]) {
      socket.emit('error', 'Ye room exist nahi karti');
      return;
    }
    if (rooms[roomId].password !== password) {
      socket.emit('error', 'Password galat hai');
      return;
    }

    rooms[roomId].users[username] = true;
    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;

    socket.emit('room-joined', { roomId, username });
    socket.to(roomId).emit('user-joined', username);
  });

  socket.on('send-message', (message) => {
    const roomId = socket.roomId;
    io.to(roomId).emit('receive-message', {
      username: socket.username,
      message,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('disconnect', () => {
    const { username, roomId } = socket;
    if (!username || !roomId || !rooms[roomId]) return;

    // Turant mat hatao — 4 second wait karo rejoin ke liye
    if (!rooms[roomId].leaveTimers) rooms[roomId].leaveTimers = {};

    rooms[roomId].leaveTimers[username] = setTimeout(() => {
      if (!rooms[roomId]) return;

      delete rooms[roomId].users[username];
      delete rooms[roomId].leaveTimers[username];

      // Ab batao ki chala gaya
      socket.to(roomId).emit('user-left', username);

      // Room empty hai toh delete karo
      if (Object.keys(rooms[roomId].users).length === 0) {
        delete rooms[roomId];
      }
    }, 4000);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
});