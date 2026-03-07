import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, {
    // Stripe SDK v20 changed the default HTTP client which can fail
    // on Vercel serverless. Explicitly use the Node.js HTTP client.
    httpClient: Stripe.createNodeHttpClient(),
  });
}
