"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fse = require("fs-extra");
const database_1 = require("../src/database");
async function test() {
    let database_uri = path.join(__dirname, '/test.db');
    let schema_query = await fse.readFile(path.join(__dirname, '/testschema.sqlite'), 'utf8');
    let instance = database_1.DatabaseCore.getInstance();
    instance.setLocation(database_uri);
    let initialized = await instance.init(schema_query);
    if (initialized === true) {
        await instance.open();
        let url = 'http://www.google.com';
        await instance.run(`INSERT INTO itemUrl (url) VALUES (?)`, [url]);
        url = 'http://www.microsoft.com';
        await instance.run(`INSERT INTO itemUrl (url) VALUES (?)`, [url]);
        let result1 = await instance.getAsObjectArray(`SELECT * from itemUrl where id > ?`, [0]);
        console.log(result1);
        let result2 = await instance.getAsObject(`SELECT * from itemUrl where id > ?`, [0]);
        console.log(result2);
        await instance.getDbDumpAsJson();
        await instance.close();
    }
}
test();
//# sourceMappingURL=index.js.map