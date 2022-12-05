const {
    database,
    config,
    up,
} = require('migrate-mongo');

const migrateMongoConfig = require("./migrate-mongo-config.js");

const handler = async (event, context) => {
    // context will be null if running locally
    if (context) {
        // Make sure to add this so you can re-use `conn` between function calls.
        // See https://www.mongodb.com/blog/post/serverless-development-with-nodejs-aws-lambda-mongodb-atlas
        context.callbackWaitsForEmptyEventLoop = false;
    }

    // configuration for migrate-mongo
    config.set(migrateMongoConfig);

    const { db, client } = await database.connect();
    const migratedFiles = await up(db, client);
    migratedFiles.forEach(fileName => console.log('Migrated:', fileName));

    await client.close();
}

module.exports = { handler }

