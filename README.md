# FIC Cleaning Shopify App

This repository contains the product and technical blueprint for a Shopify app that supports a cleaning-service workflow with Domino's-style status tracking, customer notifications, and internal service-team tools.

## Goals
- Collect service requests via a storefront form, assign a service number, and provide a customer tracking portal.
- Allow customers to ship items with the assigned service number for reference.
- Provide an internal admin panel for service teams to manage intake, service steps, documents, and publishable artifacts.
- Notify customers of status changes via email and make published documents available in their portal.

## Documentation
- [App specification](docs/app-spec.md)
- [Workflow and status tracker](docs/workflow.md)
- [Data model](docs/data-model.md)

## Next steps
- Build the Shopify app scaffold (e.g., with Shopify CLI) and map the data model to a database.
- Implement the customer portal UI and service-team admin UI.
- Integrate email notifications, document generation, and publish controls.

## App starter (local)
- `cd app`
- `npm install`
- `npm run dev`

## Starter API endpoints
- `GET /health` returns service health.
- `POST /api/service-requests` creates a service request and returns a service number.
- `GET /api/service-requests/:serviceNumber` fetches status milestones for the request.
- `GET /api/shopify/status` returns the Shopify scaffold status.
