const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { startStreaming } = require('./stream/streamService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send('RTSP Streaming Server is running');
});

server.listen(7777, () => {
  console.log('Server is listening on port 7777');
  startStreaming(io); // 스트리밍 시작
});
