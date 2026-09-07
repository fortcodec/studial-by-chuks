import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { reference, user_id } = await req.json();

    if (!reference || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: reference or user_id" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) throw new Error("Server missing Paystack configuration");

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${paystackSecret}`
      }
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== "success") {
      return new Response(
        JSON.stringify({ error: "Payment verification failed or pending" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const amountPaid = paystackData.data.amount; 
    const coinsToCredit = Math.floor(amountPaid / 100); 

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: existingTx } = await supabaseAdmin
      .from("c_coin_transactions")
      .select("id")
      .eq("reference", reference)
      .single();

    if (existingTx) {
        return new Response(
            JSON.stringify({ message: "Transaction already processed", credited: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
    }

    const { error: txError } = await supabaseAdmin
      .from("c_coin_transactions")
      .insert({
        user_id: user_id,
        amount: coinsToCredit,
        transaction_type: "purchase",
        reference: reference
      });

    if (txError) throw txError;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("c_coins")
      .eq("id", user_id)
      .single();
      
    const currentCoins = profile?.c_coins || 0;
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ c_coins: currentCoins + coinsToCredit })
      .eq("id", user_id);

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ success: true, credited: coinsToCredit }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Verification Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error during verification" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
