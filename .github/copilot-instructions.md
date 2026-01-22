# FIC Cleaning Shopify App - AI Agent Instructions

## Architecture Overview
This is a Node.js Express backend for a Shopify app managing cleaning service requests with Domino's-style status tracking. The app uses an in-memory store (Map) for development; production will need a database.

**Key Components:**
- `src/server.js`: Main Express server mounting routes
- `src/routes/`: API endpoints (health, serviceRequests)
- `src/services/`: Business logic (service number generation)
- `src/models/`: Data structures (status milestones array)
- `src/store/`: Data persistence layer (currently in-memory Map)

**Data Flow:**
- POST `/api/service-requests` creates request with generated service number (format: `CS-YYYYMMDD-SHORTUUID`)
- GET `/api/service-requests/:serviceNumber` returns current status and all milestones
- Status progresses through fixed milestones: Request Submitted → Shipment In Transit → Received & Intake → Cleaning In Progress → Quality Review → Ready for Return → Completed

## Development Workflow
- `cd app && npm run dev` starts server on port 3000
- No build step; direct `node src/server.js` execution
- No tests or linting configured yet
- API testing: Use curl/Postman to `POST /api/service-requests` with `{"customer": {...}, "items": [...]}`

## Code Patterns
- Routes import from services/models/store: `const { createServiceNumber } = require('../services/serviceNumber')`
- Service numbers: `CS-${dateStamp}-${shortId}` where shortId is uppercase first segment of UUID
- Status milestones exported as array from `src/models/statusMilestones.js`
- Store uses Map with serviceNumber as key: `serviceRequests.set(serviceNumber, request)`

## Integration Points
- Shopify App Bridge integration planned but not implemented
- Customer authentication via Shopify accounts (future)
- Email/SMS notifications (future)
- Document upload/publishing (future)

## File Structure Conventions
- All source in `app/src/` with subdirs: routes/, services/, models/, store/
- Docs in `docs/` with separate files for spec, data model, workflow
- No frontend yet; backend-only starter

## Common Tasks
- Adding new status: Update `statusMilestones.js` array and redeploy
- New API endpoint: Create route in `src/routes/`, mount in `server.js`
- Business logic: Add to `src/services/`, import in routes
- Data changes: Modify store functions in `src/store/serviceRequestsStore.js`