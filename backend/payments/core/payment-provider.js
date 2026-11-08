/**
 * Portability boundary shared by every payment gateway implementation.
 *
 * Provider methods accept and return plain application-independent values.
 * Implementations must not depend on Express, Mongoose, or NexRide models.
 */
export class PaymentProvider {
  async createCheckout(_input) {
    throw new Error("createCheckout() must be implemented");
  }

  async verifyPayment(_input) {
    throw new Error("verifyPayment() must be implemented");
  }

  async refundPayment(_input) {
    throw new Error("refundPayment() must be implemented");
  }
}
