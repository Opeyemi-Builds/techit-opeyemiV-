import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Secure Pricing Matrix 
// NGN is in Kobo (1000 NGN = 100000)
// USD is in Cents (1 USD = 100)
const PACKAGES: Record<string, { NGN: number, USD: number, credits: number, name: string }> = {
  starter: { NGN: 100000, USD: 100, credits: 500, name: "Starter" },      // 1,000 NGN | $1.00
  builder: { NGN: 250000, USD: 250, credits: 1500, name: "Builder" },     // 2,500 NGN | $2.50
  pro:     { NGN: 500000, USD: 500, credits: 5000, name: "Pro" },         // 5,000 NGN | $5.00
  elite:   { NGN: 1000000, USD: 1000, credits: 15000, name: "Elite" },    // 10,000 NGN | $10.00
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { packageId, provider, email, currency = "NGN" } = await req.json()
    const selectedPkg = PACKAGES[packageId]

    if (!selectedPkg) throw new Error("Invalid package selected")
    if (!email) throw new Error("User email is required")
    if (currency !== "NGN" && currency !== "USD") throw new Error("Unsupported currency")

    // Get the correct amount based on the selected currency
    const finalAmount = selectedPkg[currency]

    if (provider === 'paystack') {
      const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
      
      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          amount: finalAmount,
          currency: currency, 
          callback_url: "https://techit-network.vercel.app/wallet",
          metadata: { 
            packageId: packageId, 
            credits: selectedPkg.credits,
            currency: currency
          }
        }),
      })

      const data = await paystackRes.json()
      
      if (!data.status) throw new Error(data.message)

      return new Response(
        JSON.stringify({ url: data.data.authorization_url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error("Provider not yet supported")

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})