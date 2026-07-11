import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app.js";

dotenv.config({ path: "./config.env" });

// Use DATABASE directly — local MongoDB URI has no password placeholder
const DB = process.env.DATABASE;

mongoose
  .connect(DB)
  .then(async () => {
    console.log("DB connection successful! 🎉");
  })
  .catch((err) => console.error("💥 DB connection error:", err.message));

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Application is running smoothly on port ${port}... 🚀`);
});
