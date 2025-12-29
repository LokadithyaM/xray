This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# X-Ray Observability System

## Overview

X-Ray is a lightweight observability layer designed to make **decision-making pipelines debuggable**.

In many modern systems — search, filtering, ranking, or LLM-driven workflows — failures are difficult to diagnose because traditional logs capture *what happened*, but not *why a specific decision was made*.

X-Ray focuses on **decision traceability**.  
It records the reasoning and context behind every pass/fail decision so outcomes can be understood after the fact without reverse-engineering the pipeline.

---

## Problem Statement

Multi-step systems often involve:
- non-deterministic components (e.g. LLMs),
- large candidate sets,
- layered filters and ranking logic.

When an output is incorrect, engineers are left guessing:
- Was the input generation wrong?
- Were filters too strict?
- Did the ranking logic dominate the outcome?

Traditional logging and tracing tools are not designed to answer these questions.

X-Ray addresses this by treating **decisions** as first-class events.

---

## Design Philosophy

X-Ray is built around three principles:

1. **Capture the “why”**
   - Every decision records explicit reasoning, not just inputs and outputs.

2. **Preserve context**
   - Events include enough contextual data to reconstruct the decision later without external lookups.

3. **Stop at the right abstraction**
   - X-Ray captures decision semantics.
   - Aggregation, analytics, and large-scale interpretation are intentionally left to downstream systems.

---

## Core Abstraction: Decision Events

At the heart of X-Ray is a simple, general-purpose event model.

Each event represents a **decision**, not a function call or trace span.

An event answers:
- What was evaluated?
- What decision was made?
- Why was that decision made?
- Under what context?

This abstraction allows X-Ray to be reused across domains such as filtering, ranking, scoring, or LLM evaluation.

---

## Architecture

The system is implemented as a small functional library with module-level state.

There are no framework dependencies, databases, or external services.  
The focus is on clarity of design rather than production infrastructure.

### Key Components

- **X-Ray Logger**
  - Ingests decision events
  - Maintains an in-memory event stream
  - Notifies subscribers on updates

- **Helper APIs**
  - Standardize common decision patterns (pass / fail)
  - Prevent inconsistent or vague reasoning messages

- **Dashboard (Consumer)**
  - Subscribes to the event stream
  - Renders decision history for debugging
  - Does not own business logic

This separation allows the same event stream to feed dashboards, analytics, or automated analysis tools.

---

## Demo Application

A simple mock filtering workflow is included to demonstrate X-Ray usage.

- Uses dummy product data
- Evaluates products against search and filter criteria
- Logs pass/fail decisions with explicit reasons
- Records summary execution statistics

The demo exists only to showcase X-Ray integration.  
It intentionally avoids real APIs or production-scale concerns.

---

## Example Decision Reasoning

Instead of vague logs like:
Product filtered

X-Ray records specific, actionable explanations:

Product "Velocity Soccer Equipment" filtered out:
price $45 < $50 minimum


This makes debugging immediate and unambiguous.

---

## Scalability Considerations

At very large scale (e.g. billions of products), raw decision events are not intended to be read directly by humans.

In practice, X-Ray events would serve as a **ground-truth layer**:
- aggregated,
- sampled,
- or analyzed by automation or LLM-based systems
to surface patterns and anomalies.

This implementation focuses on correctness and clarity of decision capture rather than downstream analytics or storage.

---

## Trade-offs & Limitations

- Uses in-memory storage instead of persistence
- Uses mock data instead of real APIs
- Simulates reasoning steps instead of live LLM calls

These choices were intentional to keep the scope focused on system design and decision transparency.

---

## Future Improvements

With more time, possible extensions include:
- persistent storage and replay across executions,
- richer querying and aggregation,
- counterfactual analysis (e.g. “what if this filter were relaxed?”),
- automated insight extraction from decision logs.

---
