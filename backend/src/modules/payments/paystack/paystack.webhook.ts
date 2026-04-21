import { Request, Response } from "express";
import crypto from "crypto";
import { supabaseAdmin } from "../../../config/supabase";

export const paystackWebhook = async (req: Request, res: Response) => {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  if (event.event === "charge.success") {
    const metadata = event.data.metadata;

    const userId = metadata.userId;
    const credits = Number(metadata.credits);

    // update wallet
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("user_id", userId)
      .single();

    if (profile) {
      await supabaseAdmin
        .from("profiles")
        .update({
          credit_balance: profile.credit_balance + credits,
        })
        .eq("user_id", userId);

      await supabaseAdmin.from("credit_transactions").insert({
        user_id: userId,
        amount: credits,
        action: "purchase",
        description: `Paystack purchase`,
      });
    }
  }

  res.sendStatus(200);
};