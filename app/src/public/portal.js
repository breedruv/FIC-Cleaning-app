/*
  Customer portal UI logic.
  Notes:
  - This script fetches from /api/service-requests/:serviceNumber.
  - Keep it simple while you learn; you can add frameworks later if needed.
  - To auto-load a service number, use ?serviceNumber=YOUR-ID in the URL.
*/

const form = document.getElementById('lookup-form');
const input = document.getElementById('service-number');
const button = document.getElementById('lookup-button');
const statusPill = document.getElementById('status-pill');
const statusMessage = document.getElementById('status-message');
const serviceNumberDisplay = document.getElementById('service-number-display');
const statusMeta = document.getElementById('status-meta');
const milestonesList = document.getElementById('milestones');
const documentsGrid = document.getElementById('documents');

const API_BASE = '/api/service-requests';

const setBusy = (isBusy) => {
  input.disabled = isBusy;
  button.disabled = isBusy;
  button.textContent = isBusy ? 'Checking...' : 'Find my status';
};

const setStatus = ({ label, message, variant }) => {
  statusPill.textContent = label;
  statusPill.dataset.variant = variant || 'neutral';
  statusMessage.textContent = message;
};

const clearMilestones = (message) => {
  milestonesList.innerHTML = '';
  if (message) {
    const placeholder = document.createElement('li');
    placeholder.className = 'timeline__item milestone--upcoming';
    placeholder.innerHTML = `
      <span class="timeline__dot"></span>
      <p class="timeline__label">Awaiting update</p>
      <p class="timeline__note">${message}</p>
    `;
    milestonesList.appendChild(placeholder);
  }
};

const renderMilestones = (milestones, currentStatus) => {
  milestonesList.innerHTML = '';

  if (!Array.isArray(milestones) || milestones.length === 0) {
    clearMilestones('Milestones will appear once tracking data is available.');
    return;
  }

  const currentIndex = milestones.indexOf(currentStatus);

  milestones.forEach((milestone, index) => {
    const item = document.createElement('li');
    const state = index < currentIndex
      ? 'milestone--complete'
      : index === currentIndex
      ? 'milestone--active'
      : 'milestone--upcoming';

    item.className = `timeline__item ${state}`;
    item.innerHTML = `
      <span class="timeline__dot"></span>
      <p class="timeline__label">${milestone}</p>
      <p class="timeline__note">${getMilestoneNote(state)}</p>
    `;
    milestonesList.appendChild(item);
  });
};

const getMilestoneNote = (state) => {
  if (state === 'milestone--complete') {
    return 'Completed and verified by our service team.';
  }
  if (state === 'milestone--active') {
    return 'Currently in progress. We will notify you of the next step.';
  }
  return 'Upcoming milestone in the cleaning workflow.';
};

const renderMeta = (data) => {
  statusMeta.innerHTML = '';

  const metaItems = [];

  if (data.createdAt) {
    metaItems.push({
      label: 'Opened',
      value: formatDate(data.createdAt),
    });
  }

  if (Array.isArray(data.items) && data.items.length > 0) {
    const itemNames = data.items
      .map((item) => item.name || 'Item')
      .join(', ');
    metaItems.push({
      label: 'Items',
      value: itemNames,
    });
  }

  if (metaItems.length === 0) {
    return;
  }

  metaItems.forEach((meta) => {
    const pill = document.createElement('span');
    pill.className = 'meta-pill';
    pill.textContent = `${meta.label}: ${meta.value}`;
    statusMeta.appendChild(pill);
  });
};

const renderDocuments = (documents) => {
  documentsGrid.innerHTML = '';

  if (!Array.isArray(documents) || documents.length === 0) {
    documentsGrid.classList.add('empty');
    documentsGrid.textContent = 'No documents published yet.';
    return;
  }

  documentsGrid.classList.remove('empty');
  documents.forEach((doc) => {
    const card = document.createElement('div');
    card.className = 'document-card';
    card.innerHTML = `
      <div>
        <strong>${doc.title || 'Service document'}</strong>
        <div>${doc.type || 'Document'}</div>
      </div>
      <a href="${doc.url}" target="_blank" rel="noreferrer">Open</a>
    `;
    documentsGrid.appendChild(card);
  });
};

const formatDate = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const updateFromResponse = (data) => {
  serviceNumberDisplay.textContent = data.serviceNumber || '---';
  setStatus({
    label: data.status || 'Status updated',
    message: 'Latest update pulled from our service team.',
    variant: 'success',
  });

  renderMilestones(data.milestones, data.status);
  renderMeta(data);
  renderDocuments(data.documents);
};

const handleLookupError = (error) => {
  const isNotFound = error && error.code === 404;
  setStatus({
    label: isNotFound ? 'Not found' : 'Error',
    message: isNotFound
      ? 'We could not locate that service number. Double-check and try again.'
      : 'We had trouble reaching the service tracker. Please try again soon.',
    variant: 'error',
  });

  statusMeta.innerHTML = '';
  clearMilestones('Milestones will appear once a valid service number is entered.');
  renderDocuments([]);
};

const fetchStatus = async (serviceNumber) => {
  setBusy(true);
  setStatus({
    label: 'Searching',
    message: 'Looking up your service request...',
    variant: 'neutral',
  });

  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(serviceNumber)}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(payload.message || 'Request failed');
      error.code = response.status;
      throw error;
    }

    const data = await response.json();
    updateFromResponse(data);
  } catch (error) {
    handleLookupError(error);
  } finally {
    setBusy(false);
  }
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const serviceNumber = input.value.trim();

  if (!serviceNumber) {
    setStatus({
      label: 'Missing number',
      message: 'Please enter the service number from your confirmation email.',
      variant: 'error',
    });
    clearMilestones('Milestones will appear after a lookup.');
    return;
  }

  fetchStatus(serviceNumber);
});

// Auto-load if a service number is present in the URL.
const params = new URLSearchParams(window.location.search);
if (params.has('serviceNumber')) {
  const fromUrl = params.get('serviceNumber');
  input.value = fromUrl;
  fetchStatus(fromUrl);
} else {
  clearMilestones('Enter a service number to begin tracking.');
}
