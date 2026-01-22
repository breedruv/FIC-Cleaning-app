const express = require('express');

const { getShopifyAppStatus } = require('../shopify/shopifyApp');

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json(getShopifyAppStatus());
});

module.exports = router;
