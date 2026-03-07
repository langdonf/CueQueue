import Stripe from "stripe";

export function getStripe(): Stripe {
  // Create a fresh instance each call — avoids stale connection issues
  // on serverless platforms (Vercel) where cached instances can hold
  // dead TCP connections from previous invocations.
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    typescript: true,
  });
}
