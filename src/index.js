const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { startStreaming , saveImageAndStopStream} = require('./stream/streamService');
const schedule = require('node-schedule');
const bodyParser = require('body-parser');
const { getCameraData } = require('./config/data');
const cors = require('cors');
const app = express();
const path = require('path');
const fs = require('fs');
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});
const livePath = path.join('/','home','img','test','live');
app.use(cors({
  // origin: ['http://localhost:5173', 'http://localhost:7777', 'http://qst-s.iptime.org:17777', 'http://qstech.iptime.org:2526'],
  origin: '*',
  credentials: true
}));
app.use(bodyParser.json());

schedule.scheduleJob('*/1 * * * *', async () => {
  console.log("!")
  saveImageAndStopStream();
})

app.get('/', (req, res) => {
  res.send('RTSP Streaming Server is running');
});

app.get('/get-camera', async (req, res, next) => {
  const cameras = await getCameraData();
  cameras.forEach((camera) => {
    console.log(livePath)
    const imgPath = path.join(livePath,`${camera.camera_seq}.png`);
    console.log(imgPath)
    if (!fs.existsSync(imgPath)) {
      return next(new Error('CheckInputData'));
    }
    camera.image = `http://localhost:7777/get-image/${camera.camera_seq}`;
  })
  return res.json({ data: cameras });
});

app.get('/get-image/:id', (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return next(new Error('CheckInputData'))
  }
  const imgPath = path.resolve(livePath, `${id}.png`);
  const defaultPath = path.resolve(livePath, '..', 'noimage.png');

  if (!fs.existsSync(imgPath)) {
    return res.sendFile(defaultPath);
  }
  return res.sendFile(imgPath);
})


server.listen(7777, () => {
  console.log('Server is listening on port 7777');
  startStreaming(io);
});
