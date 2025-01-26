const perform = async (z, bundle) => {
  return bundle.cleanedRequest;
};

const performList = async (z, bundle) => {
  const options = {
    url: 'https://api.embedbase.xyz/v1/datasets',
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer ' + bundle.authData.api_key,
    },
  };

  return z.request(options).then((response) => {
    response.throwForStatus();
    const results = response.json;

    // You can do any parsing you need for results here before returning them

    return results.datasets;
  });
};

module.exports = {
  operation: {
    perform: perform,
    type: 'hook',
    performList: performList,
    sample: { dataset_id: 'foo', documents_count: 65 },
    outputFields: [
      { key: 'dataset_id', type: 'string' },
      { key: 'documents_count', type: 'number' },
    ],
  },
  key: 'datasets',
  noun: 'Datasets',
  display: {
    label: 'List datasets',
    description: 'List your embedbase datasets',
    hidden: false,
    important: true,
  },
};
