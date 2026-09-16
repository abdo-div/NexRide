import AppError from "../utils/appError.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const validationLocation = ["body", "query", "params"];
    for (const location of validationLocation) {
      if (schema[location]) {
        if (typeof schema[location].validate === "function") {
          const { error, value } = schema[location].validate(req[location], {
            abortEarly: false,
            stripeUnknown: true,
          });
          if (error) {
            const errorMessage = error.details
              .map((detail) => detail.message)
              .join(";");
            return next(new AppError(`validation error:${errorMessage}`, 400));
          }
          req[location] = value;
        }
      }
    }
    next();
  };
};
