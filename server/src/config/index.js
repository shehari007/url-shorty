const database = require('./database');
const constants = require('./constants');

module.exports = {
  ...database,
  ...constants,
};
