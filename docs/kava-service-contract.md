# Digital Kava Circle service boundary

The shipped circle layer saves Koro-scoped rooms, 4–6 speaker seats, audience seat requests, host moderation and comments. The host starts the written conversation explicitly. Video and real payments are unavailable until their services have been verified; there are no simulated balances, sample earnings or successful-payment animations.

## Video connection

Use a WebRTC SFU with TURN support for the speaker stage and a larger audience. Do not upload a separate copy of the app or create a six-person full mesh with every audience viewer. The selected service is still pending; no new video account or recurring service has been created.

A future server-side join endpoint must validate the app's authenticated user and current Koro membership, then load the circle from the authoritative database. Only its host and members with a current assigned speaker seat receive permission to publish microphone/camera tracks. Audience credentials subscribe only. The token must expire quickly, bind to one circle and one member, and use server-stored credentials. A client-selected role must never grant publishing permission. Seat demotion and circle closure must revoke active publishing rights through the provider; token expiry alone is insufficient. Explicit user consent is required before activating camera/microphone. Provide audio-only listening, adaptive video and reconnect behaviour.

## Fiat tipping connection

The current shared `/functions/v1/pay` endpoint returns `configured:false`. The UI supports FJD, GBP, AUD and NZD amounts of 2, 5 or 10 in the selected currency, represented as integer minor units. It cannot send a payment and does not invent fee or exchange-rate estimates.

Before enabling tipping, confirm the collection country, legal entity, creator onboarding, supported Fiji payout corridor and fee payer. Stripe's self-serve Connect cross-border payouts cover US, UK, EEA, Canada and Switzerland, and do not automatically provide Fiji creator payouts. Evaluate a supported contracted payout route before taking donor money.

A backend must produce a time-limited quote binding payer, recipient, currency, tip amount, every processing/platform/FX/payout fee, amount received and payout timing. Confirmation must use that exact quote with an idempotency key. A verified provider webhook, rather than browser success navigation, finalises payment status. Refund and dispute paths must reverse or reserve the relevant ledger amounts. Keep settlement pending separate from funds available and bank payout. Never promise instant withdrawal unless the chosen route supports it. Tips are optional, private and do not create rankings, speaking rights or influence over host moderation.

## Verification

The schema enables RLS on every exposed circle table. Only current Koro members can see or enter a circle; the host alone assigns seats and moderates others. Seat one stays with the host; unique seat allocation and the configured capacity are enforced by the database. Advisory transaction locks serialize comment/state changes. Closed circles cannot reopen or receive comments. Fixtures in `tests/kava-db.sql` exercise these rules inside a transaction and must roll back.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Stripe cross-border payouts](https://docs.stripe.com/connect/cross-border-payouts).
