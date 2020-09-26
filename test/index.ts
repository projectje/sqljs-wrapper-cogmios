import * as path from 'path';
import * as fse from 'fs-extra';
import {DatabaseCore} from ".."

/**
 * Small test to test a wrapper around Sql.Js
 *
 */
async function test() {
  // define database location and schema location
  let database_uri = path.join(__dirname, '/test.db')
  let schema_query = await fse.readFile(path.join(__dirname, '/testschema.sqlite'), 'utf8')
  let instance = DatabaseCore.getInstance()
  console.log('x')

  // set these in instance
  instance.setLocation(database_uri);
  let initialized = await instance.init(schema_query);

  // open and do some test queries then close
  if (initialized === true) {
    await instance.open();

    let url = 'http://www.google.com';
    await instance.run(`INSERT INTO itemUrl (url) VALUES (?)`,[url]);
    url = 'http://www.microsoft.com';
    await instance.run(`INSERT INTO itemUrl (url) VALUES (?)`,[url]);

    let result1 = await instance.getAsObjectArray(`SELECT * from itemUrl where id > ?` , [0])
    console.log(result1)
    console.log('---')
    let result2 = await instance.getAsObject(`SELECT * from itemUrl where id > ?` , [0])
    console.log(result2)
    console.log('---')
    let result3 = await instance.getDbDumpAsJson()
    console.log(result3)
    console.log('---')
    await instance.close();
    let backupfilename = await instance.backup()
    console.log(backupfilename)
  }
}

/**
 * non singleton
 */
async function test2() {
  // define database location and schema location
  let database_uri = path.join(__dirname, '/test.db')
  let schema_query = await fse.readFile(path.join(__dirname, '/testschema.sqlite'), 'utf8')
  let instance = DatabaseCore.getInstance()

  // set these in instance
  instance.setLocation(database_uri);
  let initialized = await instance.init(schema_query);

  // open and do some test queries then close
  if (initialized === true) {
    await instance.open();

    let url = 'http://www.google.com';
    await instance.run(`INSERT INTO itemUrl (url) VALUES (?)`,[url]);
    url = 'http://www.microsoft.com';
    await instance.run(`INSERT INTO itemUrl (url) VALUES (?)`,[url]);
    let result1 = await instance.getAsObjectArray(`SELECT * from itemUrl where id > ?` , [0])
    console.log(result1)
    console.log('---')
    let result2 = await instance.getAsObject(`SELECT * from itemUrl where id > ?` , [0])
    console.log(result2)
    console.log('---')
    let json = await instance.getDbDumpAsJson()
    console.log(json)
    console.log('---')
    await instance.close();
  }
}

/**
 * run test 3 with an old database and a new schema to
 */
async function test3()
{
  let instance = DatabaseCore.getInstance()
  let database_uri = path.join(__dirname, '/test.db')
  instance.setLocation(database_uri);
  await instance.open();
  let schema_query = await fse.readFile(path.join(__dirname, '/testschema.sqlite'), 'utf8')
  let query = await instance.delta(schema_query)
  console.log(query)
  await instance.close();
}

test();
test2();
test3();