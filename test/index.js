"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fse = require("fs-extra");
const __1 = require("..");
async function test() {
    let database_uri = path.join(__dirname, '/test.db');
    let schema_query = await fse.readFile(path.join(__dirname, '/testschema.sqlite'), 'utf8');
    let instance = __1.DatabaseCore.getInstance();
    console.log('x');
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
        console.log('---');
        let result2 = await instance.getAsObject(`SELECT * from itemUrl where id > ?`, [0]);
        console.log(result2);
        console.log('---');
        let result3 = await instance.getDbDumpAsJson();
        console.log(result3);
        console.log('---');
        await instance.close();
        let backupfilename = await instance.backup();
        console.log(backupfilename);
    }
}
async function test2() {
    let database_uri = path.join(__dirname, '/test.db');
    let schema_query = await fse.readFile(path.join(__dirname, '/testschema.sqlite'), 'utf8');
    let instance = __1.DatabaseCore.getInstance();
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
        console.log('---');
        let result2 = await instance.getAsObject(`SELECT * from itemUrl where id > ?`, [0]);
        console.log(result2);
        console.log('---');
        let json = await instance.getDbDumpAsJson();
        console.log(json);
        console.log('---');
        await instance.close();
    }
}
async function test3() {
    let instance = __1.DatabaseCore.getInstance();
    let database_uri = path.join(__dirname, '/test.db');
    instance.setLocation(database_uri);
    await instance.open();
    let schema_query = await fse.readFile(path.join(__dirname, '/testschema.sqlite'), 'utf8');
    let query = await instance.delta(schema_query);
    console.log(query);
    await instance.close();
}
test();
test2();
test3();
//# sourceMappingURL=index.js.map