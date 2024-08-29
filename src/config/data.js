// data.js
const postgresClient = require('./postgres.config');

const getCameraData = async () => {
  try {
    const result = await postgresClient.query('SELECT * FROM camera ORDER BY camera_seq');
    return result.rows;
  } catch (error) {
    console.error('Error fetching camera data:', error);
    throw error;
  }
};

module.exports = {
  getCameraData,
};
