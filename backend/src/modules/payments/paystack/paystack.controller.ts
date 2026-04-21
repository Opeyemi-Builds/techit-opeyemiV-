import { Request, Response } from "express";
import { PaystackService } from "./paystack.service";
import { supabaseAdmin } from "../../../config/supabase";

export const initializePaystack = async (req: Request, res: Response) => {
  try {
    const { email, packageId, credits, userId } = req.body;

    const amountMap: Record<string, number> = {
      starter: 0.001,
      builder: 0.001,
      pro: 0.001,
      elite: 0.001,
    };

    const payment = await PaystackService.initializePayment(
      email,
      amountMap[packageId],
      {
        userId,
        credits,
        packageId,
      }
    );

    return res.json({ url: payment.authorization_url });
  } catch (err) {
    return res.status(500).json({ error: "Payment init failed" });
  }
};