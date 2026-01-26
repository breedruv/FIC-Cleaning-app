const express = require('express');

const { statusMilestones } = require('../models/statusMilestones');
const {
  listServiceRequests,
  getServiceRequest,
  updateServiceStatus,
  addDocument,
  updateIntakeMatrix,
  updateCleaningRound,
  updateQualitySelections,
} = require('../store/serviceRequestsStore');

const router = express.Router();

// Admin list view (lightweight summary for tables).
router.get('/service-requests', async (req, res) => {
  try {
    const requests = (await listServiceRequests()).map((request) => ({
      serviceNumber: request.serviceNumber,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      customerName: request.customer?.name || 'Customer',
      itemCount: Array.isArray(request.items) ? request.items.length : 0,
    }));

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load service requests.' });
  }
});

// Admin detail view (full request record).
router.get('/service-requests/:serviceNumber', async (req, res) => {
  try {
    const request = await getServiceRequest(req.params.serviceNumber);

    if (!request) {
      return res.status(404).json({ message: 'Service request not found.' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load service request.' });
  }
});

// Update status and capture internal/public notes.
router.patch('/service-requests/:serviceNumber/status', async (req, res) => {
  const { status, noteInternal, notePublic, updatedBy } = req.body || {};

  if (!status) {
    return res.status(400).json({ message: 'Status is required.' });
  }

  if (!statusMilestones.includes(status)) {
    return res.status(400).json({ message: 'Status is not a valid milestone.' });
  }

  try {
    const request = await updateServiceStatus(req.params.serviceNumber, {
      status,
      noteInternal,
      notePublic,
      updatedBy,
    });

    if (!request) {
      return res.status(404).json({ message: 'Service request not found.' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update status.' });
  }
});

// Add a document entry (URL can be a placeholder for now).
router.post('/service-requests/:serviceNumber/documents', async (req, res) => {
  try {
    const document = await addDocument(req.params.serviceNumber, req.body || {});

    if (!document) {
      return res.status(404).json({ message: 'Service request not found.' });
    }

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: 'Unable to add document.' });
  }
});

// Update intake sets/injectors + serial numbers.
router.put('/service-requests/:serviceNumber/intake', async (req, res) => {
  const { setCount, perSetCounts, perSetNames, serials } = req.body || {};

  const parsedSetCount = Number(setCount);

  if (!Number.isInteger(parsedSetCount) || parsedSetCount < 1) {
    return res.status(400).json({ message: 'setCount must be a positive integer.' });
  }

  if (!Array.isArray(perSetCounts) || perSetCounts.length !== parsedSetCount) {
    return res.status(400).json({
      message: 'perSetCounts must be an array with one entry per set.',
    });
  }

  if (
    perSetNames != null &&
    (!Array.isArray(perSetNames) || perSetNames.length !== parsedSetCount)
  ) {
    return res.status(400).json({
      message: 'perSetNames must be an array with one entry per set.',
    });
  }

  const parsedCounts = perSetCounts.map((value) => Number(value));
  const invalidCount = parsedCounts.some(
    (value) => !Number.isInteger(value) || value < 1,
  );

  if (invalidCount) {
    return res.status(400).json({
      message: 'Each perSetCounts value must be a positive integer.',
    });
  }

  try {
    const request = await updateIntakeMatrix(req.params.serviceNumber, {
      setCount: parsedSetCount,
      perSetCounts: parsedCounts,
      perSetNames,
      serials,
    });

    if (!request) {
      return res.status(404).json({ message: 'Service request not found.' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update intake details.' });
  }
});

// Save cleaning round results (initial flow or cleaning passes).
router.put('/service-requests/:serviceNumber/cleaning-round', async (req, res) => {
  const { setNumber, roundIndex, label, entries, updatedBy } = req.body || {};

  const parsedSetNumber = Number(setNumber);
  const parsedRoundIndex = Number(roundIndex);

  if (!Number.isInteger(parsedSetNumber) || parsedSetNumber < 1) {
    return res.status(400).json({ message: 'setNumber must be a positive integer.' });
  }

  if (!Number.isInteger(parsedRoundIndex) || parsedRoundIndex < 0) {
    return res.status(400).json({ message: 'roundIndex must be 0 or greater.' });
  }

  if (!label || typeof label !== 'string') {
    return res.status(400).json({ message: 'label is required.' });
  }

  try {
    const request = await updateCleaningRound(req.params.serviceNumber, {
      setNumber: parsedSetNumber,
      roundIndex: parsedRoundIndex,
      label,
      entries,
      updatedBy,
    });

    if (!request) {
      return res.status(404).json({ message: 'Service request not found.' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Unable to save cleaning results.' });
  }
});

// Save per-injector selection for the "last cleaning flow" chart.
router.put('/service-requests/:serviceNumber/quality-selection', async (req, res) => {
  const { setNumber, selections } = req.body || {};

  const parsedSetNumber = Number(setNumber);

  if (!Number.isInteger(parsedSetNumber) || parsedSetNumber < 1) {
    return res.status(400).json({ message: 'setNumber must be a positive integer.' });
  }

  if (!Array.isArray(selections)) {
    return res.status(400).json({ message: 'selections must be an array.' });
  }

  const invalid = selections.some(
    (selection) =>
      !Number.isInteger(Number(selection.injectorNumber)) ||
      Number(selection.injectorNumber) < 1 ||
      !Number.isInteger(Number(selection.roundIndex)) ||
      Number(selection.roundIndex) < 1,
  );

  if (invalid) {
    return res.status(400).json({
      message: 'Each selection must include injectorNumber and roundIndex (>= 1).',
    });
  }

  try {
    const request = await updateQualitySelections(req.params.serviceNumber, {
      setNumber: parsedSetNumber,
      selections: selections.map((selection) => ({
        injectorNumber: Number(selection.injectorNumber),
        roundIndex: Number(selection.roundIndex),
      })),
    });

    if (!request) {
      return res.status(404).json({ message: 'Service request not found.' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Unable to save quality selections.' });
  }
});

// Provide the configured milestones so the UI stays in sync.
router.get('/status-milestones', (req, res) => {
  res.json({ milestones: statusMilestones });
});

module.exports = router;
