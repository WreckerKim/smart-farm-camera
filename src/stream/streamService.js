const { FFMpeg } = require('../config/rtsp-ffmpeg');
const { getCameraData } = require('../config/data');
const streamBuffers = {};
const streams = {}; 
const status = {};

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
  }
};

const stopStream = (d) => {
  if (streams[d.camera_seq]) {
    console.log(`${d.camera_seq} stream 중단`);
    streams[d.camera_seq].stop();
    delete streams[d.camera_seq];
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
          stopStream(d); // 모든 클라이언트가 연결 해제되면 스트림 중지
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
};
