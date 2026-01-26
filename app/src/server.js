const express = require('express');
const path = require('path');

const healthRouter = require('./routes/health');
const serviceRequestsRouter = require('./routes/serviceRequests');
const adminRouter = require('./routes/admin');
const shopifyRouter = require('./routes/shopify');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Redirect the root path to the customer portal for convenience.
app.get('/', (req, res) => {
  res.redirect('/portal');
});

// Customer-facing portal UI (HTML/CSS/JS served from app/src/public).
app.use('/portal', express.static(path.join(__dirname, 'public')));
// Admin portal UI (separate static bundle under app/src/public/admin).
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

app.use('/health', healthRouter);
app.use('/api/service-requests', serviceRequestsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/shopify', shopifyRouter);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`FIC Cleaning Shopify app server listening on ${port}`);
});
