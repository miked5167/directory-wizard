import Stripe from 'stripe';

export interface StripeConfig {
  secretKey: string;
  publishableKey?: string;
  apiVersion?: '2023-10-16';
  maxNetworkRetries?: number;
  timeout?: number;
  host?: string;
  port?: number;
  protocol?: 'http' | 'https';
  telemetry?: boolean;
}

export interface CustomerData {
  email: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  interval_count?: number;
  trial_period_days?: number;
  features: string[];
  metadata?: Record<string, string>;
}

export interface PaymentIntentData {
  amount: number; // in cents
  currency: string;
  customer?: string;
  description?: string;
  metadata?: Record<string, string>;
  payment_method_types?: string[];
  setup_future_usage?: 'off_session' | 'on_session';
  receipt_email?: string;
}

export interface SubscriptionData {
  customer: string;
  price: string;
  trial_period_days?: number;
  metadata?: Record<string, string>;
  payment_behavior?: 'default_incomplete' | 'allow_incomplete' | 'error_if_incomplete';
  collection_method?: 'charge_automatically' | 'send_invoice';
  expand?: string[];
}

export interface WebhookEvent {
  id: string;
  object: 'event';
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
}

export interface BillingPortalConfig {
  business_profile: {
    headline?: string;
    privacy_policy_url?: string;
    terms_of_service_url?: string;
  };
  features: {
    customer_update: {
      allowed_updates: Array<'email' | 'address' | 'shipping' | 'phone' | 'tax_id'>;
      enabled: boolean;
    };
    invoice_history: {
      enabled: boolean;
    };
    payment_method_update: {
      enabled: boolean;
    };
    subscription_cancel: {
      enabled: boolean;
      mode?: 'at_period_end' | 'immediately';
      proration_behavior?: 'none' | 'create_prorations' | 'always_invoice';
      cancellation_reason?: {
        enabled: boolean;
        options: Array<'too_expensive' | 'missing_features' | 'switched_service' | 'unused' | 'customer_service' | 'too_complex' | 'low_quality' | 'other'>;
      };
    };
    subscription_pause: {
      enabled: boolean;
    };
    subscription_update: {
      enabled: boolean;
      default_allowed_updates: Array<'price' | 'quantity' | 'promotion_code'>;
      proration_behavior?: 'none' | 'create_prorations' | 'always_invoice';
    };
  };
}

export class StripeClient {
  private stripe: Stripe;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion || '2023-10-16',
      maxNetworkRetries: config.maxNetworkRetries || 3,
      timeout: config.timeout || 80000, // 80 seconds
      host: config.host,
      port: config.port,
      protocol: config.protocol || 'https',
      telemetry: config.telemetry !== false,
    });
  }

  // Customer management
  async createCustomer(customerData: CustomerData): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      description: customerData.description,
      metadata: customerData.metadata || {},
      address: customerData.address,
    });

    return customer;
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer as Stripe.Customer;
    } catch (error: any) {
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        return null;
      }
      throw error;
    }
  }

  async updateCustomer(customerId: string, updates: Partial<CustomerData>): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.update(customerId, {
      email: updates.email,
      name: updates.name,
      phone: updates.phone,
      description: updates.description,
      metadata: updates.metadata,
      address: updates.address,
    });

    return customer;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.stripe.customers.del(customerId);
  }

  async listCustomers(options?: {
    email?: string;
    limit?: number;
    starting_after?: string;
    ending_before?: string;
  }): Promise<Stripe.ApiList<Stripe.Customer>> {
    return await this.stripe.customers.list({
      email: options?.email,
      limit: options?.limit || 10,
      starting_after: options?.starting_after,
      ending_before: options?.ending_before,
    });
  }

  // Product and Price management
  async createProduct(productData: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
    images?: string[];
    url?: string;
  }): Promise<Stripe.Product> {
    return await this.stripe.products.create({
      name: productData.name,
      description: productData.description,
      metadata: productData.metadata || {},
      images: productData.images,
      url: productData.url,
    });
  }

  async createPrice(priceData: {
    product: string;
    unit_amount: number;
    currency: string;
    recurring?: {
      interval: 'month' | 'year';
      interval_count?: number;
    };
    metadata?: Record<string, string>;
  }): Promise<Stripe.Price> {
    return await this.stripe.prices.create({
      product: priceData.product,
      unit_amount: priceData.unit_amount,
      currency: priceData.currency,
      recurring: priceData.recurring,
      metadata: priceData.metadata || {},
    });
  }

  async createSubscriptionPlan(plan: SubscriptionPlan): Promise<{
    product: Stripe.Product;
    price: Stripe.Price;
  }> {
    // Create product
    const product = await this.createProduct({
      name: plan.name,
      description: plan.description,
      metadata: {
        ...plan.metadata,
        features: JSON.stringify(plan.features),
      },
    });

    // Create price
    const price = await this.createPrice({
      product: product.id,
      unit_amount: plan.price,
      currency: plan.currency,
      recurring: {
        interval: plan.interval,
        interval_count: plan.interval_count || 1,
      },
      metadata: plan.metadata,
    });

    return { product, price };
  }

  // Payment Intents
  async createPaymentIntent(paymentData: PaymentIntentData): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.create({
      amount: paymentData.amount,
      currency: paymentData.currency,
      customer: paymentData.customer,
      description: paymentData.description,
      metadata: paymentData.metadata || {},
      payment_method_types: paymentData.payment_method_types || ['card'],
      setup_future_usage: paymentData.setup_future_usage,
      receipt_email: paymentData.receipt_email,
    });
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    options?: {
      payment_method?: string;
      return_url?: string;
    }
  ): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: options?.payment_method,
      return_url: options?.return_url,
    });
  }

  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  // Subscriptions
  async createSubscription(subscriptionData: SubscriptionData): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.create({
      customer: subscriptionData.customer,
      items: [{ price: subscriptionData.price }],
      trial_period_days: subscriptionData.trial_period_days,
      metadata: subscriptionData.metadata || {},
      payment_behavior: subscriptionData.payment_behavior || 'default_incomplete',
      collection_method: subscriptionData.collection_method || 'charge_automatically',
      expand: subscriptionData.expand || ['latest_invoice.payment_intent'],
    });
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error: any) {
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        return null;
      }
      throw error;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: {
      price?: string;
      quantity?: number;
      metadata?: Record<string, string>;
      trial_end?: number | 'now';
      proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
    }
  ): Promise<Stripe.Subscription> {
    const updateData: any = {
      metadata: updates.metadata,
      trial_end: updates.trial_end,
      proration_behavior: updates.proration_behavior,
    };

    if (updates.price) {
      updateData.items = [{ price: updates.price, quantity: updates.quantity || 1 }];
    }

    return await this.stripe.subscriptions.update(subscriptionId, updateData);
  }

  async cancelSubscription(
    subscriptionId: string,
    options?: {
      at_period_end?: boolean;
      cancellation_details?: {
        comment?: string;
        feedback?: string;
      };
    }
  ): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.cancel(subscriptionId, {
      cancel_at_period_end: options?.at_period_end,
      cancellation_details: options?.cancellation_details,
    });
  }

  async listSubscriptions(customerId?: string): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method'],
    });
  }

  // Invoices
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.retrieve(invoiceId);
  }

  async listInvoices(customerId?: string): Promise<Stripe.ApiList<Stripe.Invoice>> {
    return await this.stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });
  }

  async payInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.pay(invoiceId);
  }

  // Payment Methods
  async listPaymentMethods(
    customerId: string,
    type: 'card' | 'us_bank_account' = 'card'
  ): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    return await this.stripe.paymentMethods.list({
      customer: customerId,
      type,
    });
  }

  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    return await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  // Billing Portal
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    return await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async createBillingPortalConfiguration(
    config: BillingPortalConfig
  ): Promise<Stripe.BillingPortal.Configuration> {
    return await this.stripe.billingPortal.configurations.create(config);
  }

  // Checkout Sessions
  async createCheckoutSession(options: {
    customer?: string;
    customer_email?: string;
    line_items: Array<{
      price: string;
      quantity?: number;
    }>;
    mode: 'payment' | 'setup' | 'subscription';
    success_url: string;
    cancel_url: string;
    metadata?: Record<string, string>;
    subscription_data?: {
      trial_period_days?: number;
      metadata?: Record<string, string>;
    };
  }): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.create({
      customer: options.customer,
      customer_email: options.customer_email,
      line_items: options.line_items,
      mode: options.mode,
      success_url: options.success_url,
      cancel_url: options.cancel_url,
      metadata: options.metadata || {},
      subscription_data: options.subscription_data,
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
    });
  }

  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer', 'subscription'],
    });
  }

  // Webhooks
  constructWebhookEvent(
    payload: string,
    signature: string,
    secret: string
  ): WebhookEvent {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return event as WebhookEvent;
    } catch (error: any) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  // Usage and metering (for usage-based pricing)
  async createUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: number
  ): Promise<Stripe.UsageRecord> {
    return await this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'increment',
    });
  }

  async listUsageRecords(
    subscriptionItemId: string,
    options?: {
      limit?: number;
      starting_after?: string;
      ending_before?: string;
    }
  ): Promise<Stripe.ApiList<Stripe.UsageRecord>> {
    return await this.stripe.subscriptionItems.listUsageRecordSummaries(subscriptionItemId, {
      limit: options?.limit || 10,
      starting_after: options?.starting_after,
      ending_before: options?.ending_before,
    });
  }

  // Analytics and reporting
  async getSubscriptionMetrics(options?: {
    start_date?: Date;
    end_date?: Date;
  }): Promise<{
    total_subscriptions: number;
    active_subscriptions: number;
    cancelled_subscriptions: number;
    trial_subscriptions: number;
    total_revenue: number; // in cents
    currency: string;
  }> {
    // This would typically involve querying Stripe's reporting API
    // For now, we'll provide a method that aggregates from subscriptions
    const subscriptions = await this.stripe.subscriptions.list({
      status: 'all',
      limit: 100,
    });

    let active = 0;
    let cancelled = 0;
    let trial = 0;
    let totalRevenue = 0;

    subscriptions.data.forEach(sub => {
      switch (sub.status) {
        case 'active':
          active++;
          if (sub.items.data[0]?.price?.unit_amount) {
            totalRevenue += sub.items.data[0].price.unit_amount;
          }
          break;
        case 'canceled':
          cancelled++;
          break;
        case 'trialing':
          trial++;
          break;
      }
    });

    return {
      total_subscriptions: subscriptions.data.length,
      active_subscriptions: active,
      cancelled_subscriptions: cancelled,
      trial_subscriptions: trial,
      total_revenue: totalRevenue,
      currency: 'usd', // Default currency
    };
  }

  // Coupons and discounts
  async createCoupon(couponData: {
    id?: string;
    percent_off?: number;
    amount_off?: number;
    currency?: string;
    duration: 'forever' | 'once' | 'repeating';
    duration_in_months?: number;
    max_redemptions?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Coupon> {
    return await this.stripe.coupons.create(couponData);
  }

  async getCoupon(couponId: string): Promise<Stripe.Coupon | null> {
    try {
      return await this.stripe.coupons.retrieve(couponId);
    } catch (error: any) {
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        return null;
      }
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // Test Stripe API connectivity by listing a single customer
      await this.stripe.customers.list({ limit: 1 });
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get underlying Stripe client for advanced usage
  getStripeClient(): Stripe {
    return this.stripe;
  }

  // Utility methods
  formatAmount(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  parseAmount(formattedAmount: string): number {
    // Remove currency symbols and convert to cents
    const cleanAmount = formattedAmount.replace(/[^0-9.]/g, '');
    return Math.round(parseFloat(cleanAmount) * 100);
  }
}

// Default configuration
const defaultConfig: StripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  apiVersion: '2023-10-16',
  maxNetworkRetries: 3,
  timeout: 80000,
  telemetry: true,
};

// Default client instance
export const stripeClient = new StripeClient(defaultConfig);

// Factory function for custom configurations
export const createStripeClient = (config: Partial<StripeConfig>): StripeClient => {
  return new StripeClient({ ...defaultConfig, ...config });
};

// Webhook event types for type safety
export const STRIPE_WEBHOOK_EVENTS = {
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_FAILED: 'payment_intent.payment_failed',
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
} as const;

export type StripeWebhookEvent = typeof STRIPE_WEBHOOK_EVENTS[keyof typeof STRIPE_WEBHOOK_EVENTS];

export type { Stripe };