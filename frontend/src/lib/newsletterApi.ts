import { request } from "./apiClient";

interface NewsletterResponse {
  status: "success";
  message: string;
  data: { subscriber: { email: string; active: boolean } };
}

export const subscribeToNewsletter = (email: string, locale: "ar" | "en") =>
  request<NewsletterResponse>("/newsletter/subscribe", {
    method: "POST",
    auth: false,
    body: { email, locale },
  });
