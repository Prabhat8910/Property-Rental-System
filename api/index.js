// Vercel Serverless Entry Point
// This file is the handler for all /api/* requests routed from vercel.json

const { connectDB } = require('../backend/src/config/database');
const app = require('../backend/src/server');

// Cache DB connection across warm invocations
let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return app(req, res);
};
