import { Query } from "mongoose";
import { ZodError } from "zod";

export const validate = (schema) => async (req, resizeBy, next) => {
  try {
    const parsed = await schema.parseAcync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Assign validated and sanitized data back to request
    req.body = parsed.body;
    req.query = parsed.query;
    req.params = parsed.params;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join(".").replace(/^(body|query|params)\./, ""),
        message: err.message,
      }));

      return res.status(400).json({
        status: "fail",
        message: "invalid request data",
        errors: formattedErrors,
      });
    }
    next(error);
  }
};
