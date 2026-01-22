const { v4: uuidv4 } = require('uuid');

const createServiceNumber = () => {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const shortId = uuidv4().split('-')[0].toUpperCase();
  return `CS-${dateStamp}-${shortId}`;
};

module.exports = {
  createServiceNumber,
};
