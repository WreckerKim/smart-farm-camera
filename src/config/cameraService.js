// cameraService.js
const { getCameraData } = require('./data.js');

let cameraDataCache = null;

const fetchAndStoreCameraData = async () => {
  try {
    cameraDataCache = await getCameraData();
    console.log('Camera data fetched and stored:', cameraDataCache);
    return cameraDataCache;
  } catch (error) {
    console.error('Error fetching and storing camera data:', error);
    throw error;
  }
};

module.exports = {
  fetchAndStoreCameraData,
};