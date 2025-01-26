const perform = async (z, bundle) => {
  return bundle.cleanedRequest;
};

const performList = async (z, bundle) => {
  const options = {
    url:
      'https://api.embedbase.xyz/v1/' + bundle.inputData.dataset_id + '/search',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer ' + bundle.authData.api_key,
    },
    body: {
      query: bundle.inputData.query,
    },
  };

  return z.request(options).then((response) => {
    response.throwForStatus();
    const results = response.json;

    // You can do any parsing you need for results here before returning them

    return results.similarities;
  });
};

module.exports = {
  operation: {
    perform: perform,
    inputFields: [
      {
        key: 'query',
        type: 'string',
        label: 'Query value',
        required: true,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'dataset_id',
        type: 'string',
        label: 'Dataset ID',
        dynamic: 'datasets.dataset_id.dataset_id',
        required: true,
        list: false,
        altersDynamicFields: false,
      },
    ],
    type: 'hook',
    performList: performList,
    sample: {
      score: 0.765,
      id: 'abcd',
      data: 'lions are dangerous',
      hash: 'abcd',
      embedding: [0.765, 0.765, 0.765, 0.765],
      metadata: { animals: 'savannah' },
    },
    outputFields: [
      { key: 'score', type: 'number' },
      { key: 'id', type: 'string' },
      { key: 'data', type: 'string' },
      { key: 'hash', type: 'string' },
    ],
  },
  key: 'search',
  noun: 'Search',
  display: {
    label: 'Search documents',
    description: 'Search documents in embedbase',
    hidden: false,
    important: true,
  },
};
