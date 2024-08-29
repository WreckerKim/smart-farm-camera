const { FFMpeg } = require('../config/rtsp-ffmpeg');
const { getCameraData } = require('../config/data');
const path = require('path');
const fs = require('fs');
const jpeg = require('jpeg-js');
const dayjs = require('dayjs');

const streamBuffers = {};
const streams = {}; 
const streamStatus = {};

const livePath = path.join('/','home','img','test','live');
const logPath =  path.join('/','home','img','test','log');
const liveImgaeSave = (buffer, i)=>{
  const rawImageData = jpeg.decode(buffer, true);
  const jpegImageData = jpeg.encode(rawImageData, 50);
  try {
     fs.writeFileSync(path.join(livePath, `${i}.png`), jpegImageData.data);
    return true;
  } catch (e) {
    console.log(e)
    return false
  }
}

const logImageSave = (buffer, i, typeIdx)=>{
  const rawImageData = jpeg.decode(buffer, true);
  const jpegImageData = jpeg.encode(rawImageData, 50);
  const savePath = path.join(logPath,`${i}`,`${typeIdx}`);
  
  try {
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath);
    }
    fs.writeFileSync(path.join(savePath,  `${dayjs().format('HHmm')}.png`), jpegImageData.data);
    return true;
  } catch (e) {
    console.log(e)
    return false
  }
}

const initializeStream = (d) => {
  const stream = new FFMpeg({ input: d.camera_url, idx: d.camera_seq, resolution: '640x360', quality: 3 });
  const handleData = (buffer) => {
    streamBuffers[stream.idx] = buffer;
  };
  stream.on('start', () => {
    console.log(`Stream ${d.camera_seq} started`);
  });
  stream.on('stop', () => {
    console.log(`Stream ${d.camera_seq} stopped`);
  });
  stream.on('data', handleData);
  return stream;
};

const startStream = (d) => {
  if (!streams[d.camera_seq]) {
    console.log(`${d.camera_seq} stream 시작`);
    streams[d.camera_seq] = initializeStream(d);
    streamStatus[d.camera_seq] = true;
  }
};

const stopStream = (d) => {
  if (streams[d.camera_seq]) {
    console.log(`${d.camera_seq} stream 중단`);
    const lastData = streamBuffers[d.camera_seq];
    if (lastData) {
      liveImgaeSave(lastData, d.camera_seq);
    }
    streams[d.camera_seq].stop();
    delete streams[d.camera_seq];
  }
};

const updateLiveImage = async () => {
  try {
    const cameras = await getCameraData();
    cameras.forEach(d => {
      if (streams[d.camera_seq]) {
        const lastData = streamBuffers[d.camera_seq];
        if (lastData) {
          liveImgaeSave(lastData, d.camera_seq);
        }
      } else {
        startStream(d);
        streams[d.camera_seq].on('data', (buffer) => {
          liveImgaeSave(buffer, d.camera_seq);
          stopStream(d); 
        });
      }
    });
  } catch (error) {
    console.error('Error in saveImageAndStopStream:', error);
  }
};
const saveLogImage = async () => {
  try {
    const cameras = await getCameraData();
    cameras.forEach(d => {
      if (streams[d.camera_seq]) {
        const lastData = streamBuffers[d.camera_seq];
        if (lastData) {
          logImageSave(lastData, d.camera_seq,d.tbl_devtype_no);
        }
      } else {
        startStream(d);
        streams[d.camera_seq].on('data', (buffer) => {
          logImageSave(buffer, d.camera_seq,d.tbl_devtype_no);
          stopStream(d); 
        });
      }
    });
  } catch (error) {
    console.error('Error in saveImageAndStopStream:', error);
  }
};

const initializeNamespaces = (io, cameras) => {
  cameras.forEach((d) => {
    const ns = io.of(`/${d.camera_seq}`);
    ns.on('connection', (wsocket) => {
      console.log(`WebSocket connection for camera ${d.camera_seq}`);
      startStream(d);
      const pipeStream = (data) => {
        wsocket.emit('data', data);
      };

      streams[d.camera_seq].on('data', pipeStream);
      wsocket.on('disconnect', () => {
        console.log(`WebSocket disconnected for camera ${d.camera_seq}`);
        streams[d.camera_seq].removeListener('data', pipeStream);

        if (ns.sockets.size === 0) {
          stopStream(d); 
        }
      });
    });
  });
};

const captureImage =async ( idx )=>{
  if (!streams[idx]) {
    return res.status(404).json({ error: 'Camera stream not found' });
  }
  const lastData = streamBuffers[idx];
  if (lastData) {
    liveImgaeSave(lastData, idx,);
  }
}

const startStreaming = async (io) => {
  try {
    const cameras = await getCameraData();
    initializeNamespaces(io, cameras);
  } catch (error) {
    console.error('Error starting streams:', error);
  }
};

module.exports = {
  startStreaming,
  saveLogImage,
  updateLiveImage,
  captureImage
};
