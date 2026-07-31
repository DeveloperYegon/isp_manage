import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DarajaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const callback = (await req.json()) as DarajaCallback;
    const stk = callback.Body?.stkCallback;

    if (!stk) {
      return new Response(
        JSON.stringify({ error: "Invalid callback format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find the transaction by checkout request ID
    const { data: transaction } = await supabase
      .from("billing_transactions")
      .select("id, customer_username, plan_id, amount")
      .eq("mpesa_checkout_request_id", stk.CheckoutRequestID)
      .maybeSingle();

    if (!transaction) {
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract receipt number from callback metadata
    let receipt: string | null = null;
    if (stk.CallbackMetadata?.Item) {
      const receiptItem = stk.CallbackMetadata.Item.find(
        (item) => item.Name === "MpesaReceiptNumber"
      );
      if (receiptItem?.Value) {
        receipt = String(receiptItem.Value);
      }
    }

    if (stk.ResultCode === 0) {
      // Payment successful
      await supabase
        .from("billing_transactions")
        .update({
          status: "completed",
          callback_received: true,
          mpesa_receipt: receipt,
          mpesa_result_code: stk.ResultCode,
          mpesa_result_desc: stk.ResultDesc,
        })
        .eq("id", transaction.id);

      // If a plan is associated, assign the user to that plan
      if (transaction.plan_id && transaction.customer_username) {
        // Get the plan's groupname
        const { data: plan } = await supabase
          .from("radgroupreply")
          .select("groupname, plan_duration_hours")
          .eq("id", transaction.plan_id)
          .maybeSingle();

        if (plan) {
          // Update the user's plan in radcheck
          const expiresAt = new Date(
            Date.now() + (plan.plan_duration_hours || 24) * 60 * 60 * 1000
          ).toISOString();

          await supabase
            .from("radcheck")
            .update({
              plan_id: transaction.plan_id,
              status: "active",
              expires_at: expiresAt,
            })
            .eq("username", transaction.customer_username);

          // Update or insert radusergroup mapping
          await supabase
            .from("radusergroup")
            .delete()
            .eq("username", transaction.customer_username);

          await supabase
            .from("radusergroup")
            .insert({
              username: transaction.customer_username,
              groupname: plan.groupname,
              priority: 1,
            });
        }
      }
    } else {
      // Payment failed or cancelled
      await supabase
        .from("billing_transactions")
        .update({
          status: "failed",
          callback_received: true,
          mpesa_result_code: stk.ResultCode,
          mpesa_result_desc: stk.ResultDesc,
        })
        .eq("id", transaction.id);
    }

    return new Response(
      JSON.stringify({ status: "ok" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
