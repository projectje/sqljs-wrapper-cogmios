import * as log from 'electron-log';
import * as fse from 'fs-extra';
var initSqlJs = require('sql.js/dist/sql-wasm.js');

/**
 * non singleton version
 */
export class Database
{

    // fields
    database: any;
    databaseLocation: string = '';

    public constructor(dbLocation: string)
    {
        this.databaseLocation = dbLocation
        if (!fse.existsSync(this.databaseLocation))
        {
            log.warn("databaselocation does not exist")
        }
    }

    /**
     * open the database
     */
    public async open(): Promise<boolean>
    {
        try
        {
            var buffer = await fse.readFile(this.databaseLocation)
            const SQL = await initSqlJs({});
            this.database = new SQL.Database(buffer);
            return true
        }
        catch (error)
        {
            log.error(error)
            throw error
        }
    }

    /**
     * This is only called when you want to explicitly initalize the database
     * so overwrite the current one.
     */
    public async init(schema: string): Promise<boolean>
    {
        await initSqlJs().then(async function (SQL)
        {
            this.database = new SQL.Database();
            try
            {
                let result = await this.database.exec(schema)
                if (Object.keys(result).length === 0 && typeof result.constructor === 'function' && await this.close())
                {
                    return true;
                }
            }
            catch (error)
            {
                log.error(error)
                throw error
            }
        });
        return true;
    }

    /**
     * occasionally write to the database
     */
    public async write(): Promise<boolean>
    {
        log.debug('database: write')
        var binaryArray = this.database.export();
        var buffer = Buffer.from(binaryArray);
        try
        {
            await fse.writeFile(this.databaseLocation, buffer, { flag: 'w' });
            return true;
        }
        catch (error)
        {
            log.error(error)
            throw error
        }
    }

    /**
     * close the database
     */
    public async close(): Promise<boolean>
    {
        try
        {
            await this.write();
            this.database.close();
            return true;
        }
        catch (error)
        {
            log.error(error)
            throw error
        }
    }

    /**
     * Run the query without returning anything
     * We assume that the database is already opened
     *
     * @param sql string - the sql string
     * @param params either SqlJs.ParamsObject or SqlJs.ValueType[]
     */
    public async run(sql: string, params: any)
    {
        try
        {
            await this.database.run(sql, params)
        }
        catch (error)
        {
            log.error(error)
            throw error
        }
    }

    /**
     * We assume that the database is already open
     * @param sql string e.g. "SELECT * FROM hello WHERE a=:aval AND b=:bval"
     * @param params either SqlJs.ParamsObject or SqlJs.ValueType[] e.g. {':aval' : 1, ':bval' : 'world'}
     */
    public async getAsObjectArray(sql: string, params: any)
    {
        try
        {
            var result = [];
            var stmt = this.database.prepare(sql)
            stmt.bind(params)
            while (stmt.step())
            {
                var row = stmt.getAsObject()
                result.push(row)
            }
            stmt.free();
            return result
        }
        catch (error)
        {
            log.error(error)
            throw error
        }
    }

    /**
     * Get all as single Object
     * @param sql string
     * @param params either SqlJs.ParamsObject or SqlJs.ValueType[] e.g. {':aval' : 1, ':bval' : 'world'}
     */
    public async getAsObject(sql: string, params: any)
    {
        try
        {
            var stmt = this.database.prepare(sql);
            var result = stmt.getAsObject(params);
            stmt.free();
            return result
        }
        catch (error)
        {
            log.error(error)
            throw error
        }
    }

    /**
     * Get a single Object
     * @param sql string
     */
    public async exec(sql: string)
    {
        try
        {
            var result = this.database.exec(sql)
            return result
        }
        catch (error)
        {
            log.error(error)
            throw error
        }
    }

    /**
     * Dump the database as json string
     */
    public async getDbDumpAsJson()
    {
        const query1 = "SELECT name FROM sqlite_master WHERE type='table' and name not like ?";
        let tables = await this.getAsObjectArray(query1, ['sqlite%'])
        let returnstring = "{\"database\":[";
        tables.forEach(async row =>
        {
            returnstring = returnstring + "{\"table\": \"" + row.name + "\", \"tabledata\": ";
            const query2 = "SELECT * FROM " + row.name + ";"
            let content = this.database.exec(query2)
            returnstring = returnstring + JSON.stringify(content) + "},"
        });
        returnstring = returnstring.slice(0, -1) + "]}"
        return returnstring
    }

}