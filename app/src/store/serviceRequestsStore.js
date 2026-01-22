const serviceRequests = new Map();

const createServiceRequest = (serviceRequest) => {
  serviceRequests.set(serviceRequest.serviceNumber, serviceRequest);
  return serviceRequest;
};

const getServiceRequest = (serviceNumber) => serviceRequests.get(serviceNumber);

module.exports = {
  createServiceRequest,
  getServiceRequest,
};
