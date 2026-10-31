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

- [2026-10-31] [Context of Change: Preparing the existing Sites video prototype for a public launch within one week.] [Implementation Details: Reorganized the application as a modular monolith with internal video, object-storage, and engagement modules; retained D1 for structured metadata/events and R2 for uploaded bytes linked by `videos.object_key`; added local Miniflare migration support and first-party engagement capture.] [Reason for Pivot: The prototype's route-level data access was fast to build but too tightly coupled for launch-scale reliability, measurement, and future ownership. A modular monolith adds clear boundaries without the operational cost of premature services.]
