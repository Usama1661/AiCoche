import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { isResponse, readJson, requireAuth } from '../_shared/supabase.ts';

type Body = {
  plan?: 'free' | 'pro';
  provider?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  metadata?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { supabase, user } = await requireAuth(req);
    const body = await readJson<Body>(req);
    const provider = body.provider ?? Deno.env.get('PAYMENT_PROVIDER') ?? 'manual';
    const plan = body.plan ?? 'pro';

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          provider,
          provider_customer_id: body.providerCustomerId ?? null,
          provider_subscription_id: body.providerSubscriptionId ?? null,
          plan,
          status: plan === 'free' ? 'inactive' : 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: plan === 'free'
            ? null
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: body.metadata ?? { source: 'edge-function-placeholder' },
        },
        { onConflict: 'user_id,provider' }
      )
      .select('*')
      .single();

    if (error) throw error;

    return jsonResponse({
      subscription: data,
      checkoutUrl: null,
      note: 'Wire Stripe, RevenueCat, or another provider here before accepting real payments.',
    });
  } catch (error) {
    if (isResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error(error);
    return jsonResponse({ error: message }, 500);
  }
});
