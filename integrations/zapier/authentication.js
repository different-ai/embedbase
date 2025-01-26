const testAuth = async (z, bundle) => {
  const options = {
    url: 'https://api.embedbase.xyz/v1/datasets',
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + bundle.authData.api_key,
      'Content-Type': 'application/json',
    },
  };

  return z.request(options).then((response) => {
    console.log(options);
    console.log(response);
    response.throwForStatus();
    const results = response.json;

    // You can do any parsing you need for results here before returning them

    return results;
  });
};

module.exports = {
  type: 'custom',
  test: testAuth,
  fields: [
    {
      computed: false,
      key: 'api_key',
      required: true,
      label: 'Embedbase API key',
      type: 'string',
      helpText: 'Get your Embedbase API key here https://app.embedbase.xyz',
    },
  ],
  customConfig: {},
};
