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

const logImageSave = (buffer, i)=>{
  const rawImageData = jpeg.decode(buffer, true);
  const jpegImageData = jpeg.encode(rawImageData, 50);
  try {
    fs.writeFileSync(path.join(logPath,  `${i}_${dayjs().format('YYYYMMDD_HHmmss')}.png`), jpegImageData.data);
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

const saveImageAndStopStream = async () => {
  try {
    const cameras = await getCameraData();
    
    cameras.forEach(d => {
      if (streams[d.camera_seq]) {
        // 스트림 중인 경우 이미지를 저장
        console.log(`${d.camera_seq} 스트림 활성 상태에서 이미지 저장`);
        const lastData = streamBuffers[d.camera_seq];
        if (lastData) {
          logImageSave(lastData, d.camera_seq);
        }
      } else {
        // 스트림 아닌 경우 스트림을 시작하여 이미지를 저장 후 스트림을 종료
        console.log(`${d.camera_seq} 스트림 비활성 상태에서 시작 후 이미지 저장 및 스트림 종료`);
        startStream(d);
        
        streams[d.camera_seq].on('data', (buffer) => {
          logImageSave(buffer, d.camera_seq);
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
// 
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
  saveImageAndStopStream 
};
