import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "motion/react";
import {
  CreditCard,
  Zap,
  ArrowRight,
  Shield,
  Globe,
  Building2,
  Smartphone,
  Loader2,
  LoaderPinwheel,
  LucideLoaderCircle,
  LoaderPinwheelIcon,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

export default function PaymentMethod() {
  const [params] = useSearchParams();
  const packageId = params.get("package") || "starter";

  const [loading, setLoading] = useState<string | null>(null);

  async function handlePay(provider: "paystack" | "flutterwave") {
    setLoading(provider);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ packageId, provider }),
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (err) {
      alert("Payment initialization failed");
    }

    setLoading(null);
  }

  const comingSoon = (name: string) => {
    alert(`${name} is coming soon — currently in wallet integration phase.`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden page-enter">

      {/* Background */}
      <div className="orb orb-violet w-[400px] h-[400px] -top-40 -left-40 opacity-40 absolute" />
      <div className="orb orb-cyan w-[300px] h-[300px] bottom-[-100px] right-[-100px] opacity-30 absolute" />

      <div className="w-full max-w-2xl space-y-6 relative z-10">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold gradient-text">
            Choose Payment Method
          </h1>
          <p className="text-sm text-muted-foreground">
            Select how you want to complete your payment
          </p>
        </div>

        {/* PAYSTACK */}
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card onClick={() => handlePay("paystack")}
            className="p-6 cursor-pointer bg-card/80 backdrop-blur-md hover:border-primary/40 transition-all">

            <div className="flex justify-between items-center">

              <div className="flex gap-4">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {loading === "paystack"
                    ? <LoaderPinwheelIcon className="animate-spin size-5 text-primary" />
                    : <CreditCard className="text-primary size-5" />
                  }
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg">Paystack</h3>
                  <p className="text-sm text-muted-foreground">
                    Card • Bank Transfer • USSD
                  </p>
                  <div className="flex gap-2 text-xs mt-2 text-muted-foreground">
                    <span className="flex items-center gap-1"><Shield className="size-3" /> Secure</span>
                    <span className="flex items-center gap-1"><Zap className="size-3" /> Fast</span>
                  </div>
                </div>
              </div>

              <ArrowRight />
            </div>
          </Card>
        </motion.div>

        {/* FLUTTERWAVE */}
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card onClick={() => handlePay("flutterwave")}
            className="p-6 cursor-pointer bg-card/80 backdrop-blur-md hover:border-secondary/40 transition-all">

            <div className="flex justify-between items-center">

              <div className="flex gap-4">
                <div className="size-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  {loading === "flutterwave"
                    ? <LoaderPinwheelIcon className="animate-spin size-5 text-secondary" />
                    : <Globe className="text-secondary size-5" />
                  }
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg">Flutterwave</h3>
                  <p className="text-sm text-muted-foreground">
                    Global payments • Cards • Mobile money
                  </p>
                </div>
              </div>

              <ArrowRight />
            </div>
          </Card>
        </motion.div>

        {/* MONIEPOINT (COMING SOON) */}
        <motion.div whileHover={{ scale: 1.01 }}>
          <Card
            onClick={() => comingSoon("Moniepoint")}
            className="p-6 cursor-pointer opacity-70 border-dashed">

            <div className="flex justify-between items-center">

              <div className="flex gap-4">
                <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
                  <Building2 className="size-5 text-muted-foreground" />
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg">
                    Moniepoint Wallet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Business accounts • Wallet system • Coming soon
                  </p>
                </div>
              </div>

              <span className="text-xs text-muted-foreground">Soon</span>
            </div>
          </Card>
        </motion.div>

        {/* OPay (COMING SOON) */}
        <motion.div whileHover={{ scale: 1.01 }}>
          <Card
            onClick={() => comingSoon("OPay")}
            className="p-6 cursor-pointer opacity-70 border-dashed">

            <div className="flex justify-between items-center">

              <div className="flex gap-4">
                <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
                  <Smartphone className="size-5 text-muted-foreground" />
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg">OPay</h3>
                  <p className="text-sm text-muted-foreground">
                    Mobile money • Transfers • Coming soon
                  </p>
                </div>
              </div>

              <span className="text-xs text-muted-foreground">Soon</span>
            </div>
          </Card>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Secure payments powered by trusted financial providers
        </p>

      </div>
    </div>
  );
}