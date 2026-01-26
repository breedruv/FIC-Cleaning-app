# AGENTS.md

## Purpose
This file provides repo-specific guidance for Codex so changes are consistent and safe.

## Access and privacy
- You may read any repo file except .env or other secret files.
- Do not request, print, or log secret values.
- If a secret is required, use a placeholder and ask the user for the value outside the repo.

## Project snapshot (from docs)
- App: Shopify cleaning service app with storefront intake, customer tracking portal, and admin console.
- Experience: Domino's-style milestone tracker for customer status visibility.
- Roles: Customer, Service Team, Admin.
- Lifecycle: Request Submitted -> Shipment In Transit -> Checked in -> Cleaning In Progress -> Quality Review -> Ready for Return -> Completed.
- Data model highlights: ServiceRequest, ServiceItem, ServiceStatusEvent, ServiceDocument, NotificationLog, AdminUser.

## Repo layout
- app/src/server.js: Express entry point.
- app/src/routes/: Route handlers (health, serviceRequests, shopify).
- app/src/models/: Shared domain data (status milestones).
- app/src/services/: Utility services (service number generation).
- app/src/shopify/: Shopify integration and config.
- app/src/store/: In-memory or persistence layer (serviceRequestsStore.js).
- docs/: Specifications and workflows (app-spec.md, data-model.md, workflow.md).

## Development
- Run in app/: `npm install` then `npm run dev`.
- When adding routes, ensure they are mounted in app/src/server.js and follow existing route structure.
- Prefer small, well-named functions with minimal side effects.

## Code style and notes
- Use existing module style (CommonJS `require`/`module.exports`) unless the file already uses ES modules.
- Add short, targeted comments when logic is non-obvious, especially for first-time Shopify app flows.
- Keep comments instructional but concise; avoid repeating obvious code.

## Shopify integration notes
- Keep Shopify-specific code in app/src/shopify/.
- Avoid hard-coding shop credentials; use environment variables (do not read .env).
- If you need app proxy or App Bridge changes, document them in docs/app-spec.md.

## Status and data integrity
- Status milestone names should match app/src/models/statusMilestones.js and docs/workflow.md.
- Service numbers come from app/src/services/serviceNumber.js; reuse rather than reimplement.

## Tests
- No test scripts are defined yet. If adding tests, also add a script in app/package.json and document it here.
