import NewsletterSubscriber from "../models/newsletterSubscriber.model.js";
import catchAsync from "../utils/catchAsync.js";

export const subscribe = catchAsync(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const subscriber = await NewsletterSubscriber.findOneAndUpdate(
    { email },
    {
      $set: { locale: req.body.locale, active: true },
      $setOnInsert: { source: "website-footer" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(200).json({
    status: "success",
    message: "Subscription confirmed",
    data: { subscriber: { email: subscriber.email, active: subscriber.active } },
  });
});
