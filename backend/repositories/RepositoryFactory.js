const { isMongoConnected } = require('../config/database');
const mongoRepo = require('./MongoRepository');
const jsonRepo = require('./JsonFileRepository');

class RepositoryFactory {
  get repository() {
    if (isMongoConnected()) {
      return mongoRepo;
    }
    return jsonRepo;
  }
}

module.exports = new RepositoryFactory();
