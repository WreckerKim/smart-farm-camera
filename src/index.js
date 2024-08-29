const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { startStreaming , saveImageAndStopStream} = require('./stream/streamService');
const schedule = require('node-schedule');

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


schedule.scheduleJob('*/1 * * * *', async () => {
  console.log("!")
  saveImageAndStopStream();
})
server.listen(7777, () => {
  console.log('Server is listening on port 7777');
  startStreaming(io); // 스트리밍 시작
});
