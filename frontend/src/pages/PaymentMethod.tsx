import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Zap,
  ArrowRight,
  Shield,
  Globe,
  Building2,
  Smartphone,
  LoaderPinwheelIcon,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

export default function PaymentMethod() {
  const [params] = useSearchParams();
  const packageId = params.get("package") || "starter";
  // Read the currency from the URL, default to NGN just in case
  const currency = params.get("currency") || "NGN"; 

  const [loading, setLoading] = useState<string | null>(null);

  async function handlePay(provider: "paystack" | "flutterwave") {
    setLoading(provider);

    try {
      // 1. Get Authentication Context
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      if (!session || !user?.email) {
        alert("Authentication error: You must be logged in to make a payment.");
        setLoading(null);
        return;
      }

      // 2. Safely call the Edge Function
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payments-initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          packageId: packageId, 
          provider: provider,
          email: user.email,
          currency: currency // Send the selected currency to the backend!
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payment gateway failed to respond.");
      }

      // 3. Send User to the Secure Checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No payment URL returned from gateway.");
      }
    } catch (err: any) {
      console.error("Payment Error:", err);
      alert(`Payment Initialization Failed: ${err.message}`);
    } finally {
      setLoading(null);
    }
  }

  const comingSoon = (name: string) => {
    alert(`${name} is coming soon — currently in wallet integration phase.`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden page-enter">

      {/* Background Orbs */}
      <div className="orb orb-violet w-[400px] h-[400px] -top-40 -left-40 opacity-40 absolute" />
      <div className="orb orb-cyan w-[300px] h-[300px] bottom-[-100px] right-[-100px] opacity-30 absolute" />

      <div className="w-full max-w-2xl space-y-6 relative z-10">

        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-display font-bold gradient-text">
            Complete Your Purchase
          </h1>
          <p className="text-sm text-muted-foreground bg-muted/50 inline-block px-4 py-1.5 rounded-full border border-border/50">
            Purchasing <span className="font-bold text-foreground capitalize">{packageId}</span> package in <span className="font-bold text-primary">{currency}</span>
          </p>
        </div>

        {/* PAYSTACK */}
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card 
            onClick={() => loading ? null : handlePay("paystack")}
            className={cn(
              "p-6 cursor-pointer bg-card/80 backdrop-blur-md transition-all border",
              loading === "paystack" ? "opacity-70 border-primary" : "hover:border-primary/50 shadow-sm"
            )}
          >
            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {loading === "paystack"
                    ? <LoaderPinwheelIcon className="animate-spin size-5 text-primary" />
                    : <CreditCard className="text-primary size-5" />
                  }
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    Paystack
                    {loading === "paystack" && <span className="text-xs text-primary font-normal animate-pulse">(Connecting...)</span>}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Card • Bank Transfer • USSD
                  </p>
                  <div className="flex gap-3 text-xs mt-2 text-muted-foreground font-medium">
                    <span className="flex items-center gap-1"><Shield className="size-3 text-green-500" /> Secure</span>
                    <span className="flex items-center gap-1"><Zap className="size-3 text-yellow-500" /> Fast</span>
                  </div>
                </div>
              </div>
              <ArrowRight className={cn("transition-transform", loading === "paystack" ? "translate-x-2 text-primary" : "text-muted-foreground")} />
            </div>
          </Card>
        </motion.div>

        {/* FLUTTERWAVE (COMING SOON) */}
        <motion.div whileHover={{ scale: 1.01 }}>
          <Card 
            onClick={() => comingSoon("Flutterwave")}
            className="p-6 cursor-pointer bg-card/40 backdrop-blur-md opacity-70 border-dashed hover:bg-card/60 transition-all"
          >
            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <div className="size-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Globe className="text-secondary size-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-muted-foreground">Flutterwave</h3>
                  <p className="text-sm text-muted-foreground">
                    Global payments • Cards • Mobile money
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">Soon</span>
            </div>
          </Card>
        </motion.div>

        {/* MONIEPOINT (COMING SOON) */}
        <motion.div whileHover={{ scale: 1.01 }}>
          <Card
            onClick={() => comingSoon("Moniepoint")}
            className="p-6 cursor-pointer bg-card/40 opacity-60 border-dashed hover:bg-card/60 transition-all">
            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
                  <Building2 className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-muted-foreground">Moniepoint Wallet</h3>
                  <p className="text-sm text-muted-foreground">
                    Business accounts • Wallet system
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">Soon</span>
            </div>
          </Card>
        </motion.div>

        {/* OPAY (COMING SOON) */}
        <motion.div whileHover={{ scale: 1.01 }}>
          <Card
            onClick={() => comingSoon("OPay")}
            className="p-6 cursor-pointer bg-card/40 opacity-60 border-dashed hover:bg-card/60 transition-all">
            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
                  <Smartphone className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-muted-foreground">OPay</h3>
                  <p className="text-sm text-muted-foreground">
                    Mobile money • Instant Transfers
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">Soon</span>
            </div>
          </Card>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2 mt-4">
          <Shield className="size-3" /> Secure payments powered by Paystack
        </p>

      </div>
    </div>
  );
}