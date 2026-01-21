# Shopify Cleaning Service App Specification

## Overview
The app provides a storefront request flow, customer tracking portal, and internal admin tools for managing cleaning services. It mirrors the Domino's Pizza Tracker experience by showing real-time status milestones to the customer while enabling service teams to control visibility and publish documents when ready.

## Roles
- **Customer**: Requests service, receives a service number, ships items with the number, tracks status, and downloads published documents.
- **Service Team**: Manages intake, updates status, uploads documents, and publishes artifacts.
- **Admin**: Configures statuses, email templates, and access roles.

## Core Features
1. **Service Request Intake**
   - Storefront form collects customer details, items to clean, shipping address, and preferences.
   - System assigns a unique service number (human-readable plus UUID).
   - Confirmation page + email includes service number and shipping instructions.

2. **Customer Tracking Portal**
   - Customer logs in using Shopify customer account or magic-link email.
   - Portal shows a Domino's-style tracker with milestone statuses.
   - Published documents and invoices appear in a documents tab.

3. **Admin Service Console**
   - Intake dashboard showing new requests and shipments.
   - Service record detail view with status timeline and internal notes.
   - Document manager for uploading, generating, and publishing files.

4. **Document Generation & Publishing**
   - Templates for inspection reports, invoices, and service summaries.
   - Draft documents are private until a service tech publishes them.
   - Publishing triggers a customer notification.

5. **Notifications**
   - Email notifications for request received, status changes, and documents published.
   - Optional SMS via third-party provider.

## Shopify Integration
- Embedded app using Shopify App Bridge.
- Customer portal served via app proxy or storefront app extension.
- Shopify customer authentication for portal access.

## Non-Functional Requirements
- Audit trail for status changes and document publishing.
- Role-based access for admin tools.
- Configurable status milestones and email templates.
