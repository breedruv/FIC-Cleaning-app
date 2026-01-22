const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { createServiceNumber } = require('../services/serviceNumber');
const { statusMilestones } = require('../models/statusMilestones');
const { createServiceRequest, getServiceRequest } = require('../store/serviceRequestsStore');

const router = express.Router();

router.post('/', (req, res) => {
  const serviceNumber = createServiceNumber();
  const request = {
    id: uuidv4(),
    serviceNumber,
    status: statusMilestones[0],
    customer: req.body.customer || {},
    items: req.body.items || [],
    createdAt: new Date().toISOString(),
  };

  createServiceRequest(request);

  res.status(201).json({
    serviceNumber,
    message: 'Service request created. Share this number with the customer.',
  });
});

router.get('/:serviceNumber', (req, res) => {
  const request = getServiceRequest(req.params.serviceNumber);

  if (!request) {
    return res.status(404).json({ message: 'Service request not found.' });
  }

  res.json({
    serviceNumber: request.serviceNumber,
    status: request.status,
    milestones: statusMilestones,
  });
});

module.exports = router;
