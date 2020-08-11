"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const log = require("electron-log");
const fse = require("fs-extra");
var initSqlJs = require('sql.js/dist/sql-wasm.js');
class Database {
    constructor(dbLocation) {
        this.databaseLocation = '';
        this.databaseLocation = dbLocation;
        if (!fse.existsSync(this.databaseLocation)) {
            log.warn("databaselocation does not exist");
        }
    }
    async open() {
        log.debug('database: open');
        try {
            var buffer = await fse.readFile(this.databaseLocation);
            const SQL = await initSqlJs({});
            this.database = new SQL.Database(buffer);
            log.debug(typeof this.database);
            return true;
        }
        catch (Error) {
            return Error;
        }
    }
    async init(schema) {
        log.debug('database: init');
        await initSqlJs().then(async function (SQL) {
            this.database = new SQL.Database();
            try {
                let result = await this.database.exec(schema);
                if (Object.keys(result).length === 0 && typeof result.constructor === 'function' && await this.close()) {
                    log.debug('database: created a new database.');
                    return true;
                }
            }
            catch (error) {
                log.error('database: creation of database failed');
                return error;
            }
        });
        return true;
    }
    async write() {
        log.debug('database: write');
        var binaryArray = this.database.export();
        var buffer = Buffer.from(binaryArray);
        try {
            await fse.writeFile(this.databaseLocation, buffer, { flag: 'w' });
            return true;
        }
        catch (error) {
            log.error('database: error writing file ' + error);
            return error;
        }
    }
    async close() {
        log.debug('database: close');
        try {
            await this.write();
            this.database.close();
            log.debug('database: database closed ');
            return true;
        }
        catch (error) {
            log.error('database: error closing ');
            return error;
        }
    }
    async run(sql, params) {
        log.debug("database executeSQL: executing " + sql);
        try {
            await this.database.run(sql, params);
        }
        catch (error) {
            log.error('database: sql query failed: ' + error);
        }
    }
    async getAsObjectArray(sql, params) {
        try {
            var result = [];
            var stmt = this.database.prepare(sql);
            stmt.bind(params);
            while (stmt.step()) {
                var row = await stmt.getAsObject();
                result.push(row);
            }
            log.debug('database: getAllAsObject ' + sql + result);
            stmt.free();
            return result;
        }
        catch (error) {
            log.error('database: getAsObjectArray failed:' + sql);
            return error;
        }
    }
    async getAsObject(sql, params) {
        try {
            var stmt = this.database.prepare(sql);
            var result = stmt.getAsObject(params);
            log.debug('database: getSingle ' + sql + result);
            stmt.free();
            return result;
        }
        catch (error) {
            log.error('database: getAsObject failed.');
            return error;
        }
    }
    async exec(sql) {
        try {
            var result = this.database.exec(sql);
            log.debug('database: exec ' + sql);
            return result;
        }
        catch (error) {
            log.error('database: getAsObject failed.');
            return error;
        }
    }
    async getDbDumpAsJson() {
        const query1 = "SELECT name FROM sqlite_master WHERE type='table' and name not like ?";
        let tables = await this.getAsObjectArray(query1, ['sqlite%']);
        let returnstring = "{\"database\":[";
        tables.forEach(async (row) => {
            returnstring = returnstring + "{\"table\": \"" + row.name + "\", \"tabledata\": ";
            const query2 = "SELECT * FROM " + row.name + ";";
            let content = this.database.exec(query2);
            returnstring = returnstring + JSON.stringify(content) + "},";
        });
        returnstring = returnstring.slice(0, -1) + "]}";
        log.debug(returnstring);
        return returnstring;
    }
}
exports.Database = Database;
//# sourceMappingURL=database.js.map