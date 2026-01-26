/*
  Admin portal UI logic.
  Notes:
  - Uses the Prisma-backed API via /api/admin endpoints.
  - Data persists in SQLite unless the database is reset.
*/

const API_BASE = '/api/admin';
const INTAKE_STATUS = 'Checked in';
const LEGACY_INTAKE_STATUS = 'Received & Intake';

const elements = {
  list: document.getElementById('requests-list'),
  listEmpty: document.getElementById('list-empty'),
  detailEmpty: document.getElementById('detail-empty'),
  detailView: document.getElementById('detail-view'),
  searchInput: document.getElementById('search-input'),
  refreshButton: document.getElementById('refresh-button'),
  seedButton: document.getElementById('seed-button'),
};

const state = {
  requests: [],
  milestones: [],
  selectedServiceNumber: null,
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || '--';
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'Request failed');
    error.payload = payload;
    throw error;
  }
  return payload;
};

const loadMilestones = async () => {
  const payload = await fetchJson(`${API_BASE}/status-milestones`);
  state.milestones = payload.milestones || [];
};

const loadRequests = async () => {
  const payload = await fetchJson(`${API_BASE}/service-requests`);
  state.requests = payload.requests || [];
  renderList();
};

const loadDetail = async (serviceNumber) => {
  const request = await fetchJson(
    `${API_BASE}/service-requests/${encodeURIComponent(serviceNumber)}`,
  );
  state.selectedServiceNumber = request.serviceNumber;
  renderDetail(request);
  renderList();
};

const renderList = () => {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const filtered = state.requests.filter((request) =>
    request.serviceNumber.toLowerCase().includes(searchTerm),
  );

  elements.list.innerHTML = '';
  if (filtered.length === 0) {
    elements.listEmpty.classList.remove('hidden');
    return;
  }

  elements.listEmpty.classList.add('hidden');
  filtered.forEach((request) => {
    const item = document.createElement('li');
    item.className = 'request-card';
    if (request.serviceNumber === state.selectedServiceNumber) {
      item.classList.add('active');
    }
    item.innerHTML = `
      <h3>${request.serviceNumber}</h3>
      <p>${request.customerName} - ${request.itemCount} items</p>
      <span class="badge">${request.status}</span>
      <p>Opened ${formatDate(request.createdAt)}</p>
    `;
    item.addEventListener('click', () => loadDetail(request.serviceNumber));
    elements.list.appendChild(item);
  });
};

const buildSerialKey = (setNumber, injectorNumber) =>
  `${setNumber}-${injectorNumber}`;

const buildSerialMap = (injectors) => {
  const map = new Map();
  if (!Array.isArray(injectors)) {
    return map;
  }
  injectors.forEach((entry) => {
    map.set(
      buildSerialKey(entry.setNumber, entry.injectorNumber),
      entry.serialNumber || '',
    );
  });
  return map;
};

const buildSetCountMap = (intakeSets) => {
  const map = new Map();
  if (!Array.isArray(intakeSets)) {
    return map;
  }
  intakeSets.forEach((set) => {
    map.set(set.setNumber, set.injectorCount);
  });
  return map;
};

const buildSetNameMap = (intakeSets) => {
  const map = new Map();
  if (!Array.isArray(intakeSets)) {
    return map;
  }
  intakeSets.forEach((set) => {
    if (set.name) {
      map.set(set.setNumber, set.name);
    }
  });
  return map;
};

const buildPerSetCounts = (setCount, intakeSets) => {
  const setMap = buildSetCountMap(intakeSets);
  const counts = [];
  for (let i = 1; i <= setCount; i += 1) {
    counts.push(setMap.get(i) || 1);
  }
  return counts;
};

const buildPerSetNames = (setCount, intakeSets) => {
  const nameMap = buildSetNameMap(intakeSets);
  const names = [];
  for (let i = 1; i <= setCount; i += 1) {
    const name = nameMap.get(i);
    names.push(name || `Set ${i}`);
  }
  return names;
};

const buildCleaningRoundsBySet = (rounds) => {
  const map = new Map();
  if (!Array.isArray(rounds)) {
    return map;
  }
  rounds.forEach((round) => {
    if (!map.has(round.setNumber)) {
      map.set(round.setNumber, []);
    }
    map.get(round.setNumber).push(round);
  });
  map.forEach((list) => {
    list.sort((a, b) => a.roundIndex - b.roundIndex);
  });
  return map;
};

const buildCleaningEntryMap = (entries) => {
  const map = new Map();
  if (!Array.isArray(entries)) {
    return map;
  }
  entries.forEach((entry) => {
    map.set(
      `${entry.setNumber}-${entry.roundIndex}-${entry.injectorNumber}`,
      entry,
    );
  });
  return map;
};

const renderDetail = (request) => {
  elements.detailEmpty.classList.add('hidden');
  elements.detailView.classList.remove('hidden');

  const statusEvents = Array.isArray(request.statusEvents)
    ? [...request.statusEvents].reverse()
    : [];
  const items = Array.isArray(request.items) ? request.items : [];
  const intakeInjectors = Array.isArray(request.intakeInjectors)
    ? request.intakeInjectors
    : [];
  const intakeSets = Array.isArray(request.intakeSets) ? request.intakeSets : [];
  const documents = Array.isArray(request.documents) ? request.documents : [];
  const cleaningRounds = Array.isArray(request.cleaningRounds)
    ? request.cleaningRounds
    : [];
  const cleaningEntries = Array.isArray(request.cleaningEntries)
    ? request.cleaningEntries
    : [];
  const qualitySelections = Array.isArray(request.qualitySelections)
    ? request.qualitySelections
    : [];

  const initialSetCount = Number(request.intakeSetCount || 1);
  const initialPerSetCounts = buildPerSetCounts(initialSetCount, intakeSets);
  const initialSetNames = buildPerSetNames(initialSetCount, intakeSets);
  const statusOptions = state.milestones.includes(request.status)
    ? state.milestones
    : [...state.milestones, request.status].filter(Boolean);
  const cleaningRoundsBySet = buildCleaningRoundsBySet(cleaningRounds);
  const cleaningEntryMap = buildCleaningEntryMap(cleaningEntries);
  const documentMap = new Map();
  documents.forEach((doc) => {
    const key = `${doc.type}-${doc.setNumber || 0}-${doc.injectorNumber || 0}`;
    if (!documentMap.has(key)) {
      documentMap.set(key, doc);
      return;
    }
    const existing = documentMap.get(key);
    const existingDate = existing?.createdAt ? new Date(existing.createdAt) : null;
    const currentDate = doc?.createdAt ? new Date(doc.createdAt) : null;
    if (currentDate && (!existingDate || currentDate > existingDate)) {
      documentMap.set(key, doc);
    }
  });
  const qualitySelectionMap = new Map();
  qualitySelections.forEach((selection) => {
    qualitySelectionMap.set(
      `${selection.setNumber}-${selection.injectorNumber}`,
      selection.roundIndex,
    );
  });

  elements.detailView.innerHTML = `
    <div class="detail__header">
      <div>
        <h2>${request.serviceNumber}</h2>
        <div class="detail__meta">
          <span class="pill">Status: ${request.status}</span>
          <span class="pill">Opened: ${formatDate(request.createdAt)}</span>
          <span class="pill">Updated: ${formatDate(request.updatedAt)}</span>
        </div>
      </div>
      <div class="pill">Customer: ${request.customer?.name || 'Customer'}</div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab-button" data-tab="overview" type="button">Overview</button>
      <button class="tab-button" data-tab="check-in" type="button">Check in</button>
      <button class="tab-button" data-tab="cleaning" type="button">Cleaning</button>
      <button class="tab-button" data-tab="quality" type="button">Quality Review</button>
    </div>

    <section class="section tab-panel" data-tab-panel="overview">
      <h3>Items</h3>
      <p>${items.length === 0 ? 'No items listed yet.' : ''}</p>
      <ul class="timeline">
        ${items
          .map(
            (item) => `
            <li>
              <strong>${item.name || 'Item'}</strong>
              <span>Qty: ${item.quantity || 1}</span>
              <div>${item.condition || item.conditionNotes || ''}</div>
            </li>
          `,
          )
          .join('')}
      </ul>
    </section>

    <section class="section tab-panel" data-tab-panel="overview">
      <h3>Status timeline</h3>
      <ul class="timeline">
        ${
          statusEvents.length === 0
            ? '<li>No updates yet.</li>'
            : statusEvents
                .map(
                  (event) => `
                  <li>
                    <strong>${event.status}</strong>
                    <span>${formatDate(event.createdAt)} - ${event.createdBy}</span>
                    <div>Public note: ${event.notePublic || '--'}</div>
                    <div>Internal note: ${event.noteInternal || '--'}</div>
                  </li>
                `,
                )
                .join('')
        }
      </ul>
    </section>

    <section class="section tab-panel" data-tab-panel="overview">
      <h3>Update status</h3>
      <form id="status-form" class="form-grid">
        <label>
          New status
          <select id="status-select" required>
            ${statusOptions
              .map(
                (milestone) => `
                  <option value="${milestone}" ${
                    milestone === request.status ? 'selected' : ''
                  }>${milestone}</option>
                `,
              )
              .join('')}
          </select>
        </label>
        <label>
          Public note (customers can see this)
          <textarea id="status-public" placeholder="Short update for the customer"></textarea>
        </label>
        <label>
          Internal note (team only)
          <textarea id="status-internal" placeholder="Internal-only details"></textarea>
        </label>
        <label>
          Updated by
          <input id="status-by" type="text" placeholder="Your name or role" />
        </label>
        <button class="btn" type="submit">Save status update</button>
      </form>
    </section>

    <section class="section tab-panel" data-tab-panel="check-in">
      <h3>Intake sets and injectors</h3>
      <p class="section__note">
        Set the number of sets and injector counts. Add serial numbers and upload photos per injector.
      </p>
      <form id="intake-form" class="form-grid">
        <label>
          Number of sets
          <input id="intake-set-count" type="number" min="1" value="${initialSetCount}" />
        </label>
        <div id="intake-set-fields" class="intake-set-fields"></div>
      </form>
      <div class="table-wrapper">
        <div id="intake-table"></div>
      </div>
      <button id="intake-save-table" class="btn" type="button">Save intake table</button>
      <p id="intake-table-error" class="form-note hidden"></p>
      <p id="intake-error" class="form-note hidden"></p>
    </section>

    <section class="section tab-panel" data-tab-panel="cleaning">
      <h3>Cleaning</h3>
      <p class="section__note">
        Select a set, then capture flow results and notes per injector.
      </p>
      <div class="cleaning-header">
        <div>
          <p class="section__note">Set number</p>
          <div id="cleaning-set-buttons" class="round-buttons"></div>
        </div>
        <label>
          Updated by
          <input id="cleaning-by" type="text" placeholder="Your name or role" />
        </label>
      </div>
      <div class="cleaning-rounds">
        <div id="cleaning-round-buttons" class="round-buttons"></div>
        <button id="cleaning-add-round" class="btn btn--ghost" type="button">
          Add cleaning round
        </button>
      </div>
      <div class="table-wrapper">
        <div id="cleaning-table"></div>
      </div>
      <button id="cleaning-save" class="btn" type="button">Save cleaning results</button>
      <p id="cleaning-error" class="form-note hidden"></p>
    </section>

    <section class="section tab-panel" data-tab-panel="quality">
      <h3>Quality review</h3>
      <p class="section__note">
        Use this tab for inspection and QA notes.
      </p>
      <div class="quality-header">
        <div>
          <p class="section__note">Set number</p>
          <div id="quality-set-buttons" class="round-buttons"></div>
        </div>
      </div>
      <div class="quality-summary">
        <div class="quality-card">
          <h4>Injector Flow before Cleaning</h4>
          <div class="chart-row">
            <canvas id="initial-flow-chart" width="500" height="220"></canvas>
          </div>
          <div id="initial-flow-average" class="chart-average">Average: --</div>
          <div id="initial-flow-metric" class="chart-metric">Matching on Initial flow test: --</div>
        </div>
        <div class="quality-card">
          <h4>Injector Flow after Cleaning</h4>
          <div class="chart-row">
            <canvas id="last-flow-chart" width="500" height="220"></canvas>
          </div>
          <div id="last-flow-average" class="chart-average">Average: --</div>
          <div id="last-flow-metric" class="chart-metric">Matching on after Cleaning: --</div>
        </div>
      </div>
      <div class="quality-selection">
        <h4>Flow Results</h4>
        <div id="quality-selection-list"></div>
        <button id="quality-selection-save" class="btn" type="button">Save Cleaning Results</button>
        <p id="quality-selection-error" class="form-note hidden"></p>
      </div>
      <div class="quality-list">
        <h4>Cleaning rounds</h4>
        <div id="quality-round-list"></div>
      </div>
    </section>

    <div id="camera-modal" class="camera-modal hidden" role="dialog" aria-modal="true">
      <div class="camera-modal__backdrop" data-camera-close></div>
      <div class="camera-modal__card">
        <div class="camera-modal__header">
          <h3>Take photo</h3>
          <button class="btn btn--ghost" type="button" data-camera-close>Close</button>
        </div>
        <div class="camera-modal__body">
          <video id="camera-video" autoplay playsinline></video>
          <p id="camera-error" class="form-note hidden"></p>
        </div>
        <div class="camera-modal__footer">
          <button id="camera-capture" class="btn" type="button">Capture & Save</button>
          <button id="camera-cancel" class="btn btn--ghost" type="button">Cancel</button>
        </div>
      </div>
    </div>
  `;

  const statusForm = document.getElementById('status-form');
  const statusSelect = document.getElementById('status-select');
  const intakeError = document.getElementById('intake-error');
  const intakeSetInput = document.getElementById('intake-set-count');
  const intakeSetFields = document.getElementById('intake-set-fields');
  const intakeTable = document.getElementById('intake-table');
  const intakeSaveTable = document.getElementById('intake-save-table');
  const intakeTableError = document.getElementById('intake-table-error');
  const cleaningSetButtons = document.getElementById('cleaning-set-buttons');
  const cleaningRoundButtons = document.getElementById('cleaning-round-buttons');
  const cleaningAddRound = document.getElementById('cleaning-add-round');
  const cleaningTable = document.getElementById('cleaning-table');
  const cleaningSave = document.getElementById('cleaning-save');
  const cleaningError = document.getElementById('cleaning-error');
  const cleaningByInput = document.getElementById('cleaning-by');
  const qualitySetButtons = document.getElementById('quality-set-buttons');
  const qualityRoundList = document.getElementById('quality-round-list');
  const initialFlowChart = document.getElementById('initial-flow-chart');
  const lastFlowChart = document.getElementById('last-flow-chart');
  const initialFlowMetric = document.getElementById('initial-flow-metric');
  const lastFlowMetric = document.getElementById('last-flow-metric');
  const initialFlowAverage = document.getElementById('initial-flow-average');
  const lastFlowAverage = document.getElementById('last-flow-average');
  const qualitySelectionList = document.getElementById('quality-selection-list');
  const qualitySelectionSave = document.getElementById('quality-selection-save');
  const qualitySelectionError = document.getElementById('quality-selection-error');
  const cameraModal = document.getElementById('camera-modal');
  const cameraVideo = document.getElementById('camera-video');
  const cameraCaptureButton = document.getElementById('camera-capture');
  const cameraCancelButton = document.getElementById('camera-cancel');
  const cameraError = document.getElementById('camera-error');
  let intakeSerialMap = buildSerialMap(intakeInjectors);
  let intakePerSetCounts = [...initialPerSetCounts];
  let intakeSetNames = [...initialSetNames];
  const cleaningRoundsState = new Map();
  cleaningRoundsBySet.forEach((rounds, setNumber) => {
    cleaningRoundsState.set(setNumber, [...rounds]);
  });
  let activeCleaningSet = 1;
  let activeCleaningRoundIndex = 0;
  let activeQualitySet = 1;
  let cameraStream = null;
  let cameraContext = null;

  const getDefaultTab = (status) => {
    if (status === INTAKE_STATUS || status === LEGACY_INTAKE_STATUS) {
      return 'check-in';
    }
    if (typeof status === 'string' && status.includes('Cleaning')) {
      return 'cleaning';
    }
    if (typeof status === 'string' && status.includes('Quality')) {
      return 'quality';
    }
    return 'overview';
  };

  const tabButtons = Array.from(
    elements.detailView.querySelectorAll('[data-tab]'),
  );
  const tabPanels = Array.from(
    elements.detailView.querySelectorAll('[data-tab-panel]'),
  );

  const setActiveTab = (tabId) => {
    tabButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tabId);
    });
    tabPanels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.tabPanel !== tabId);
    });
    if (tabId === 'quality') {
      requestAnimationFrame(() => {
        renderQualitySummary();
      });
    }
  };

  const showIntakeError = (message) => {
    if (!message) {
      intakeError.textContent = '';
      intakeError.classList.add('hidden');
      return;
    }
    intakeError.textContent = message;
    intakeError.classList.remove('hidden');
  };

  const showIntakeTableError = (message) => {
    if (!message) {
      intakeTableError.textContent = '';
      intakeTableError.classList.add('hidden');
      return;
    }
    intakeTableError.textContent = message;
    intakeTableError.classList.remove('hidden');
  };

  const showCleaningError = (message) => {
    if (!message) {
      cleaningError.textContent = '';
      cleaningError.classList.add('hidden');
      return;
    }
    cleaningError.textContent = message;
    cleaningError.classList.remove('hidden');
  };

  const showQualitySelectionError = (message) => {
    if (!message) {
      qualitySelectionError.textContent = '';
      qualitySelectionError.classList.add('hidden');
      return;
    }
    qualitySelectionError.textContent = message;
    qualitySelectionError.classList.remove('hidden');
  };

  const readImageAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Please choose an image file.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Unable to read image.'));
      reader.readAsDataURL(file);
    });

  const uploadPhoto = async ({ setNumber, injectorNumber, photoType, dataUrl }) => {
    const injectorLabel =
      typeof injectorNumber === 'number' ? `, Injector ${injectorNumber}` : '';
    const title =
      photoType === 'set_intake_photo'
        ? `Set ${setNumber} intake photo`
        : photoType === 'injector_filter_photo'
        ? `Filter photo - Set ${setNumber}${injectorLabel}`
        : `Intake photo - Set ${setNumber}${injectorLabel}`;

    await fetchJson(
      `${API_BASE}/service-requests/${encodeURIComponent(
        request.serviceNumber,
      )}/documents`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type: photoType,
          url: dataUrl,
          setNumber,
          injectorNumber,
          isPublished: false,
        }),
      },
    );
  };

  const parsePositiveInt = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return null;
    }
    return parsed;
  };

  const captureSerialMapFromTable = () => {
    const map = new Map(intakeSerialMap);
    intakeTable
      .querySelectorAll('input[data-serial-input]')
      .forEach((input) => {
        const setNumber = Number(input.dataset.set);
        const injectorNumber = Number(input.dataset.injector);
        const key = buildSerialKey(setNumber, injectorNumber);
        map.set(key, input.value);
      });
    return map;
  };

  const renderIntakeTable = (setCount, perSetCounts) => {
    let tables = '';
    for (let set = 1; set <= setCount; set += 1) {
      const injectorCount = perSetCounts[set - 1] || 1;
      const setName = intakeSetNames[set - 1] || `Set ${set}`;
      const headerLabel =
        setName === `Set ${set}`
          ? `Set ${set} · ${injectorCount} injectors`
          : `Set ${set} · ${setName} · ${injectorCount} injectors`;
      let body = '';
      for (let injector = 1; injector <= injectorCount; injector += 1) {
        const key = buildSerialKey(set, injector);
        const value = intakeSerialMap.get(key);
        const defaultValue = value == null || value === '' ? String(injector) : value;
        body += `
          <tr>
            <td>
              <input
                data-serial-input
                data-set="${set}"
                data-injector="${injector}"
                type="text"
                value="${escapeHtml(defaultValue)}"
                placeholder="Serial"
              />
            </td>
            <td class="intake-photo-cell">
              <div class="photo-cell">
                <div class="photo-split">
                  <button
                    class="btn btn--ghost"
                    type="button"
                    data-photo-capture
                    data-photo-type="injector_intake_photo"
                    data-set="${set}"
                    data-injector="${injector}"
                  >
                    Take
                  </button>
                  <label
                    class="dropzone-inline"
                    data-photo-dropzone
                    data-photo-type="injector_intake_photo"
                    data-set="${set}"
                    data-injector="${injector}"
                  >
                    Click or drop intake photo
                    <input
                      type="file"
                      accept="image/*"
                      data-photo-upload
                      data-photo-type="injector_intake_photo"
                      data-set="${set}"
                      data-injector="${injector}"
                      hidden
                    />
                  </label>
                </div>
              </div>
            </td>
            <td class="intake-photo-cell">
              <div class="photo-cell">
                <div class="photo-split">
                  <button
                    class="btn btn--ghost"
                    type="button"
                    data-photo-capture
                    data-photo-type="injector_filter_photo"
                    data-set="${set}"
                    data-injector="${injector}"
                  >
                    Take
                  </button>
                  <label
                    class="dropzone-inline"
                    data-photo-dropzone
                    data-photo-type="injector_filter_photo"
                    data-set="${set}"
                    data-injector="${injector}"
                  >
                    Click or drop filter photo
                    <input
                      type="file"
                      accept="image/*"
                      data-photo-upload
                      data-photo-type="injector_filter_photo"
                      data-set="${set}"
                      data-injector="${injector}"
                      hidden
                    />
                  </label>
                </div>
              </div>
            </td>
          </tr>
        `;
      }

      tables += `
        <div class="intake-table-card">
          <h4>${escapeHtml(headerLabel)}</h4>
          <div class="intake-set-photo">
            <div class="photo-cell">
              <div class="photo-split">
                <button
                  class="btn btn--ghost"
                  type="button"
                  data-photo-capture
                  data-photo-type="set_intake_photo"
                  data-set="${set}"
                >
                  Take
                </button>
                <label
                  class="dropzone-inline"
                  data-photo-dropzone
                  data-photo-type="set_intake_photo"
                  data-set="${set}"
                >
                  Click or drop set intake photo
                  <input
                    type="file"
                    accept="image/*"
                    data-photo-upload
                    data-photo-type="set_intake_photo"
                    data-set="${set}"
                    hidden
                  />
                </label>
              </div>
            </div>
          </div>
          <table class="intake-table">
            <thead>
              <tr>
                <th>Serial number</th>
                <th>Injector intake photo</th>
                <th>Filter photo</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      `;
    }

    intakeTable.innerHTML = tables;
  };

  const getRoundsForSet = (setNumber) => {
    const rounds = cleaningRoundsState.get(setNumber) || [];
    const normalized = [];
    const initialRound = rounds.find((round) => round.roundIndex === 0);
    normalized.push({
      roundIndex: 0,
      label: initialRound?.label || 'Initial flow',
    });
    rounds
      .filter((round) => round.roundIndex > 0)
      .sort((a, b) => a.roundIndex - b.roundIndex)
      .forEach((round) => normalized.push(round));
    return normalized;
  };

  const syncCleaningEntryMapFromTable = () => {
    const noteMap = new Map();
    const deadMap = new Map();
    cleaningTable
      .querySelectorAll('input[data-cleaning-note]')
      .forEach((input) => {
        const key = `${input.dataset.set}-${input.dataset.round}-${input.dataset.injector}`;
        noteMap.set(key, input.value);
      });
    cleaningTable
      .querySelectorAll('input[data-cleaning-dead]')
      .forEach((input) => {
        const key = `${input.dataset.set}-${input.dataset.round}-${input.dataset.injector}`;
        deadMap.set(key, input.value);
      });

    cleaningTable
      .querySelectorAll('input[data-cleaning-input]')
      .forEach((input) => {
        const key = `${input.dataset.set}-${input.dataset.round}-${input.dataset.injector}`;
        cleaningEntryMap.set(key, {
          setNumber: Number(input.dataset.set),
          roundIndex: Number(input.dataset.round),
          injectorNumber: Number(input.dataset.injector),
          flowValue: input.value,
          deadTime: deadMap.get(key) || '',
          note: noteMap.get(key) || '',
        });
      });
  };

  const renderCleaningRoundButtons = () => {
    const rounds = getRoundsForSet(activeCleaningSet);
    cleaningRoundButtons.innerHTML = '';
    rounds.forEach((round) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'round-button';
      if (round.roundIndex === activeCleaningRoundIndex) {
        button.classList.add('active');
      }
      button.textContent = round.label;
      button.dataset.roundIndex = String(round.roundIndex);
      button.addEventListener('click', () => {
        syncCleaningEntryMapFromTable();
        activeCleaningRoundIndex = round.roundIndex;
        renderCleaningRoundButtons();
        renderCleaningTable();
      });
      cleaningRoundButtons.appendChild(button);
    });
  };

  const renderCleaningTable = () => {
    const injectorCount = intakePerSetCounts[activeCleaningSet - 1] || 1;
    const rounds = getRoundsForSet(activeCleaningSet);
    const activeRound = rounds.find(
      (round) => round.roundIndex === activeCleaningRoundIndex,
    );
    const roundLabel = activeRound?.label || 'Initial flow';

    let body = '';
    for (let injector = 1; injector <= injectorCount; injector += 1) {
      const serialKey = buildSerialKey(activeCleaningSet, injector);
      const serialNumber = intakeSerialMap.get(serialKey) || String(injector);
      const entryKey = `${activeCleaningSet}-${activeCleaningRoundIndex}-${injector}`;
      const entry = cleaningEntryMap.get(entryKey);
      body += `
        <tr>
          <td>${escapeHtml(serialNumber)}</td>
          <td>
            <input
              type="text"
              data-cleaning-input
              data-set="${activeCleaningSet}"
              data-round="${activeCleaningRoundIndex}"
              data-injector="${injector}"
              value="${escapeHtml(entry?.flowValue || '')}"
              placeholder="Flow result"
            />
          </td>
          <td>
            <input
              type="text"
              data-cleaning-dead
              data-set="${activeCleaningSet}"
              data-round="${activeCleaningRoundIndex}"
              data-injector="${injector}"
              value="${escapeHtml(entry?.deadTime || '')}"
              placeholder="Dead times"
            />
          </td>
          <td>
            <input
              type="text"
              data-cleaning-note
              data-set="${activeCleaningSet}"
              data-round="${activeCleaningRoundIndex}"
              data-injector="${injector}"
              value="${escapeHtml(entry?.note || '')}"
              placeholder="Notes"
            />
          </td>
        </tr>
      `;
    }

    cleaningTable.innerHTML = `
      <div class="intake-table-card">
        <h4>${roundLabel}</h4>
        <table class="intake-table">
          <thead>
            <tr>
              <th>Serial number</th>
              <th>Flow result</th>
              <th>Dead times</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  };

  const syncCleaningSetButtons = () => {
    const setCount = parsePositiveInt(intakeSetInput.value);
    const totalSets = setCount || 1;
    if (activeCleaningSet > totalSets) {
      activeCleaningSet = 1;
    }
    activeCleaningRoundIndex = 0;
    cleaningSetButtons.innerHTML = '';
    const names = readPerSetNames();
    for (let set = 1; set <= totalSets; set += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'round-button';
      if (set === activeCleaningSet) {
        button.classList.add('active');
      }
      button.textContent = names[set - 1] || `Set ${set}`;
      button.addEventListener('click', () => {
        syncCleaningEntryMapFromTable();
        activeCleaningSet = set;
        activeCleaningRoundIndex = 0;
        syncCleaningSetButtons();
        renderCleaningRoundButtons();
        renderCleaningTable();
      });
      cleaningSetButtons.appendChild(button);
    }
  };

  const renderQualitySetButtons = () => {
    const setCount = parsePositiveInt(intakeSetInput.value);
    const totalSets = setCount || 1;
    if (activeQualitySet > totalSets) {
      activeQualitySet = 1;
    }
    qualitySetButtons.innerHTML = '';
    const names = readPerSetNames();
    for (let set = 1; set <= totalSets; set += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'round-button';
      if (set === activeQualitySet) {
        button.classList.add('active');
      }
      button.textContent = names[set - 1] || `Set ${set}`;
      button.addEventListener('click', () => {
        activeQualitySet = set;
        renderQualitySetButtons();
        renderQualitySummary();
      });
      qualitySetButtons.appendChild(button);
    }
  };

  const getEntriesForRound = (setNumber, roundIndex) => {
    const injectorCount = intakePerSetCounts[setNumber - 1] || 1;
    const entries = [];
    for (let injector = 1; injector <= injectorCount; injector += 1) {
      const key = `${setNumber}-${roundIndex}-${injector}`;
      const entry = cleaningEntryMap.get(key);
      entries.push({
        injectorNumber: injector,
        serialNumber: intakeSerialMap.get(buildSerialKey(setNumber, injector)) || String(injector),
        flowValue: entry?.flowValue || '',
      });
    }
    return entries;
  };

  const getSelectedRoundIndex = (setNumber, injectorNumber, fallbackRound) => {
    const key = `${setNumber}-${injectorNumber}`;
    const selected = qualitySelectionMap.get(key);
    return Number.isInteger(selected) ? selected : fallbackRound;
  };

  const getEntriesForSelectedRounds = (setNumber, fallbackRoundIndex) => {
    const injectorCount = intakePerSetCounts[setNumber - 1] || 1;
    const entries = [];
    for (let injector = 1; injector <= injectorCount; injector += 1) {
      const selectedRound = getSelectedRoundIndex(
        setNumber,
        injector,
        fallbackRoundIndex,
      );
      const entryKey = `${setNumber}-${selectedRound}-${injector}`;
      const entry = cleaningEntryMap.get(entryKey);
      entries.push({
        injectorNumber: injector,
        serialNumber:
          intakeSerialMap.get(buildSerialKey(setNumber, injector)) ||
          String(injector),
        flowValue: entry?.flowValue || '',
      });
    }
    return entries;
  };

  const renderBarChart = (canvas, entries) => {
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));

    const values = entries.map((entry) => Number(entry.flowValue));
    const filtered = values.filter((value) => !Number.isNaN(value));
    const max = Math.max(1, ...filtered);
    const min = filtered.length ? Math.min(...filtered) : 0;
    const baseline = Math.max(0, min - Math.abs(min) * 0.1);
    const padding = 28 * pixelRatio;
    const width = canvas.width;
    const height = canvas.height;
    const barSlot = (width - padding * 2) / Math.max(entries.length, 1);
    const barWidth = Math.max(6 * pixelRatio, barSlot * 0.6);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f7f1e8';
    ctx.fillRect(0, 0, width, height);

    if (entries.length === 0) {
      ctx.fillStyle = '#5a5f6d';
      ctx.font = `${14 * pixelRatio}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('No data yet', width / 2, height / 2);
      return;
    }

    entries.forEach((entry, index) => {
      const value = Number(entry.flowValue);
      const safeValue = Number.isNaN(value) ? 0 : value;
      const range = Math.max(1, max - baseline);
      const barHeight = ((safeValue - baseline) / range) * (height - padding * 2);
      const x = padding + index * barSlot + (barSlot - barWidth) / 2;
      const y = height - padding - barHeight;
      ctx.fillStyle = '#1f7a63';
      ctx.fillRect(x, y, barWidth - 8, barHeight);

      ctx.fillStyle = '#1a1f2b';
      ctx.font = `${12 * pixelRatio}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        entry.serialNumber,
        x + (barWidth - 8 * pixelRatio) / 2,
        height - 8 * pixelRatio,
      );

      if (!Number.isNaN(value)) {
        ctx.font = `${11 * pixelRatio}px sans-serif`;
        const labelY = Math.max(padding, y - 6 * pixelRatio);
        ctx.fillText(
          String(entry.flowValue),
          x + (barWidth - 8 * pixelRatio) / 2,
          labelY,
        );
      }
    });
  };

  const renderVariationMetric = (target, entries) => {
    if (!target) {
      return;
    }
    const values = entries
      .map((entry) => Number(entry.flowValue))
      .filter((value) => !Number.isNaN(value));
    if (values.length === 0) {
      target.textContent = 'Variation: 0.5%';
      return;
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const average =
      values.reduce((total, value) => total + value, 0) / values.length;
    const raw = average > 0 ? ((max - min) / average) * 100 : 0;
    const percent = Math.max(0.5, raw);
    target.textContent = `Variation: ${percent.toFixed(1)}%`;
  };

  const renderAverageMetric = (target, entries) => {
    if (!target) {
      return;
    }
    const values = entries
      .map((entry) => Number(entry.flowValue))
      .filter((value) => !Number.isNaN(value));
    if (values.length === 0) {
      target.textContent = 'Average: --';
      return;
    }
    const average =
      values.reduce((total, value) => total + value, 0) / values.length;
    target.textContent = `Average: ${average.toFixed(2)}cc/min`;
  };


  const renderQualitySummary = () => {
    const rounds = getRoundsForSet(activeQualitySet);
    const lastCleaningRound = rounds
      .filter((round) => round.roundIndex > 0)
      .sort((a, b) => b.roundIndex - a.roundIndex)[0];
    const initialEntries = getEntriesForRound(activeQualitySet, 0);
    const lastEntries = lastCleaningRound
      ? getEntriesForSelectedRounds(activeQualitySet, lastCleaningRound.roundIndex)
      : [];

    renderBarChart(initialFlowChart, initialEntries);
    renderBarChart(lastFlowChart, lastEntries);
    renderVariationMetric(initialFlowMetric, initialEntries);
    renderVariationMetric(lastFlowMetric, lastEntries);
    renderAverageMetric(initialFlowAverage, initialEntries);
    renderAverageMetric(lastFlowAverage, lastEntries);

    const list = rounds.length
      ? rounds
          .map((round) => {
            const entries = getEntriesForRound(activeQualitySet, round.roundIndex);
            const completed = entries.filter((entry) => entry.flowValue).length;
            const rows = entries
              .map((entry) => {
                const key = `${activeQualitySet}-${round.roundIndex}-${entry.injectorNumber}`;
                const fullEntry = cleaningEntryMap.get(key);
                return `
                  <tr>
                    <td>${escapeHtml(entry.serialNumber)}</td>
                    <td>${escapeHtml(fullEntry?.flowValue || '--')}</td>
                    <td>${escapeHtml(fullEntry?.deadTime || '--')}</td>
                    <td>${escapeHtml(fullEntry?.note || '--')}</td>
                  </tr>
                `;
              })
              .join('');

            return `
              <div class="quality-accordion-item">
                <button
                  type="button"
                  class="quality-accordion-trigger"
                  data-accordion-trigger
                  aria-expanded="false"
                >
                  <span>
                    <strong>${round.label}</strong>
                    <span class="quality-round-sub">Round ${round.roundIndex}</span>
                  </span>
                  <span>${completed}/${entries.length} flow values</span>
                </button>
                <div class="quality-accordion-content hidden" data-accordion-content>
                  <table class="intake-table">
                    <thead>
                      <tr>
                        <th>Serial number</th>
                        <th>Flow result</th>
                        <th>Dead times</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                  </table>
                </div>
              </div>
            `;
          })
          .join('')
      : '<p>No cleaning rounds saved yet.</p>';
    qualityRoundList.innerHTML = list;
    renderQualitySelectionList(rounds);
  };

  const renderQualitySelectionList = (rounds) => {
    const selectableRounds = rounds.filter((round) => round.roundIndex > 0);
    const injectorCount = intakePerSetCounts[activeQualitySet - 1] || 1;

    if (selectableRounds.length === 0) {
      qualitySelectionList.innerHTML =
        '<p>No cleaning rounds available yet. Add Cleaning 1+ to enable selections.</p>';
      qualitySelectionSave.classList.add('hidden');
      return;
    }

    qualitySelectionSave.classList.remove('hidden');
    let rows = '';
    for (let injector = 1; injector <= injectorCount; injector += 1) {
      const serialNumber =
        intakeSerialMap.get(buildSerialKey(activeQualitySet, injector)) ||
        String(injector);
      const selectedRound = getSelectedRoundIndex(
        activeQualitySet,
        injector,
        selectableRounds[selectableRounds.length - 1].roundIndex,
      );
      rows += `
        <div class="quality-selection-row" data-injector-row="${injector}">
          <div class="quality-selection-serial">${escapeHtml(serialNumber)}</div>
          <div class="quality-selection-options">
            ${selectableRounds
              .map((round) => {
                const checked = round.roundIndex === selectedRound ? 'checked' : '';
                const entryKey = `${activeQualitySet}-${round.roundIndex}-${injector}`;
                const entry = cleaningEntryMap.get(entryKey);
                const flowValue = entry?.flowValue ? entry.flowValue : '--';
                return `
                  <label title="${escapeHtml(round.label)}">
                    <input
                      type="checkbox"
                      data-quality-select
                      data-set="${activeQualitySet}"
                      data-injector="${injector}"
                      data-round="${round.roundIndex}"
                      ${checked}
                    />
                    ${escapeHtml(flowValue)}
                  </label>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }
    qualitySelectionList.innerHTML = rows;
  };

  const renderSetFields = (setCount, perSetCounts) => {
    let markup = '';
    for (let set = 1; set <= setCount; set += 1) {
      const value = perSetCounts[set - 1] || 1;
      const nameValue = intakeSetNames[set - 1] || `Set ${set}`;
      markup += `
        <div class="intake-set-row">
          <label>
            Set ${set} name
            <input
              type="text"
              data-set-name
              data-set-number="${set}"
              value="${escapeHtml(nameValue)}"
              placeholder="Set ${set}"
            />
          </label>
          <label>
            Injectors in set ${set}
            <input
              type="number"
              min="1"
              data-set-count
              data-set-number="${set}"
              value="${value}"
            />
          </label>
        </div>
      `;
    }
    intakeSetFields.innerHTML = markup;
  };

  const readPerSetCounts = () => {
    const counts = [];
    intakeSetFields.querySelectorAll('input[data-set-count]').forEach((input) => {
      const parsed = parsePositiveInt(input.value);
      counts.push(parsed || 1);
    });
    return counts;
  };

  const readPerSetNames = () => {
    const names = [];
    intakeSetFields.querySelectorAll('input[data-set-name]').forEach((input) => {
      const value = input.value.trim();
      names.push(value || `Set ${input.dataset.setNumber || names.length + 1}`);
    });
    return names;
  };

  const syncTableWithInputs = () => {
    const setCount = parsePositiveInt(intakeSetInput.value);
    if (!setCount) {
      showIntakeTableError('Enter a valid set count.');
      return;
    }
    showIntakeTableError('');
    intakeSerialMap = captureSerialMapFromTable();
    intakePerSetCounts = readPerSetCounts();
    intakeSetNames = readPerSetNames();
    renderIntakeTable(setCount, intakePerSetCounts);
  };

  const defaultTab = getDefaultTab(request.status);
  setActiveTab(defaultTab);
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveTab(button.dataset.tab);
    });
  });

  renderSetFields(initialSetCount, initialPerSetCounts);
  renderIntakeTable(initialSetCount, initialPerSetCounts);
  syncCleaningSetButtons();
  renderCleaningRoundButtons();
  renderCleaningTable();
  renderQualitySetButtons();
  renderQualitySummary();

  intakeSetInput.addEventListener('input', () => {
    syncCleaningEntryMapFromTable();
    const setCount = parsePositiveInt(intakeSetInput.value);
    if (!setCount) {
      showIntakeTableError('Enter a valid set count.');
      return;
    }
    showIntakeTableError('');
    intakeSerialMap = captureSerialMapFromTable();
    const nextCounts = [];
    const nextNames = [];
    for (let i = 0; i < setCount; i += 1) {
      nextCounts.push(intakePerSetCounts[i] || 1);
      nextNames.push(intakeSetNames[i] || `Set ${i + 1}`);
    }
    intakePerSetCounts = nextCounts;
    intakeSetNames = nextNames;
    renderSetFields(setCount, intakePerSetCounts);
    renderIntakeTable(setCount, intakePerSetCounts);
    syncCleaningSetButtons();
    renderCleaningRoundButtons();
    renderCleaningTable();
    renderQualitySetButtons();
    renderQualitySummary();
  });

  intakeSetFields.addEventListener('input', () => {
    syncCleaningEntryMapFromTable();
    syncTableWithInputs();
    syncCleaningSetButtons();
    renderCleaningTable();
    renderQualitySetButtons();
    renderQualitySummary();
  });

  intakeSaveTable.addEventListener('click', async () => {
    const setCount = parsePositiveInt(intakeSetInput.value);
    if (!setCount) {
      showIntakeTableError('Enter a valid set count.');
      return;
    }
    showIntakeTableError('');
    const serials = [];
    intakeTable
      .querySelectorAll('input[data-serial-input]')
      .forEach((input) => {
        serials.push({
          setNumber: Number(input.dataset.set),
          injectorNumber: Number(input.dataset.injector),
          serialNumber: input.value,
        });
      });

    await fetchJson(
      `${API_BASE}/service-requests/${encodeURIComponent(
        request.serviceNumber,
      )}/intake`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setCount,
          perSetCounts: readPerSetCounts(),
          perSetNames: readPerSetNames(),
          serials,
        }),
      },
    );

    await fetchJson(
      `${API_BASE}/service-requests/${encodeURIComponent(
        request.serviceNumber,
      )}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: INTAKE_STATUS,
          notePublic: 'Checked in.',
          noteInternal: 'Intake table saved.',
          updatedBy: 'admin',
        }),
      },
    );

    await loadDetail(request.serviceNumber);
  });

  cleaningAddRound.addEventListener('click', () => {
    syncCleaningEntryMapFromTable();
    const existingRounds = cleaningRoundsState.get(activeCleaningSet) || [];
    const maxIndex = existingRounds.reduce(
      (max, round) => Math.max(max, round.roundIndex),
      0,
    );
    const nextIndex = Math.max(1, maxIndex + 1);
    const newRound = {
      setNumber: activeCleaningSet,
      roundIndex: nextIndex,
      label: `Cleaning ${nextIndex}`,
    };
    cleaningRoundsState.set(activeCleaningSet, [...existingRounds, newRound]);
    activeCleaningRoundIndex = nextIndex;
    renderCleaningRoundButtons();
    renderCleaningTable();
    renderQualitySummary();
  });

  qualitySelectionList.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    if (!target.hasAttribute('data-quality-select')) {
      return;
    }
    const injector = Number(target.dataset.injector);
    const roundIndex = Number(target.dataset.round);
    const rowSelector = `[data-injector-row="${injector}"] input[data-quality-select]`;
    qualitySelectionList
      .querySelectorAll(rowSelector)
      .forEach((input) => {
        if (input !== target) {
          input.checked = false;
        }
      });
    if (target.checked) {
      qualitySelectionMap.set(`${activeQualitySet}-${injector}`, roundIndex);
    } else {
      qualitySelectionMap.delete(`${activeQualitySet}-${injector}`);
    }
    renderQualitySummary();
  });

  qualitySelectionSave.addEventListener('click', async () => {
    showQualitySelectionError('');
    const selections = [];
    qualitySelectionList
      .querySelectorAll('input[data-quality-select]:checked')
      .forEach((input) => {
        selections.push({
          injectorNumber: Number(input.dataset.injector),
          roundIndex: Number(input.dataset.round),
        });
      });

    try {
      await fetchJson(
        `${API_BASE}/service-requests/${encodeURIComponent(
          request.serviceNumber,
        )}/quality-selection`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setNumber: activeQualitySet,
            selections,
          }),
        },
      );

      await loadDetail(request.serviceNumber);
    } catch (error) {
      showQualitySelectionError('Unable to save selections. Try again.');
    }
  });

  const stopCameraStream = () => {
    if (!cameraStream) {
      return;
    }
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  };

  const closeCameraModal = () => {
    stopCameraStream();
    cameraContext = null;
    cameraVideo.srcObject = null;
    cameraError.textContent = '';
    cameraError.classList.add('hidden');
    cameraModal.classList.add('hidden');
  };

  const openCameraModal = async ({ setNumber, injectorNumber, photoType }) => {
    cameraContext = { setNumber, injectorNumber, photoType };
    cameraModal.classList.remove('hidden');
    cameraError.textContent = '';
    cameraError.classList.add('hidden');
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play();
    } catch (error) {
      cameraError.textContent =
        'Unable to access the camera. Check browser permissions.';
      cameraError.classList.remove('hidden');
    }
  };

  intakeTable.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-photo-capture]');
    if (!trigger) {
      return;
    }
    const setNumber = Number(trigger.dataset.set);
    const injectorNumber = trigger.dataset.injector
      ? Number(trigger.dataset.injector)
      : undefined;
    const photoType = trigger.dataset.photoType;
    openCameraModal({ setNumber, injectorNumber, photoType });
  });

  intakeTable.addEventListener('dragover', (event) => {
    const dropzone = event.target.closest('[data-photo-dropzone]');
    if (!dropzone) {
      return;
    }
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  });

  intakeTable.addEventListener('dragleave', (event) => {
    const dropzone = event.target.closest('[data-photo-dropzone]');
    if (!dropzone) {
      return;
    }
    dropzone.classList.remove('is-dragging');
  });

  intakeTable.addEventListener('drop', async (event) => {
    const dropzone = event.target.closest('[data-photo-dropzone]');
    if (!dropzone) {
      return;
    }
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    showIntakeError('');
    const setNumber = Number(dropzone.dataset.set);
    const injectorNumber = dropzone.dataset.injector
      ? Number(dropzone.dataset.injector)
      : undefined;
    const photoType = dropzone.dataset.photoType;
    try {
      const dataUrl = await readImageAsDataUrl(file);
      await uploadPhoto({ setNumber, injectorNumber, photoType, dataUrl });
      await loadDetail(request.serviceNumber);
    } catch (error) {
      showIntakeError(error.message || 'Unable to upload photo.');
    }
  });

  intakeTable.addEventListener('change', async (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    if (!input.hasAttribute('data-photo-upload')) {
      return;
    }
    showIntakeError('');
    const setNumber = Number(input.dataset.set);
    const injectorNumber = input.dataset.injector
      ? Number(input.dataset.injector)
      : undefined;
    const photoType = input.dataset.photoType;
    const file = input.files?.[0];
    try {
      const dataUrl = await readImageAsDataUrl(file);
      await uploadPhoto({ setNumber, injectorNumber, photoType, dataUrl });
      await loadDetail(request.serviceNumber);
    } catch (error) {
      showIntakeError(error.message || 'Unable to upload photo.');
    } finally {
      input.value = '';
    }
  });

  cameraModal.addEventListener('click', (event) => {
    if (event.target && event.target.hasAttribute('data-camera-close')) {
      closeCameraModal();
    }
  });

  cameraCancelButton.addEventListener('click', () => {
    closeCameraModal();
  });

  cameraCaptureButton.addEventListener('click', async () => {
    if (!cameraContext) {
      return;
    }
    showIntakeError('');
    try {
      const canvas = document.createElement('canvas');
      const width = cameraVideo.videoWidth || 640;
      const height = cameraVideo.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(cameraVideo, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      await uploadPhoto({ ...cameraContext, dataUrl });
      closeCameraModal();
      await loadDetail(request.serviceNumber);
    } catch (error) {
      showIntakeError('Unable to capture photo.');
    }
  });

  qualityRoundList.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-accordion-trigger]');
    if (!trigger) {
      return;
    }
    const item = trigger.closest('.quality-accordion-item');
    const content = item?.querySelector('[data-accordion-content]');
    if (!content) {
      return;
    }
    const isHidden = content.classList.contains('hidden');
    content.classList.toggle('hidden', !isHidden);
    trigger.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });

  cleaningSave.addEventListener('click', async () => {
    showCleaningError('');
    const updatedBy = cleaningByInput.value || 'admin';
    const rounds = getRoundsForSet(activeCleaningSet);
    const activeRound = rounds.find(
      (round) => round.roundIndex === activeCleaningRoundIndex,
    );

    if (!activeRound) {
      showCleaningError('Select a cleaning round before saving.');
      return;
    }

    const noteMap = new Map();
    cleaningTable
      .querySelectorAll('input[data-cleaning-note]')
      .forEach((input) => {
        const key = `${input.dataset.set}-${input.dataset.round}-${input.dataset.injector}`;
        noteMap.set(key, input.value);
      });

    const entries = [];
    const deadMap = new Map();
    cleaningTable
      .querySelectorAll('input[data-cleaning-dead]')
      .forEach((input) => {
        const key = `${input.dataset.set}-${input.dataset.round}-${input.dataset.injector}`;
        deadMap.set(key, input.value);
      });
    cleaningTable
      .querySelectorAll('input[data-cleaning-input]')
      .forEach((input) => {
        const key = `${input.dataset.set}-${input.dataset.round}-${input.dataset.injector}`;
        entries.push({
          setNumber: Number(input.dataset.set),
          roundIndex: Number(input.dataset.round),
          injectorNumber: Number(input.dataset.injector),
          flowValue: input.value,
          deadTime: deadMap.get(key) || '',
          note: noteMap.get(key) || '',
        });
      });

    await fetchJson(
      `${API_BASE}/service-requests/${encodeURIComponent(
        request.serviceNumber,
      )}/cleaning-round`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setNumber: activeCleaningSet,
          roundIndex: activeRound.roundIndex,
          label: activeRound.label,
          entries,
          updatedBy,
        }),
      },
    );

    await loadRequests();
    await loadDetail(request.serviceNumber);
  });

  statusForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = statusSelect.value;
    const notePublic = document.getElementById('status-public').value;
    const noteInternal = document.getElementById('status-internal').value;
    const updatedBy = document.getElementById('status-by').value || 'admin';

    await fetchJson(
      `${API_BASE}/service-requests/${encodeURIComponent(
        request.serviceNumber,
      )}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notePublic, noteInternal, updatedBy }),
      },
    );

    await loadRequests();
    await loadDetail(request.serviceNumber);
  });

};

const seedDemoRequest = async () => {
  const payload = await fetchJson('/api/service-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        name: 'Demo Customer',
        email: 'demo@fic-cleaning.com',
      },
      items: [
        { name: 'Leather jacket', quantity: 1, conditionNotes: 'Minor scuffs.' },
        { name: 'Wool coat', quantity: 2, conditionNotes: 'Dry clean only.' },
      ],
    }),
  });

  await loadRequests();
  await loadDetail(payload.serviceNumber);
};

const init = async () => {
  await loadMilestones();
  await loadRequests();

  elements.searchInput.addEventListener('input', renderList);
  elements.refreshButton.addEventListener('click', loadRequests);
  elements.seedButton.addEventListener('click', seedDemoRequest);
};

init().catch((error) => {
  console.error('Admin portal failed to load', error);
});
