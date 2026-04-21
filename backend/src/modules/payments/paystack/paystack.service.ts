import axios from "axios";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export class PaystackService {

  static async initializePayment(email: string, amount: number, metadata: any) {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Paystack uses kobo (VERY IMPORTANT)
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data; // contains authorization_url
  }

  static async verifyPayment(reference: string) {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    return response.data.data;
  }
}