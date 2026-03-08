import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Ensure a profile row exists (it may be missing if the DB trigger
    // didn't fire or the user deleted their profile and re-signed up)
    const admin = createSupabaseAdminClient();
    await admin
      .from("profiles")
      .upsert(
        { id: user.id, display_name: user.email?.split("@")[0] ?? "user" },
        { onConflict: "id", ignoreDuplicates: true }
      );

    // Get or create Stripe customer
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create Checkout Session for $5/year subscription
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      metadata: { supabase_user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", JSON.stringify(err, Object.getOwnPropertyNames(err as object)));
    const message = err instanceof Error ? err.message : String(err);
    const type = err && typeof err === "object" && "type" in err ? (err as { type: string }).type : "unknown";
    return NextResponse.json(
      { error: `Checkout failed [${type}]: ${message}` },
      { status: 500 }
    );
  }
}
