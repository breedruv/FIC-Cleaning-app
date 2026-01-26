const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { createServiceNumber } = require('../services/serviceNumber');
const { statusMilestones } = require('../models/statusMilestones');
const { createServiceRequest, getServiceRequest } = require('../store/serviceRequestsStore');

const router = express.Router();

router.post('/', async (req, res) => {
  const serviceNumber = createServiceNumber();
  const createdAt = new Date().toISOString();
  const request = {
    id: uuidv4(),
    serviceNumber,
    status: statusMilestones[0],
    customer: req.body.customer || {},
    items: req.body.items || [],
    createdAt,
    updatedAt: createdAt,
    statusEvents: [
      {
        id: uuidv4(),
        status: statusMilestones[0],
        noteInternal: '',
        notePublic: 'Request submitted.',
        createdBy: 'system',
        createdAt,
      },
    ],
    documents: [],
  };

  try {
    await createServiceRequest(request);

    res.status(201).json({
      serviceNumber,
      message: 'Service request created. Share this number with the customer.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create service request.' });
  }
});

router.get('/:serviceNumber', async (req, res) => {
  try {
    const request = await getServiceRequest(req.params.serviceNumber);

    if (!request) {
      return res.status(404).json({ message: 'Service request not found.' });
    }

    res.json({
      serviceNumber: request.serviceNumber,
      status: request.status,
      milestones: statusMilestones,
      createdAt: request.createdAt,
      items: request.items,
      documents: (request.documents || []).filter((doc) => doc.isPublished),
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load service request.' });
  }
});

module.exports = router;
