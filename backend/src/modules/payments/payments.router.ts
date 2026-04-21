import express from "express";
import crypto from "crypto";
import { supabase } from "../../config/supabase.js";

export const paymentsRouter = express.Router();

/**
 * PAYSTACK WEBHOOK
 */
paymentsRouter.post("/webhook/paystack", async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto
      .createHmac("sha512", secret!)
      .update(JSON.stringify(req.body))
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];

    if (hash !== signature) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const email = event.data.customer.email;
      const amount = event.data.amount / 100; // kobo → naira

      // TODO: map email → user_id
      // then add credits

      console.log("PAYMENT SUCCESS:", email, amount);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});