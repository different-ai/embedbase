const authentication = require('./authentication');
const searchTrigger = require('./triggers/search.js');
const datasetsTrigger = require('./triggers/datasets.js');
const addCreate = require('./creates/add.js');
const listDatasetsSearch = require('./searches/list_datasets.js');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,
  authentication: authentication,
  triggers: {
    [searchTrigger.key]: searchTrigger,
    [datasetsTrigger.key]: datasetsTrigger,
  },
  creates: { [addCreate.key]: addCreate },
  searches: { [listDatasetsSearch.key]: listDatasetsSearch },
};
