const express = require('express');

const healthRouter = require('./routes/health');
const serviceRequestsRouter = require('./routes/serviceRequests');
const shopifyRouter = require('./routes/shopify');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/service-requests', serviceRequestsRouter);
app.use('/api/shopify', shopifyRouter);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`FIC Cleaning Shopify app server listening on ${port}`);
});
