const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const { v4: uuidV4 } = require('uuid');

const peerServer = ExpressPeerServer(server, { debug: true });
app.use('/peerjs', peerServer);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room });
});

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit('user-connected', { userId, userName });

    io.to(roomId).emit('system-message', `${userName} joined the meeting ✨`);

    socket.on('message', (data) => {
      io.to(roomId).emit('createMessage', data);
    });

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId);
      io.to(roomId).emit('system-message', `${userName} left the meeting 👋`);
    });
  });
});

server.listen(process.env.PORT || 3030, () => {
  console.log('Server is running on port 3030');
});
