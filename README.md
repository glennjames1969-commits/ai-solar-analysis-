# AI Solar Analysis

Customer flow:

1. Customer uploads the solar quote once.
2. Customer pays $9.90 AUD through Stripe Checkout.
3. The paid session is verified.
4. The uploaded quote is sent directly to the OpenAI Responses API for analysis.
5. A customer-facing report is generated.
6. If Resend is configured, the report link is emailed.

No Dropbox step is included.

## Vercel environment variables

Required:
- `STRIPE_SECRET_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `OPENAI_API_KEY`

Recommended:
- `OPENAI_MODEL` (defaults to `gpt-6-luna`)
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY`
- `REPORT_FROM_EMAIL`

## Important

The current version intentionally keeps the architecture simple. Before taking real customer payments, add durable report storage and a Stripe webhook as the source of truth for paid orders. The success-page analysis is designed for fast delivery/testing, not as a replacement for payment webhooks at scale. .
