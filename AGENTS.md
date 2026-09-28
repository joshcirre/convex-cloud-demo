# Self-hosted deployment

Read README.md before deploying. This demo targets the separate Convex-on-Laravel-Cloud starter, never Lawn. Use `npm run convex:deploy` or `npm run convex:dev` with the ignored `.env.self-hosted`. Never run bare `convex dev` or provision a hosted Convex project. Keep Convex pinned to 1.41.0 for the matching backend. Upstream generated guidelines below target a newer release; verify API availability against the pinned package before adopting new features. Do not expose admin credentials to frontend code.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
