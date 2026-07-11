import catchAsync from "../utils/catchAsync.js";
import Booking from "../models/booking_model.js";
import Car from "../models/car_model.js";
import User from "../models/User_model.js";

// 🔔 1. GLOBAL ALERTS MIDDLEWARE
export const alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === "booking") {
    res.locals.alert =
      "Your booking was successful! Please check your email for confirmation. If your booking doesn't show up here immediately, please refresh the page in a few minutes.";
  }
  next();
};

// 🚗 2. RENDER OVERVIEW MARKETPLACE
// Fixed parameter order: changed (res, req, next) -> (req, res, next)
export const getOverview = catchAsync(async (req, res, next) => {
  const cars = await Car.aggregate([
    { $match: { available: true } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$type", car: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$car" } },
  ]);
  const availableCount = await Car.countDocuments({ available: true });

  res.status(200).render("overview", {
    title: "All Cars",
    cars,
    availableCount,
  });
});

// 🔍 3. RENDER CAR DETAILS
// Fixed query: changed from looking for slug to matching req.params.id from your router map
export const getCarDetails = catchAsync(async (req, res, next) => {
  const car = await Car.findById(req.params.id).populate({
    path: "reviews",
    select: "review rating user",
  });

  if (!car) {
    return res.status(404).render("error", {
      title: "Something went wrong",
      msg: "There is no vehicle matching that ID.",
    });
  }

  res.status(200).render("car", {
    title: `${car.make} ${car.model}`,
    car,
  });
});

// 🔑 4. RENDER LOGIN FORM
export const getLoginForm = (req, res) => {
  res.status(200).render("login", {
    title: "Log Into Your Account",
  });
};

// 👤 5. RENDER USER ACCOUNT DETAILS
export const getAccount = (req, res) => {
  res.status(200).render("account", {
    title: "Your Account Settings",
  });
};

// 📅 6. RENDER USER'S BOOKED RENTALS PAGE
export const getMyRentals = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id }).populate("car");
  const carIds = bookings.map((el) => (el.car._id ? el.car._id : el.car));
  const cars = await Car.find({ _id: { $in: carIds } });

  res.status(200).render("myRentals", {
    title: "My Rental Vehicles",
    cars,
    bookings,
  });
});

// 💾 7. DIRECT TEMPLATE FORM PROFILE UPDATES
export const updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).render("account", {
    title: "Your Account Settings",
    user: updatedUser,
  });
});

// 🚙 8. RENDER FLEET BROWSING PAGE
export const getFleetPage = catchAsync(async (req, res, next) => {
  const cars = await Car.find();

  res.status(200).render("fleet", {
    title: "Explore the Fleet",
    cars,
  });
});

// 🆕 10. RENDER CREATE CAR OFFER PAGE (admin only)
export const getCreateCarOffer = (req, res) => {
  res.status(200).render("createCarOffer", {
    title: "Create Car Offer",
  });
};

// 🔒 12. RENDER FORGOT PASSWORD FORM
export const getForgotPasswordForm = (req, res) => {
  res.status(200).render("forgotPassword", {
    title: "Reset Your Password",
  });
};

