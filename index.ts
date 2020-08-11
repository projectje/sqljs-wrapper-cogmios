import * as log from 'electron-log';
import * as fse from 'fs-extra';
var initSqlJs = require('sql.js/dist/sql-wasm.js');

export class DatabaseCore {

    // static intance field singleton
    private static instance: DatabaseCore

    // fields
    database: any;
    databaseLocation: string = '';
    lock: boolean; // for logging only

    // constructor with private access modifier
    private constructor() {
    }

    /**
     * Get instance
     */
    static getInstance(): DatabaseCore {
        if (!DatabaseCore.instance) {
            DatabaseCore.instance = new DatabaseCore();
        }
        return DatabaseCore.instance;
    }

    /**
     * Set the database location
     * @param dbLocation string
     */
    public setLocation(dbLocation:string) :string
    {
        const instance = DatabaseCore.getInstance();
        instance.databaseLocation = dbLocation
        if (fse.existsSync(instance.databaseLocation)) {
            return instance.databaseLocation
        } else
        {
            log.warn("databaselocation does not exist")
        }

    }

    /**
     * open the database
     */
    public async open(): Promise<boolean> {
        log.debug('database: open')
        let instance = DatabaseCore.getInstance();
        try {
            var buffer = await fse.readFile(instance.databaseLocation)
            //initSqlJs().then(async function(SQL) {
            //    instance.database = new SQL.Database(buffer);
            //});
            const SQL  = await initSqlJs({});
            instance.database = new SQL.Database(buffer);

            log.debug(typeof instance.database)
            return true
        }
        catch (Error)
        {
            return Error
        }
    }

    /**
     * This is only called when you want to explicitly initalize the database
     * so overwrite the current one.
     */
    public async init(schema:string) : Promise<boolean> {
        log.debug('database: init')
        let instance = DatabaseCore.getInstance();
        instance.lock = true

        const SQL  = await initSqlJs({});
        instance.database = new SQL.Database();

        try {
            let result = await instance.database.exec(schema)
            if (Object.keys(result).length === 0 && typeof result.constructor === 'function' && await instance.close())
            {
                log.debug('database: created a new database.')
                instance.lock = false
                log.debug('database: lock ' + instance.lock)
                return true;
            }
        } catch (error) {
            instance.lock = false
            log.error('database: creation of database failed')
            return error;
        }

          return true;
    }

    /**
     * occasionally write to the database
     */
    public async write(): Promise<boolean> {
        log.debug('database: write')
        const instance = DatabaseCore.getInstance();
        instance.lock = true
        var binaryArray = instance.database.export();
        var buffer = Buffer.from(binaryArray);
        try {
            await fse.writeFile(instance.databaseLocation, buffer, {flag: 'w'});
            instance.lock = false
            return true;
        } catch (error) {
            log.error('database: error writing file ' + error)
            instance.lock = false
            return error
        }
    }

    /**
     * close the database
     */
    public async close(): Promise<boolean> {
        log.debug('database: close')
        const instance = DatabaseCore.getInstance();
        try {
            await instance.write();
            instance.database.close();
            log.debug('database: database closed ');
            return true;
        }
        catch (error) {
            log.error('database: error closing ')
            return error
        }
    }

    /**
     * Run the query without returning anything
     * We assume that the database is already opened
     *
     * @param sql string - the sql string
     * @param params either SqlJs.ParamsObject or SqlJs.ValueType[]
     */
    public async run (sql: string, params: any) {
        const instance = DatabaseCore.getInstance();
        log.debug("database: lock " + instance.lock)
        log.debug("database executeSQL: executing " + sql)
        try {
           await instance.database.run(sql, params)
        } catch (error) {
            log.error('database: sql query failed: ' + error)
        }
    }

    /**
     * We assume that the database is already open
     * @param sql string e.g. "SELECT * FROM hello WHERE a=:aval AND b=:bval"
     * @param params either SqlJs.ParamsObject or SqlJs.ValueType[] e.g. {':aval' : 1, ':bval' : 'world'}
     */
    public async getAsObjectArray(sql:string , params: any) {
        try {
            const instance = DatabaseCore.getInstance();
            var result = [];
            var stmt = instance.database.prepare(sql)
            stmt.bind(params)
            while(stmt.step()) {
                var row = await stmt.getAsObject()
                result.push(row)
            }
            log.debug('database: getAllAsObject ' + sql + result)
            stmt.free();
            return result
        }
        catch (error){
            log.error('database: getAsObjectArray failed:' + sql)
            return error
        }
    }

    /**
     * Get all as single Object
     * @param sql string
     * @param params either SqlJs.ParamsObject or SqlJs.ValueType[] e.g. {':aval' : 1, ':bval' : 'world'}
     */
    public async getAsObject(sql:string , params: any) {
        const instance = DatabaseCore.getInstance();
        try {
            var stmt = instance.database.prepare(sql);
            var result = stmt.getAsObject(params);
            log.debug('database: getSingle ' + sql + result)
            stmt.free();
            return result
        }
        catch (error){
            log.error('database: getAsObject failed.')
            return error
        }
    }

    /**
     * Get a single Object
     * @param sql string
     */
    public async exec(sql:string) {
        const instance = DatabaseCore.getInstance();
        try {
            var result = instance.database.exec(sql)
            log.debug('database: exec ' + sql)
            return result
        }
        catch (error){
            log.error('database: getAsObject failed.')
            return error
        }
    }

    /**
     * Dump the database as json string
     */
    public async getDbDumpAsJson() {
        const instance = DatabaseCore.getInstance();
        const query1 = "SELECT name FROM sqlite_master WHERE type='table' and name not like ?";
        let tables = await instance.getAsObjectArray(query1, ['sqlite%'])
        let returnstring = "{\"database\":[";
        tables.forEach(async row => {
            returnstring = returnstring + "{\"table\": \"" + row.name + "\", \"tabledata\": ";
            const query2 = "SELECT * FROM " + row.name + ";"
            let content = instance.database.exec(query2)
            returnstring = returnstring + JSON.stringify(content) + "},"
        });
        returnstring = returnstring.slice(0, -1) + "]}"
        log.debug(returnstring)
        return returnstring
    }

}