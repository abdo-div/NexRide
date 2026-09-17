import { ZodError } from "zod";

/**
 * Express 5 exposes `req.query` (and potentially others) as getter-only
 * prototype properties, so plain assignment throws. Fall back to shadowing the
 * prototype accessor with our own own-property value.
 */
const setRequestProp = (req, prop, value) => {
  try {
    req[prop] = value;
  } catch {
    Object.defineProperty(req, prop, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
};

/**
 * Zod validation middleware.
 * Validates and sanitizes req.body / req.query / req.params against the
 * supplied schema, replacing them with the parsed (and stripped) output.
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Only overwrite when the schema actually produced a value for that location.
    // Zod strips keys it does not define, so missing locations come back undefined
    // and the original request values are preserved.
    if (parsed.body !== undefined) setRequestProp(req, "body", parsed.body);
    if (parsed.query !== undefined) setRequestProp(req, "query", parsed.query);
    if (parsed.params !== undefined)
      setRequestProp(req, "params", parsed.params);

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues || error.errors || [];
      const formattedErrors = issues.map((issue) => ({
        field: issue.path.join(".").replace(/^(body|query|params)\.?/, ""),
        message: issue.message,
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

export default validate;
