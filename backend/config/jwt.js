const MIN_JWT_SECRET_BYTES = 32;

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (typeof secret !== "string" || secret.trim().length === 0) {
    throw new Error(
      "JWT_SECRET is required. Set it in the environment before starting the application.",
    );
  }

  if (Buffer.byteLength(secret, "utf8") < MIN_JWT_SECRET_BYTES) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_BYTES} bytes long. Configure a stronger secret in the environment.`,
    );
  }

  return secret;
};

export const validateJwtSecret = () => {
  getJwtSecret();
};