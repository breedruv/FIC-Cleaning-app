const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const serviceRequests = new Map();

const statusMilestones = [
  'Request Submitted',
  'Shipment In Transit',
  'Received & Intake',
  'Cleaning In Progress',
  'Quality Review',
  'Ready for Return',
  'Completed',
];

const createServiceNumber = () => {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const shortId = uuidv4().split('-')[0].toUpperCase();
  return `CS-${dateStamp}-${shortId}`;
};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/service-requests', (req, res) => {
  const serviceNumber = createServiceNumber();
  const request = {
    id: uuidv4(),
    serviceNumber,
    status: statusMilestones[0],
    customer: req.body.customer || {},
    items: req.body.items || [],
    createdAt: new Date().toISOString(),
  };

  serviceRequests.set(serviceNumber, request);

  res.status(201).json({
    serviceNumber,
    message: 'Service request created. Share this number with the customer.',
  });
});

app.get('/api/service-requests/:serviceNumber', (req, res) => {
  const request = serviceRequests.get(req.params.serviceNumber);

  if (!request) {
    return res.status(404).json({ message: 'Service request not found.' });
  }

  res.json({
    serviceNumber: request.serviceNumber,
    status: request.status,
    milestones: statusMilestones,
  });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`FIC Cleaning Shopify app server listening on ${port}`);
});
