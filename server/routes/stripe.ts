import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth, getUserProfile, supabaseAdmin } from '../supabaseAuth.js';

const router = Router();
const isDev = process.env.NODE_ENV !== 'production';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key);
}

function getProPriceId(): string {
  const id = process.env.STRIPE_PRO_PRICE_ID;
  if (!id) throw new Error('STRIPE_PRO_PRICE_ID is not configured');
  return id;
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  return secret;
}

function getReturnUrl(): string {
  return process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3001';
}

// ─── Helper: ensure user has a Stripe customer record ────────────────────────

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const profile = await getUserProfile(userId);
  const stripe = getStripe();

  if (profile?.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(profile.stripe_customer_id);
      // Stripe returns deleted customers with deleted: true instead of throwing — can't use for new subscriptions
      if (!(existing as Stripe.Customer & { deleted?: boolean }).deleted) {
        return profile.stripe_customer_id;
      }
    } catch (err: any) {
      // Customer doesn't exist in Stripe — clear and create new
      const isNoSuchCustomer = err?.code === 'resource_missing' || err?.code === 'resource_missing_no_connection' || /no such customer/i.test(err?.message || '');
      if (!isNoSuchCustomer) throw err;
    }
    await supabaseAdmin
      .from('user_profiles')
      .update({ stripe_customer_id: null })
      .eq('id', userId);
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await supabaseAdmin
    .from('user_profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

// ─── POST /create-checkout-session ───────────────────────────────────────────

router.post('/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
    if (!authUser?.email) return res.status(400).json({ error: 'User email not found' });

    const profile = await getUserProfile(req.user.id);
    if (profile?.tier === 'pro') {
      return res.status(400).json({ error: 'Already on Pro plan' });
    }

    const customerId = await getOrCreateStripeCustomer(req.user.id, authUser.email);
    const stripe = getStripe();

    // Prevent duplicate subscriptions: if Stripe already has an active subscription for this customer, don't create another
    const existingSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    if (existingSubs.data.length > 0) {
      return res.status(400).json({
        error: 'You already have an active Pro subscription. Use "Manage Subscription" to view or cancel it.',
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: req.user.id,
      mode: 'subscription',
      line_items: [{ price: getProPriceId(), quantity: 1 }],
      success_url: `${getReturnUrl()}?upgrade=success`,
      cancel_url: `${getReturnUrl()}?upgrade=cancelled`,
      subscription_data: {
        metadata: { supabase_user_id: req.user.id },
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error('[Stripe] Checkout session error:', msg);
    if (process.env.NODE_ENV !== 'production') console.error('[Stripe] Stack:', error?.stack);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ─── POST /sync-subscription ───────────────────────────────────────────────────
// Call after return from Stripe Checkout (?upgrade=success) to grant Pro if
// Stripe has an active subscription (fallback when webhook hasn't run yet).

router.post('/sync-subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await getUserProfile(req.user.id);
    if (!profile?.stripe_customer_id) {
      return res.json({ tier: profile?.tier ?? 'free', updated: false });
    }

    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ tier: 'pro', updated_at: new Date().toISOString() })
        .eq('id', req.user.id);
      if (isDev) console.log(`[Stripe] Synced tier to Pro for user ${req.user.id}`);
      return res.json({ tier: 'pro', updated: true });
    }

    res.json({ tier: profile.tier, updated: false });
  } catch (error: any) {
    console.error('[Stripe] Sync subscription error:', error?.message);
    res.status(500).json({ error: 'Failed to sync subscription' });
  }
});

// ─── POST /create-portal-session ─────────────────────────────────────────────

router.post('/create-portal-session', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await getUserProfile(req.user.id);
    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: getReturnUrl(),
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe] Portal session error:', error.message);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ─── POST /webhook ───────────────────────────────────────────────────────────
// Body must be raw (Buffer) — mounted with express.raw() in index.ts

router.post('/webhook', async (req: Request, res: Response) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, getWebhookSecret());
  } catch (err: any) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (isDev) console.log('[Stripe] Webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (!userId) {
          console.error('[Stripe] checkout.session.completed missing client_reference_id');
          break;
        }
        await supabaseAdmin
          .from('user_profiles')
          .update({ tier: 'pro', updated_at: new Date().toISOString() })
          .eq('id', userId);
        if (isDev) console.log(`[Stripe] User ${userId} upgraded to Pro`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (subscription.status === 'active') {
          await supabaseAdmin
            .from('user_profiles')
            .update({ tier: 'pro', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', customerId);
        } else if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ tier: 'free', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', customerId);
          if (isDev) console.log(`[Stripe] Customer ${customerId} downgraded to Free (status: ${subscription.status})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        await supabaseAdmin
          .from('user_profiles')
          .update({ tier: 'free', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);
        if (isDev) console.log(`[Stripe] Customer ${customerId} subscription deleted → Free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[Stripe] Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`);
        break;
      }

      default:
        if (isDev) console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }
  } catch (error: any) {
    console.error(`[Stripe] Error processing ${event.type}:`, error.message);
  }

  res.json({ received: true });
});

export default router;
