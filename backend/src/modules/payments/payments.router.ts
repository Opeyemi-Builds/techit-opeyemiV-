import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Request, Response } from "express";

export const paymentsRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2024-06-20" });

const CREDIT_PACKAGES = [
  { id: "starter", credits: 500, price: 500 },      // $5.00
  { id: "builder", credits: 1500, price: 1200 },    // $12.00
  { id: "pro", credits: 5000, price: 3500 },         // $35.00
  { id: "elite", credits: 15000, price: 9000 },      // $90.00
] as const;

// POST /api/payments/create-checkout
paymentsRouter.post("/create-checkout", authenticate, async (req: AuthRequest, res: Response) => {
  const { packageId } = z.object({ packageId: z.string() }).parse(req.body);
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) throw new AppError(400, "Invalid package");

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("email, first_name, last_name").eq("user_id", req.userId!).single();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `TechIT Credits — ${pkg.credits.toLocaleString()} credits`,
          description: `${pkg.credits.toLocaleString()} credits for your TechIT Network account`,
        },
        unit_amount: pkg.price,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/wallet?success=true&credits=${pkg.credits}`,
    cancel_url: `${process.env.FRONTEND_URL}/wallet`,
    customer_email: profile?.email,
    metadata: {
      userId: req.userId!,
      credits: pkg.credits.toString(),
      packageId: pkg.id,
    },
  });

  res.json({ url: session.url, sessionId: session.id });
});

// POST /api/payments/webhook — Stripe webhook
paymentsRouter.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch {
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, credits } = session.metadata ?? {};

    if (userId && credits) {
      const creditsToAdd = parseInt(credits);

      // Get current balance
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("credit_balance").eq("user_id", userId).single();

      if (profile) {
        const newBalance = profile.credit_balance + creditsToAdd;
        await supabaseAdmin.from("profiles")
          .update({ credit_balance: newBalance })
          .eq("user_id", userId);

        await supabaseAdmin.from("credit_transactions").insert({
          user_id: userId,
          amount: creditsToAdd,
          action: "purchase",
          description: `Purchased ${creditsToAdd.toLocaleString()} credits via Stripe`,
        });

        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "credit",
          title: "Credits Added! 🎉",
          body: `${creditsToAdd.toLocaleString()} credits have been added to your account.`,
          read: false,
          metadata: { amount: creditsToAdd },
        });
      }
    }
  }

  res.json({ received: true });
});
