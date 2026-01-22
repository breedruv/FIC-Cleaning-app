# Data Model

## ServiceRequest
- id (UUID)
- service_number (string, human-friendly)
- customer_id (Shopify customer ID)
- status (enum)
- requested_at (timestamp)
- shipping_address (JSON)
- intake_notes (text)

## ServiceItem
- id (UUID)
- service_request_id (FK)
- name (string)
- quantity (int)
- condition_notes (text)

## ServiceStatusEvent
- id (UUID)
- service_request_id (FK)
- status (enum)
- note_internal (text)
- note_public (text)
- created_by (user)
- created_at (timestamp)

## ServiceDocument
- id (UUID)
- service_request_id (FK)
- type (enum: inspection_report, invoice, summary)
- file_url (string)
- is_published (boolean)
- published_at (timestamp)
- created_by (user)

## NotificationLog
- id (UUID)
- service_request_id (FK)
- channel (enum: email, sms)
- template (string)
- sent_at (timestamp)
- status (enum: queued, sent, failed)

## AdminUser
- id (UUID)
- shopify_user_id (string)
- role (enum: admin, technician, support)
