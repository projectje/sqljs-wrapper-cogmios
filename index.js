"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseCore = void 0;
const log = require("electron-log");
const fse = require("fs-extra");
var initSqlJs = require('sql.js/dist/sql-wasm.js');
class DatabaseCore {
    constructor() {
        this.databaseLocation = '';
    }
    static getInstance() {
        if (!DatabaseCore.instance) {
            DatabaseCore.instance = new DatabaseCore();
        }
        return DatabaseCore.instance;
    }
    setLocation(dbLocation) {
        const instance = DatabaseCore.getInstance();
        instance.databaseLocation = dbLocation;
        if (fse.existsSync(instance.databaseLocation)) {
            return instance.databaseLocation;
        }
        else {
            log.warn("databaselocation does not exist");
        }
    }
    async open() {
        let instance = DatabaseCore.getInstance();
        try {
            var buffer = await fse.readFile(instance.databaseLocation);
            const SQL = await initSqlJs({});
            instance.database = new SQL.Database(buffer);
            return true;
        }
        catch (error) {
            log.error(error);
            throw error;
        }
    }
    async backup() {
        let instance = DatabaseCore.getInstance();
        let newpath = `${instance.databaseLocation}.${Math.floor(new Date().getTime() / 1000)}.bak`;
        try {
            fse.copy(this.databaseLocation, newpath);
            return newpath;
        }
        catch (error) {
            log.error(error);
            throw error;
        }
    }
    async rrr() {
        const regex = /(CREATE TABLE IF NOT EXISTS|CREATE TABLE)\s*(\S*)\s*(.*)/gm;
        const str = `CREATE TABLE IF NOT EXISTS itemProperty (id INTEGER PRIMARY KEY AUTOINCREMENT,itemUrlId INTEGER,itemkey TEXT,itemvalue TEXT,CONSTRAINT itemUrl_fk_itemProperty FOREIGN KEY (itemUrlId) REFERENCES itemUrl(id) ON UPDATE CASCADE ON DELETE CASCADE)`;
        let m;
        while ((m = regex.exec(str)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            console.log(m[2]);
        }
    }
    async init(schema) {
        let instance = DatabaseCore.getInstance();
        const SQL = await initSqlJs({});
        instance.database = new SQL.Database();
        try {
            let result = await instance.database.exec(schema);
            if (Object.keys(result).length === 0 && typeof result.constructor === 'function' && await instance.close()) {
                return true;
            }
        }
        catch (error) {
            log.error(error);
            throw error;
        }
    }
    async write() {
        const instance = DatabaseCore.getInstance();
        var binaryArray = instance.database.export();
        var buffer = Buffer.from(binaryArray);
        try {
            await fse.writeFile(instance.databaseLocation, buffer, { flag: 'w' });
            return true;
        }
        catch (error) {
            log.error(error);
            throw error;
        }
    }
    async close() {
        const instance = DatabaseCore.getInstance();
        try {
            await instance.write();
            instance.database.close();
            return true;
        }
        catch (error) {
            log.error(error);
            throw error;
        }
    }
    async run(sql, params) {
        const instance = DatabaseCore.getInstance();
        try {
            await instance.database.run(sql, params);
        }
        catch (error) {
            log.error(error, sql);
            throw error;
        }
    }
    async getAsObjectArray(sql, params) {
        try {
            const instance = DatabaseCore.getInstance();
            var result = [];
            var stmt = instance.database.prepare(sql);
            stmt.bind(params);
            while (stmt.step()) {
                var row = await stmt.getAsObject();
                result.push(row);
            }
            stmt.free();
            return result;
        }
        catch (error) {
            log.error(error, sql);
            throw error;
        }
    }
    async getAsObject(sql, params) {
        const instance = DatabaseCore.getInstance();
        try {
            var stmt = instance.database.prepare(sql);
            var result = stmt.getAsObject(params);
            stmt.free();
            return result;
        }
        catch (error) {
            log.error(error, sql);
            throw error;
        }
    }
    async exec(sql) {
        const instance = DatabaseCore.getInstance();
        try {
            var result = instance.database.exec(sql);
            return result;
        }
        catch (error) {
            log.error(error);
            throw error;
        }
    }
    async getDbDumpAsJson() {
        const instance = DatabaseCore.getInstance();
        const query1 = "SELECT name FROM sqlite_master WHERE type='table' and name not like ?";
        let tables = await instance.getAsObjectArray(query1, ['sqlite%']);
        let returnstring = "{\"database\":[";
        for (let table of tables) {
            returnstring = returnstring + "{\"table\": \"" + table.name + "\", \"tabledata\": ";
            const query2 = "SELECT * FROM " + table.name + ";";
            let content = instance.database.exec(query2);
            returnstring = returnstring + JSON.stringify(content) + "},";
        }
        ;
        return returnstring.slice(0, -1) + "]}";
    }
    async getTableMetadata() {
        const instance = DatabaseCore.getInstance();
        const query_tables = `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;`;
        var dbtables = await instance.getAsObjectArray(query_tables, []);
        let db_tables = [];
        let db_columns = [];
        for (let table of dbtables) {
            if (table.name.trim() != 'sqlite_sequence') {
                db_tables.push(table.name);
                let query_columns = `PRAGMA table_info(${table.name});`;
                let columns = await instance.getAsObjectArray(query_columns, []);
                for (let column of columns) {
                    column.table = table.name;
                    db_columns.push(column);
                }
            }
        }
        return [db_tables, db_columns];
    }
    async getSchemaMetadata(schema) {
        const regex1 = /(\r\n|\n|\r)/gm;
        const regex2 = /(CREATE TABLE IF NOT EXISTS|CREATE TABLE)\s*(\S*)\s*(.*)/gm;
        const regex3 = /\s\s+/g;
        const schema_raw = schema.replace(regex1, "");
        const lines = schema_raw.split(';');
        let schema_tables = [];
        let schema_tabledefs = [];
        let schema_columns = [];
        let m;
        for (let line of lines) {
            line = line.replace(regex3, '');
            regex2.lastIndex = 0;
            m = regex2.exec(line);
            if (m !== null) {
                let table = m[2];
                schema_tables.push(table);
                let tabledef = m[3].trim().substring(1, m[3].trim().length - 1);
                schema_tabledefs.push({ table: table, tabledef: tabledef });
                let columns = tabledef.split(',');
                for (let column of columns) {
                    let fields = column.trim().split(' ');
                    let name = '';
                    let datatype = '';
                    let primary_key = 0;
                    let nullable = 0;
                    if (fields.length > 0) {
                        if (fields[0] == 'CONSTRAINT') {
                        }
                        else {
                            name = fields[0].trim().replace('[', '').replace(']', '');
                            let rest = column.substr(fields[0].length);
                            if (fields.length > 1) {
                                datatype = fields[1].trim().replace('[', '').replace(']', '');
                            }
                            if (fields.length > 3) {
                                if (fields[2].trim() == 'PRIMARY' && fields[3].trim() === 'KEY') {
                                    primary_key = 1;
                                }
                                if (fields[2].trim() == 'NOT' && fields[3].trim() === 'NULL') {
                                    nullable = 1;
                                }
                                if (fields[2].trim() == 'NULL') {
                                    nullable = 0;
                                }
                            }
                            schema_columns.push({ table: table, name: name, type: datatype, pk: primary_key, notnull: nullable });
                        }
                    }
                }
            }
        }
        return [schema_tables, schema_tabledefs, schema_columns];
    }
    async createMissingTables(db_tables, schema_tables, schema_tabledefs) {
        let query = '';
        for (let schema_table of schema_tables) {
            if (db_tables.includes(schema_table) === false) {
                let table_tabledef = schema_tabledefs.filter(item => { return item.table == schema_table; });
                query += `CREATE TABLE ${schema_table} (${table_tabledef[0].tabledef});\n`;
            }
        }
        return query;
    }
    async removeOldTables(db_tables, schema_tables, db_columns) {
        let query = '';
        let db_tables2 = db_tables;
        for (let db_table of db_tables) {
            if (schema_tables.includes(db_table) === false) {
                query += `DROP TABLE ${db_table};\n`;
            }
        }
        return query;
    }
    async removeAlterColumns(db_columns, schema_columns) {
        let query = '';
        let recreatetable = new Set();
        for (let db_column of db_columns) {
            let table_in_db = schema_columns.filter((item) => { return item.table === db_column.table; });
            if (table_in_db.length > 1) {
                let column_schema = schema_columns.filter((item) => { return item.table === db_column.table && item.name === db_column.name; });
                if (column_schema.length < 1) {
                    recreatetable.add(db_column.table);
                }
                else if (db_column.type.trim() !== column_schema[0].type.trim()) {
                    recreatetable.add(db_column.table);
                }
            }
        }
        for (let table of recreatetable) {
            let db_column_parts = db_columns.filter((item) => { return item.table === table; });
            let db_column_fields_array = [];
            let db_column_selection_array = [];
            for (let db_column_part of db_column_parts) {
                db_column_fields_array.push(db_column_part.name + " " + db_column_part.type);
                db_column_selection_array.push(db_column_part.name);
            }
            let db_column_fields = '(' + db_column_fields_array.join(',') + ')';
            let db_column_selection = db_column_selection_array.join(',');
            let schema_column_parts = schema_columns.filter((item) => { return item.table === table; });
            let schema_column_fields_array = [];
            let schema_column_selection_array = [];
            for (let schema_column_part of schema_column_parts) {
                schema_column_fields_array.push(schema_column_part.name + ' ' + schema_column_part.type);
                schema_column_selection_array.push(schema_column_part.name);
            }
            let schema_column_fields = '(' + schema_column_fields_array.join(',') + ')';
            let schema_column_selection = schema_column_selection_array.join(',');
            query += `BEGIN TRANSACTION;
CREATE TEMPORARY TABLE ${table}_backup ${db_column_fields};
INSERT INTO ${table}_backup SELECT ${db_column_selection} FROM ${table};
DROP TABLE ${table};
CREATE TABLE ${table} ${schema_column_fields};
INSERT INTO ${table} SELECT ${schema_column_selection} FROM ${table}_backup;
DROP TABLE ${table}_backup;
COMMIT;\n`;
        }
        return query;
    }
    async addColumns(db_columns, schema_columns) {
        let query = '';
        for (let schema_column of schema_columns) {
            let columns_dbtable_exists = db_columns.filter(item => { return item.table === schema_column.table; });
            if (columns_dbtable_exists.length > 0) {
                let columns_dbtable = db_columns.filter(item => { return item.table === schema_column.table && item.name === schema_column.name; });
                if (columns_dbtable.length < 1) {
                    query += `ALTER TABLE ${schema_column.table} ADD COLUMN ${schema_column.name} ${schema_column.type};\n`;
                }
            }
        }
        return query;
    }
    async delta(schema) {
        const instance = DatabaseCore.getInstance();
        let [db_tables, db_columns] = await this.getTableMetadata();
        let [schema_tables, schema_tabledefs, schema_columns] = await this.getSchemaMetadata(schema);
        let query = '';
        query += await this.createMissingTables(db_tables, schema_tables, schema_tabledefs);
        query += await this.removeOldTables(db_tables, schema_tables, db_columns);
        query += await this.addColumns(db_columns, schema_columns);
        query += await this.removeAlterColumns(db_columns, schema_columns);
        console.log(query);
        try {
            await instance.exec(query);
            return query;
        }
        catch (error) {
            log.error(error);
            throw error;
        }
    }
}
exports.DatabaseCore = DatabaseCore;
//# sourceMappingURL=index.js.map