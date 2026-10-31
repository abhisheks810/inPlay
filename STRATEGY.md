# Streamline strategy

## Current direction

Ship Streamline as a modular monolith: one repository and one production deployment, with explicit module contracts for video metadata, uploaded objects, engagement, and platform adapters. Optimize for a dependable launch while retaining clean extraction seams if traffic or team ownership later justifies services.

## Launch priorities

1. Durable and independently manageable metadata and uploaded content.
2. Privacy-conscious first-party engagement measurement.
3. Upload/playback reliability and recovery behavior.
4. Content safety, rate limits, and operator visibility.
5. Production verification and public launch.

## Pivot log

- [2026-10-31] [Context of Change: Uploaded video playback was reported failing online despite successful storage.] [Implementation Details: Reproduced playback after refresh, identified advertised but unimplemented byte-range support, and added R2 ranged reads, 206/416 responses, HEAD metadata, and private caching.] [Reason for Pivot: Upload success alone is insufficient; browser media compatibility and seeking must be verified against the deployed stream.]
- [2026-10-31] [Context of Change: Owner requested a private hosted release before public launch.] [Implementation Details: Restricted Sites access to the owner with empty viewer and group allowlists; retained the hosted address pending a user-provided rented domain; reconciled the hosting history with the identical GitHub import before publication.] [Reason for Pivot: An owner-only release supports real hosting validation while the public launch and custom-domain configuration remain pending.]
- [2026-10-31] [Context of Change: Creator uploads need identity verification beyond the Sites-managed ChatGPT account flow.] [Implementation Details: Added a modular federated-identity boundary for Apple, Google, and Zoho using server-side OpenID Connect; introduced D1-backed users, provider-subject links, single-use OAuth transactions, and hashed sessions; preserved ChatGPT identity as a platform adapter and unified upload authorization across providers.] [Reason for Pivot: Supporting provider choice improves creator access for launch, while a shared internal identity contract avoids coupling video ownership to any single authentication vendor.]
- [2026-10-31] [Context of Change: Preparing the existing Sites video prototype for a public launch within one week.] [Implementation Details: Reorganized the application as a modular monolith with internal video, object-storage, and engagement modules; retained D1 for structured metadata/events and R2 for uploaded bytes linked by `videos.object_key`; added local Miniflare migration support and first-party engagement capture.] [Reason for Pivot: The prototype's route-level data access was fast to build but too tightly coupled for launch-scale reliability, measurement, and future ownership. A modular monolith adds clear boundaries without the operational cost of premature services.]
