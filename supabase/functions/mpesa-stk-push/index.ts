import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface STKPushRequest {
  transactionId: string;
  phone: string;
  amount: number;
  reference: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { transactionId, phone, amount, reference } = (await req.json()) as STKPushRequest;

    if (!phone || !amount || !transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: transactionId, phone, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (Safaricom: 2547XXXXXXXX or 07XXXXXXXX)
    let formattedPhone = phone.replace(/\s/g, "");
    if (formattedPhone.startsWith("07")) {
      formattedPhone = "254" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("+254")) {
      formattedPhone = formattedPhone.slice(1);
    }
    if (!/^254[17]\d{8}$/.test(formattedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format. Use 2547XXXXXXXX or 07XXXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Daraja API credentials from environment
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE") || "174379";
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const env = Deno.env.get("MPESA_ENV") || "sandbox";
    const baseUrl = env === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // If no Daraja credentials are configured, return a simulated response
    // so the UI flow works in development. The callback edge function will
    // still handle real callbacks when credentials are set.
    if (!consumerKey || !consumerSecret || !passkey) {
      const simulatedCheckoutId = `ws_CO_${Date.now()}${Math.floor(Math.random() * 10000)}`;
      const simulatedMerchantId = `sim-${Date.now()}`;

      // Update the transaction with simulated IDs
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await supabase
        .from("billing_transactions")
        .update({
          mpesa_checkout_request_id: simulatedCheckoutId,
          mpesa_merchant_request_id: simulatedMerchantId,
        })
        .eq("id", transactionId);

      return new Response(
        JSON.stringify({
          checkoutRequestId: simulatedCheckoutId,
          merchantRequestId: simulatedMerchantId,
          simulated: true,
          message: "M-Pesa credentials not configured. STK push simulated. Configure MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, and MPESA_PASSKEY to enable real Daraja API calls.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get OAuth access token from Daraja
    const authUrl = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    const authResponse = await fetch(authUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
      },
    });

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with Daraja API" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Step 2: Generate password (shortcode + passkey + timestamp)
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    // Step 3: Send STK push request
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: reference,
        TransactionDesc: `Payment for ${reference}`,
      }),
    });

    const stkData = await stkResponse.json();

    if (!stkResponse.ok || stkData.ResponseCode !== "0") {
      // Update transaction as failed
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await supabase
        .from("billing_transactions")
        .update({
          status: "failed",
          mpesa_result_desc: stkData.errorMessage || stkData.ResponseDescription || "STK push failed",
        })
        .eq("id", transactionId);

      return new Response(
        JSON.stringify({ error: stkData.errorMessage || "STK push failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction with Daraja request IDs
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    await supabase
      .from("billing_transactions")
      .update({
        mpesa_checkout_request_id: stkData.CheckoutRequestID,
        mpesa_merchant_request_id: stkData.MerchantRequestID,
      })
      .eq("id", transactionId);

    return new Response(
      JSON.stringify({
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
        message: "STK push sent successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
