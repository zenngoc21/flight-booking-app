const { createClient } = require('redis');

let redisClient;

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL chưa được cấu hình');
    return null;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on('error', (error) => {
    console.error('Redis error:', error.message);
  });

  await redisClient.connect();

  console.log('Redis connected successfully');
  return redisClient;
}

function getRedisClient() {
  return redisClient;
}

module.exports = { connectRedis, getRedisClient };