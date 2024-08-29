const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { startStreaming,saveLogImage, updateLiveImage, captureImage} = require('./stream/streamService');
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
  origin: ['http://localhost:5173', 'http://localhost:7777', 'http://qst-s.iptime.org:17777', 'http://qstech.iptime.org:2526'],
  credentials: true
}));
app.use(bodyParser.json());

schedule.scheduleJob('*/1 * * * *', async () => {
  const date = new Date();
  const hour = date.getHours();
  const mins = date.getMinutes();
  const saveImgaeHour = hour === 10 ||  hour === 18;

  if(mins == 30 && saveImgaeHour ){
    saveLogImage();
  }else{
    updateLiveImage();
  }
})

app.get('/get-camera', async (req, res, next) => {
  const cameras = await getCameraData();
  cameras.forEach((camera) => {
    const imgPath = path.join(livePath,`${camera.camera_seq}.png`);
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

app.post('/capture/:id', async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return next(new Error('CheckInputData'));
  }
  const cameraIdx = parseInt(id);
  await captureImage(cameraIdx);
  const imgPath = path.resolve(livePath, `${id}.png`);
  return res.sendFile(imgPath);
})

server.listen(7777, () => {
  console.log('Server is listening on port 7777');
  startStreaming(io);
});
