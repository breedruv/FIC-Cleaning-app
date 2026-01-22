const { shopifyConfig } = require('./shopifyConfig');

const getShopifyAppStatus = () => ({
  appName: shopifyConfig.appName,
  apiVersion: shopifyConfig.apiVersion,
  scopes: shopifyConfig.scopes,
  status: 'scaffolded',
});

module.exports = {
  getShopifyAppStatus,
};
