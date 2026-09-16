import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDB = async () => {
  const DB_URI =
    process.env.DATABASE_URI ||
    process.env.DATABASE ||
    "mongodb://127.0.0.1:27017/nexride?replicaSet=rs0";

  try {
    const conn = await mongoose.connect(DB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.database(`Connected to host: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected. Attempting reconnect...");
});

mongoose.connection.on("error", (err) => {
  logger.error(`Mongoose connection error: ${err.message}`);
});

export default connectDB;
