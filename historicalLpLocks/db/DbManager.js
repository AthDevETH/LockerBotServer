const fs = require("node:fs");

module.exports = class DbManager {
  dbFilePath;

  constructor(dbFilePath) {
    this.dbFilePath = dbFilePath;
  }

  getDb() {
    try {
      return JSON.parse(fs.readFileSync(this.dbFilePath, "utf-8"));
    } catch (error) {
      return [];
    }
  }

  setDb(db) {
    fs.writeFileSync(this.dbFilePath, JSON.stringify(db));
  }

  resetDb() {
    this.setDb([]);
  }
};
