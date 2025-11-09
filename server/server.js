/**
 * Author: Sidharth Sathesh
 */

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static(path.join(__dirname, '..', 'client')));


const rooms = new Map();
function getRoom(name = 'default') {
  if (!rooms.has(name)) rooms.set(name, { ops: [], users: [] });
  return rooms.get(name);
}

io.on('connection', (socket) => {
  console.log('[server] connected', socket.id);
  let joinedRoom = null;

  socket.on('join', ({ room = 'default', userId, color } = {}) => {
    joinedRoom = room;
    socket.join(room);
    const state = getRoom(room);
    // update presence
    state.users = state.users.filter(u => u.socketId !== socket.id);
    state.users.push({ socketId: socket.id, userId, color });
    // send current opLog
    socket.emit('init-state', { opLog: state.ops });
    // broadcast users
    io.in(room).emit('users', state.users.map(u => ({ userId: u.userId, color: u.color })));
    console.log(`[server] ${userId} joined ${room}`);
  });

  socket.on('stroke-chunk', ({ userId, op } = {}) => {
    if (!joinedRoom) return;
    const state = getRoom(joinedRoom);
    op.id = op.id || `tmp-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    op.userId = userId;
    op.visible = op.visible !== false;
    state.ops.push(op);
    socket.to(joinedRoom).emit('op', op);
  });

  socket.on('stroke-final', ({ userId, op } = {}) => {
    if (!joinedRoom) return;
    const state = getRoom(joinedRoom);
    op.id = op.id || `s-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    op.userId = userId;
    op.visible = true;
    state.ops.push(op);
    io.in(joinedRoom).emit('op', op);
  });

  socket.on('cursor', (c) => {
    if (!joinedRoom) return;
    socket.to(joinedRoom).emit('cursor', c);
  });

  socket.on('undo', ({ id } = {}) => {
    if (!joinedRoom) return;
    const state = getRoom(joinedRoom);
    if (!id) {
      for (let i = state.ops.length - 1; i >= 0; i--) {
        if (state.ops[i].visible !== false) {
          state.ops[i].visible = false;
          io.in(joinedRoom).emit('op', state.ops[i]);
          break;
        }
      }
      return;
    }
    const op = state.ops.find(o => o.id === id);
    if (op) {
      op.visible = false;
      io.in(joinedRoom).emit('op', op);
    }
  });

  socket.on('redo', ({ id } = {}) => {
    if (!joinedRoom) return;
    const state = getRoom(joinedRoom);
    const op = state.ops.find(o => o.id === id);
    if (op) {
      op.visible = true;
      io.in(joinedRoom).emit('op', op);
    }
  });

  socket.on('disconnect', () => {
    if (!joinedRoom) return;
    const state = getRoom(joinedRoom);
    state.users = state.users.filter(u => u.socketId !== socket.id);
    io.in(joinedRoom).emit('users', state.users.map(u => ({ userId: u.userId, color: u.color })));
    console.log('[server] disconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
