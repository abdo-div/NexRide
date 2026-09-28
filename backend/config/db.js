import mongoose from "mongoose";
import logger from "../utils/logger.js";

const getMongoUri = () => {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URI ||
    process.env.DATABASE_URL ||
    process.env.DATABASE ||
    "mongodb://127.0.0.1:27017/nexride?replicaSet=rs0"
  );
};

const connectDB = async () => {
  const DB_URI = getMongoUri();

  try {
    const conn = await mongoose.connect(DB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.database(`Connected to host: ${conn.connection.host}`);
    return true;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    logger.warn(
      "MongoDB is unavailable; continuing startup in degraded mode. Set DATABASE_URI to a running instance to enable full readiness.",
    );
    return false;
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected. Attempting reconnect...");
});

mongoose.connection.on("error", (err) => {
  logger.error(`Mongoose connection error: ${err.message}`);
});

export default connectDB;
