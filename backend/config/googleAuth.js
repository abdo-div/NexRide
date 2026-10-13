import { OAuth2Client } from "google-auth-library";

let client;

export const validateGoogleAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Google authentication.",
    );
  }

  return { clientId, clientSecret };
};

export const getGoogleOAuthClient = () => {
  const { clientId, clientSecret } = validateGoogleAuthConfig();
  client ??= new OAuth2Client(clientId, clientSecret);
  return client;
};
