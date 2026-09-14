import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User_model.js";
import Car from "../models/Car_model.js";
import Review from "../models/Review_model.js"; // Double check your file name match!

dotenv.config();

const DB = process.env.DATABASE_URL;

mongoose
  .connect(DB)
  .then(() => {
    console.log("💥 Local MongoDB connection successful!");
    runCommandPipeline();
  })
  .catch((err) => {
    console.error("❌ Mongoose Connection Crash:", err.message);
    process.exit(1);
  });

const users = JSON.parse(fs.readFileSync("./dev-data/users.json", "utf-8"));
const cars = JSON.parse(fs.readFileSync("./dev-data/cars.json", "utf-8"));
const baseReviews = JSON.parse(
  fs.readFileSync("./dev-data/reviews.json", "utf-8"),
);

const importData = async () => {
  try {
    console.log("⏳ Uploading Users and Cars...");
    // 1. Insert Users and Cars first to generate real DB IDs
    const existingUsers = await User.find();
    const createdUsers = existingUsers.length
      ? existingUsers
      : await User.create(users, { validateBeforeSave: false });
    const carsWithCoverImages = cars.map((car) => ({
      ...car,
      imageCover: (car.imageCover || car.images?.[0])?.replace(
        /^car-(\d+)\.jpg$/,
        "car$1.jpg",
      ),
    }));
    const existingCars = await Car.find();
    const createdCars = existingCars.length
      ? existingCars
      : await Car.create(carsWithCoverImages);

    console.log("🔗 Dynamically linking reviews to generated ObjectIds...");

    // 2. Pick a sample user and car from what was just created
    const sampleUserId = createdUsers[1]._id; // Standard Test User
    const sampleCarId = createdCars[0]._id; // First car in your list

    // 3. Map over your reviews and inject the correct mandatory ObjectIds
    const finalReviews = baseReviews.map((rev, index) => ({
      ...rev,
      user: sampleUserId,
      // If you want them on separate cars, toggle the array index
      car: createdCars[index % createdCars.length]._id,
    }));

    // 4. Create the reviews safely
    await Review.create(finalReviews);

    console.log(
      "✅ All data collections successfully loaded and cross-linked!",
    );
  } catch (err) {
    console.error("❌ Data Import Failure:", err);
  }
  process.exit();
};

const deleteData = async () => {
  try {
    console.log("⏳ Wiping collections...");
    await User.deleteMany();
    await Car.deleteMany();
    await Review.deleteMany();
    console.log("🗑️ All data collections successfully wiped clean!");
  } catch (err) {
    console.error("❌ Data Delete Failure:", err);
  }
  process.exit();
};

function runCommandPipeline() {
  const argumentFlag = process.argv[2];
  if (argumentFlag === "--import") {
    importData();
  } else if (argumentFlag === "--delete") {
    deleteData();
  } else {
    console.log("⚠️ Use --import or --delete flags");
    process.exit();
  }
}
