import { ZodError } from "zod";

export const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Assign validated and sanitized data back to request
    req.body = parsed.body ?? req.body;
    req.query = parsed.query ?? req.query;
    req.params = parsed.params ?? req.params;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join(".").replace(/^(body|query|params)\./, ""),
        message: err.message,
      }));

      return res.status(400).json({
        status: "fail",
        message: "Invalid request data",
        errors: formattedErrors,
      });
    }
    next(error);
  }
};

