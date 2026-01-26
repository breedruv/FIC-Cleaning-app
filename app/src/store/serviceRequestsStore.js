const { v4: uuidv4 } = require('uuid');

const { prisma } = require('./prismaClient');

const buildRelationCreate = (items, mapItem) => {
  if (!Array.isArray(items) || items.length === 0) {
    return undefined;
  }
  return { create: items.map(mapItem) };
};

const serializeCustomer = (customer) => {
  if (customer == null) {
    return null;
  }
  try {
    return JSON.stringify(customer);
  } catch (error) {
    return null;
  }
};

const parseCustomer = (customer) => {
  if (!customer) {
    return null;
  }
  try {
    return JSON.parse(customer);
  } catch (error) {
    return null;
  }
};

const hydrateRequest = (request) => {
  if (!request) {
    return null;
  }
  return {
    ...request,
    customer: parseCustomer(request.customer),
  };
};

const includeFullRequest = {
  items: true,
  statusEvents: true,
  documents: true,
  intakeSets: true,
  intakeInjectors: true,
  cleaningRounds: true,
  cleaningEntries: true,
  qualitySelections: true,
};

const createServiceRequest = async (serviceRequest) => {
  const createdAt = serviceRequest.createdAt
    ? new Date(serviceRequest.createdAt)
    : undefined;

  const data = {
    serviceNumber: serviceRequest.serviceNumber,
    status: serviceRequest.status,
    customer: serializeCustomer(serviceRequest.customer),
    createdAt,
    updatedAt: createdAt,
    items: buildRelationCreate(serviceRequest.items, (item) => ({
      id: item.id || uuidv4(),
      name: item.name || 'Item',
      quantity: item.quantity || 1,
      conditionNotes: item.conditionNotes || item.condition || null,
    })),
    statusEvents: buildRelationCreate(serviceRequest.statusEvents, (event) => ({
      id: event.id || uuidv4(),
      status: event.status,
      noteInternal: event.noteInternal || '',
      notePublic: event.notePublic || '',
      createdBy: event.createdBy || 'system',
      createdAt: event.createdAt ? new Date(event.createdAt) : undefined,
    })),
    documents: buildRelationCreate(serviceRequest.documents, (doc) => ({
      id: doc.id || uuidv4(),
      title: doc.title || 'Service document',
      type: doc.type || 'document',
      url: doc.url || '#',
      isPublished: Boolean(doc.isPublished),
      publishedAt: doc.isPublished ? new Date() : null,
    })),
  };

  const request = await prisma.serviceRequest.create({
    data,
    include: includeFullRequest,
  });
  return hydrateRequest(request);
};

const getServiceRequest = async (serviceNumber) => {
  const request = await prisma.serviceRequest.findUnique({
    where: { serviceNumber },
    include: includeFullRequest,
  });
  return hydrateRequest(request);
};

const listServiceRequests = async () => {
  const requests = await prisma.serviceRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
  return requests.map(hydrateRequest);
};

const updateServiceStatus = async (serviceNumber, update) => {
  const {
    status,
    noteInternal = '',
    notePublic = '',
    updatedBy = 'admin',
  } = update;

  try {
    const request = await prisma.serviceRequest.update({
      where: { serviceNumber },
      data: {
        status,
        statusEvents: {
          create: {
            id: uuidv4(),
            status,
            noteInternal,
            notePublic,
            createdBy: updatedBy,
          },
        },
      },
      include: includeFullRequest,
    });
    return hydrateRequest(request);
  } catch (error) {
    if (error.code === 'P2025') {
      return null;
    }
    throw error;
  }
};

const addDocument = async (serviceNumber, document) => {
  const documentId = uuidv4();

  try {
    const request = await prisma.serviceRequest.update({
      where: { serviceNumber },
      data: {
        documents: {
          create: {
            id: documentId,
            title: document.title || 'Service document',
            type: document.type || 'document',
            url: document.url || '#',
            setNumber:
              typeof document.setNumber === 'number' ? document.setNumber : null,
            injectorNumber:
              typeof document.injectorNumber === 'number'
                ? document.injectorNumber
                : null,
            isPublished: Boolean(document.isPublished),
            publishedAt: document.isPublished ? new Date() : null,
          },
        },
      },
      include: { documents: true, intakeInjectors: true },
    });

    return request.documents.find((doc) => doc.id === documentId);
  } catch (error) {
    if (error.code === 'P2025') {
      return null;
    }
    throw error;
  }
};

const upsertIntakeInjector = async (tx, serviceRequestId, entry) => {
  const { setNumber, injectorNumber, serialNumber } = entry;
  const trimmed = serialNumber ? serialNumber.trim() : '';

  if (!trimmed) {
    await tx.serviceIntakeInjector.deleteMany({
      where: {
        serviceRequestId,
        setNumber,
        injectorNumber,
      },
    });
    return;
  }

  await tx.serviceIntakeInjector.upsert({
    where: {
      serviceRequestId_setNumber_injectorNumber: {
        serviceRequestId,
        setNumber,
        injectorNumber,
      },
    },
    update: { serialNumber: trimmed },
    create: {
      id: uuidv4(),
      serviceRequestId,
      setNumber,
      injectorNumber,
      serialNumber: trimmed,
    },
  });
};

const updateIntakeMatrix = async (serviceNumber, intake) => {
  const { setCount, perSetCounts, perSetNames, serials } = intake;

  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { serviceNumber },
      select: { id: true },
    });

    if (!request) {
      return null;
    }

    await tx.serviceRequest.update({
      where: { serviceNumber },
      data: {
        intakeSetCount: setCount,
      },
    });

    const existingSets = await tx.serviceIntakeSet.findMany({
      where: { serviceRequestId: request.id },
      select: { setNumber: true },
    });

    const existingSetNumbers = new Set(existingSets.map((s) => s.setNumber));

    for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
      const injectorCount = perSetCounts[setNumber - 1];
      const name =
        Array.isArray(perSetNames) && perSetNames[setNumber - 1]
          ? String(perSetNames[setNumber - 1]).trim()
          : null;
      await tx.serviceIntakeSet.upsert({
        where: {
          serviceRequestId_setNumber: {
            serviceRequestId: request.id,
            setNumber,
          },
        },
        update: { injectorCount, name },
        create: {
          id: uuidv4(),
          serviceRequestId: request.id,
          setNumber,
          injectorCount,
          name,
        },
      });
      existingSetNumbers.delete(setNumber);
    }

    if (existingSetNumbers.size > 0) {
      await tx.serviceIntakeSet.deleteMany({
        where: {
          serviceRequestId: request.id,
          setNumber: { in: Array.from(existingSetNumbers) },
        },
      });
    }

    await tx.serviceIntakeInjector.deleteMany({
      where: {
        serviceRequestId: request.id,
        OR: [
          { setNumber: { gt: setCount } },
        ],
      },
    });

    for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
      const injectorCount = perSetCounts[setNumber - 1];
      await tx.serviceIntakeInjector.deleteMany({
        where: {
          serviceRequestId: request.id,
          setNumber,
          injectorNumber: { gt: injectorCount },
        },
      });
    }

    if (Array.isArray(serials)) {
      for (const entry of serials) {
        await upsertIntakeInjector(tx, request.id, entry);
      }
    }

    const updated = await tx.serviceRequest.findUnique({
      where: { serviceNumber },
      include: includeFullRequest,
    });

    return hydrateRequest(updated);
  });
};

const upsertCleaningRound = async (tx, serviceRequestId, round) => {
  return tx.serviceCleaningRound.upsert({
    where: {
      serviceRequestId_setNumber_roundIndex: {
        serviceRequestId,
        setNumber: round.setNumber,
        roundIndex: round.roundIndex,
      },
    },
    update: {
      label: round.label,
    },
    create: {
      id: uuidv4(),
      serviceRequestId,
      setNumber: round.setNumber,
      roundIndex: round.roundIndex,
      label: round.label,
    },
  });
};

const upsertCleaningEntry = async (tx, serviceRequestId, entry) => {
  const { setNumber, roundIndex, injectorNumber } = entry;
  const flowValue = entry.flowValue ? String(entry.flowValue).trim() : '';
  const deadTime = entry.deadTime ? String(entry.deadTime).trim() : '';
  const note = entry.note ? String(entry.note).trim() : '';

  if (!flowValue && !deadTime && !note) {
    await tx.serviceCleaningEntry.deleteMany({
      where: {
        serviceRequestId,
        setNumber,
        roundIndex,
        injectorNumber,
      },
    });
    return;
  }

  await tx.serviceCleaningEntry.upsert({
    where: {
      serviceRequestId_setNumber_roundIndex_injectorNumber: {
        serviceRequestId,
        setNumber,
        roundIndex,
        injectorNumber,
      },
    },
    update: { flowValue, deadTime, note },
    create: {
      id: uuidv4(),
      serviceRequestId,
      setNumber,
      roundIndex,
      injectorNumber,
      flowValue,
      deadTime,
      note,
    },
  });
};

const updateCleaningRound = async (serviceNumber, payload) => {
  const { setNumber, roundIndex, label, entries, updatedBy } = payload;

  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { serviceNumber },
      select: { id: true },
    });

    if (!request) {
      return null;
    }

    await upsertCleaningRound(tx, request.id, {
      setNumber,
      roundIndex,
      label,
    });

    if (Array.isArray(entries)) {
      for (const entry of entries) {
        await upsertCleaningEntry(tx, request.id, entry);
      }
    }

    await tx.serviceRequest.update({
      where: { serviceNumber },
      data: {
        status: 'Cleaning In Progress',
        statusEvents: {
          create: {
            id: uuidv4(),
            status: 'Cleaning In Progress',
            noteInternal: label ? `Saved ${label}.` : 'Saved cleaning results.',
            notePublic: 'Cleaning in progress.',
            createdBy: updatedBy || 'admin',
          },
        },
      },
    });

    const updated = await tx.serviceRequest.findUnique({
      where: { serviceNumber },
      include: includeFullRequest,
    });

    return hydrateRequest(updated);
  });
};

const updateQualitySelections = async (serviceNumber, payload) => {
  const { setNumber, selections } = payload;

  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { serviceNumber },
      select: { id: true },
    });

    if (!request) {
      return null;
    }

    await tx.serviceQualitySelection.deleteMany({
      where: {
        serviceRequestId: request.id,
        setNumber,
      },
    });

    if (Array.isArray(selections) && selections.length > 0) {
      await tx.serviceQualitySelection.createMany({
        data: selections.map((selection) => ({
          serviceRequestId: request.id,
          setNumber,
          injectorNumber: selection.injectorNumber,
          roundIndex: selection.roundIndex,
        })),
      });
    }

    const updated = await tx.serviceRequest.findUnique({
      where: { serviceNumber },
      include: includeFullRequest,
    });

    return hydrateRequest(updated);
  });
};

module.exports = {
  createServiceRequest,
  getServiceRequest,
  listServiceRequests,
  updateServiceStatus,
  addDocument,
  updateIntakeMatrix,
  updateCleaningRound,
  updateQualitySelections,
};
