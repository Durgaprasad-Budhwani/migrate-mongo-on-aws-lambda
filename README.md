
## Automate MongoDB schema version control and migration with AWS Lambda and migrate-mongo

It’s very time-consuming when multiple developers are developing code and need to run multiple migrations scripts files across multiple databases. To maintain environment integrity and consistency across applications, code, schema changes, and database indexes must sync across multiple non-production and production environments.

In this post, we explain how you can set up [migrate-mongo](https://github.com/seppevs/migrate-mongo) along with an [AWS Lambda](https://aws.amazon.com/lambda/) function to deploy Migration scripts into various [Mongo DB](https://www.mongodb.com/) environments. You can deploy quickly and do continuous deployment when code is merged or a continuous deployment pipeline has been triggered. You can do schema versioning, add collection indexes, and migrate from your sandbox to development, QA, and production, or add it to any other environment in your software development lifecycle.

## migrate-mongo Overview:

[migrate-mongo](https://github.com/seppevs/migrate-mongo) is an open-source database migration tool for MongoDB running in Node.js. In [migrate-mongo](https://github.com/seppevs/migrate-mongo), all changes to the database are called *migrations*. Migrations can be versioned or repeatable. You can use a versioned migration to create, alter, or drop an object. Sometimes they’re used to correct reference data. With the help of [migrate-mongo](https://github.com/seppevs/migrate-mongo), you can also undo or roll back migrations.

## Solution overview

In this solution, we will use GitHub Action to invoke lambda, and lambda will run a migrations script to MongoDB Database.

The following diagram illustrates the solution architecture.

![](https://cdn-images-1.medium.com/max/3402/1*x-jI-fc9SrSMP9F33YeIug.png)

## Prerequisites

To get started, you must have the following prerequisites:

* Two MongoDB database instances to test and deploy scripts in one environment and, after successful completion, deploy that into another environment. You can use [Mongo Atlas Cloud](https://www.mongodb.com/cloud) too.

* [AWS Account](https://portal.aws.amazon.com/) with Lambda creation access

* [GitHub](https://github.com/) Account for Source Control and for running GitHub Actions

* [Node Installation](https://nodejs.org/en/download/)

* [AWS CLI ](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)Configure

* [VSCode](https://code.visualstudio.com/) or[ Any Jetbrains Development IDE ](https://www.jetbrains.com/webstorm/)(For this post, I will be using WebStorm IDE)

## Setting up migrate-mongo:

* Install migrate-mongo globally

  npm install -g migrate-mongo

* Initialized migrate-mongo

  migrate-mongo init

This will create migrate-mongo-config.js file.

<iframe src="https://medium.com/media/5c844006286cccf93410f34b82332e80" frameborder=0></iframe>

As per the project requirements, we need to change the database name **databaseName **and **url**

We can take this information from environment variables like below code snippet

    const {
      DB_NAME,
      CONNECTION_STRING,
    } = process.env;
    
    .....
    
    url: CONNECTION_STRING,
    databaseName: DB_NAME,

The complete code will look something like this:

<iframe src="https://medium.com/media/013a34b2ec4427a1692bf773f324691c" frameborder=0></iframe>

* Create a dummy migration file

  migrate-mongo create dummy

This will add a migration file to the migrations folder

![](https://cdn-images-1.medium.com/max/2000/1*08VBr537L-77njwJdhDrsA.png)

This content will be like this:

<iframe src="https://medium.com/media/8bdd24ce5281ab885d32415fe9ee479e" frameborder=0></iframe>

We need to write migration in up function and we can write rollback statements in down function.

We can put basic insert and delete operations like:

<iframe src="https://medium.com/media/136cc1bf530e5cf2eb39d4c8a09b9214" frameborder=0></iframe>

To test it locally, we need to run mongodb server locally and need to set the environment variables like

    export DB_NAME="local"
    export CONNECTION_STRING="mongodb://localhost:27017"

And then migrate-mongo up command, this will run the dummy migration:

![](https://cdn-images-1.medium.com/max/2000/1*SBPXthqnbUYdxlx8iPYMqg.png)

And this is going to create two collections in Mongo Database, albums (this is a dummy collection and changelog this is migrate-mongo collection for maintaining the history and for rollback to the previous version.

![](https://cdn-images-1.medium.com/max/2000/1*iyiFsVW2hmw2E64CXBacOQ.png)

The changelog collection content will look like this:

![](https://cdn-images-1.medium.com/max/2834/1*skY2tdVmrZPq1wdBA_kQOw.png)

It has a timestamp and which file has been migrated information.

## Working with AWS Lambda:

We need to perform the following steps:

* For AWS Lambda, first install migrate-mongo locally by running a command

  npm install migrate-mongo

*  We need to create an AWS Lambda handler; for this, let’s create a new index.js file.

<iframe src="https://medium.com/media/448236368f01a92663ba8e17b6a1d8dc" frameborder=0></iframe>

* Import migrate-mongo in the index.js file

  const {
  database,
  config,
  up,
  } = require('migrate-mongo');

* Import existing migrate-mongo-config.js file

  const migrateMongoConfig = require("./migrate-mongo-config.js");

* Set the configuration in the AWS Lambda Handler

<iframe src="https://medium.com/media/923ebfc01574127b30c3cb7d7d6bc827" frameborder=0></iframe>

* Connect with Database

  onst { db, client } = await database.connect();

* Add migration up code:

  const migratedFiles = await up(db, client);
  migratedFiles.forEach(fileName => console.log('Migrated:', fileName));

* Close the DB Connection:

  await client.close();

**Full Code:**

<iframe src="https://medium.com/media/2843d0ad40990ba8da92a2e01b407896" frameborder=0></iframe>

## AWS CDK Deployment:

For deployment, we will use AWS Cloud Development Kit (CDK).
We need to perform the following steps:

* Install AWS CDK:

  npm install -g aws-cdk

* Create an empty directory deploy and navigate to that directory

  mkdir deploy && cd deploy

* Initialized AWS CDK with typescript or javascript

  cdk init app --language=typescript

After successful installation, you will see lots of files in deploy the folder:

![](https://cdn-images-1.medium.com/max/2000/1*WHQTVxM_5mrCcqg3_LOwEg.png)

* Open deploy/bin/deploy.ts file

* Add the environment variable from the process and change the name of the stack from DeployStack

  import 'source-map-support/register';
  import * as cdk from 'aws-cdk-lib';
  import { DeployStack } from '../lib/deploy-stack';

  const app = new cdk.App();

  // add environment variable here
  const { ENV } = process.env;

  // change the name of stack here
  new DeployStack(app, `${ENV}-Migrate`, {

  });

* Open deploy/lib/deploy-stack.ts file and import NodeJs function:

  import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

* Add environment variables like ENV, CONNECTION_STRING and DB_NAME

  const {ENV, CONNECTION_STRING, DB_NAME} = process.env;

* Inside the DeployStack function, we need to add NodeJFunction code:

  new NodejsFunction(
  this,
  "migration-handler-sls",
  {
  // The path to the directory containing project config files
  projectRoot: path.join(__dirname, `../../`),
  // The path to the dependencies lock file (yarn.lock or package-lock.json).
  // This will be used as the source for the volume mounted in the Docker container.
  // Modules specified in nodeModules will be installed using the right installer (npm or yarn) along with this lock file
  depsLockFilePath: path.join(__dirname, `../../package-lock.json`),
  // Key-value pairs that Lambda caches and makes available for your Lambda functions.
  // Use environment variables to apply configuration changes,
  // such as test and production environment configurations, without changing your Lambda function source code.
  environment: {
  ENV: ENV!,
  CONNECTION_STRING: CONNECTION_STRING!,
  DB_NAME: DB_NAME!,
  },
  bundling: {
  // A list of modules that should be installed instead of bundled.
  // Modules are installed in a Lambda compatible environment only when bundling runs in Docker.
  nodeModules: ["migrate-mongo"],
  minify: true,
  sourceMap: true,
  commandHooks: {
  afterBundling(inputDir: string, outputDir: string): string[] {
  return [
  ];
  },
  beforeInstall(inputDir: string, outputDir: string): string[] {
  return [];
  },
  // Returns commands to run before bundling.
  beforeBundling(inputDir: string, outputDir: string): string[] {
  return [`cp -r ${path.join(inputDir, `migrations`)} ${outputDir}`];
  }
  }
  },
  // The amount of memory, in MB, that is allocated to your Lambda function.
  // Lambda uses this value to proportionally allocate the amount of CPU power.
  memorySize: 128,
  functionName: `${ENV}-migration-handler-sls`,
  timeout: Duration.minutes(15),
  runtime: Runtime.NODEJS_16_X,
  // The name of the exported handler in the entry file.
  handler: "handler",
  // Path to the entry file (JavaScript or TypeScript).
  // If the NodejsFunction is defined in stack.ts with my-handler as id (new NodejsFunction(this, 'my-handler')),
  // the construct will look at stack.my-handler.ts and stack.my-handler.js.
  entry: path.join(__dirname, `../../index.js`),
  }
  );

The CDK framework will bundle the code as a part of the synthesizer process. The complete code for deployment:

<iframe src="https://medium.com/media/bdb6e50bd276cd0243475fc338d1f536" frameborder=0></iframe>

For Deploying to any environment, we need to run the following commands:

    export DB_NAME="<db_name>"
    export CONNECTION_STRING="<mongodb_connection_string>" 
    export ENV="<name_of_environmnt>"
    cdk synth
    cdk deploy

* After deployment, we can test it locally by login to AWS Console and Navigate to the newly created lambda `**<environment_name>-migration-handler-sls` **and clicking on Test button as shown below

![](https://cdn-images-1.medium.com/max/3426/1*QzMhX_m6l6YPRgnD4O77yA.png)

This will run the migration as shown below:

![](https://cdn-images-1.medium.com/max/3272/1*Bczi7JbR4V1o55MFVJAdwQ.png)

## Limitations

The Lambda function has a [time limit](https://aws.amazon.com/about-aws/whats-new/2018/10/aws-lambda-supports-functions-that-can-run-up-to-15-minutes/) of 15 minutes. For bigger deployments with lots of database changes, we recommend taking a manual approach.

## Cleanup

For clean-up, you can use cdk destroy the command that will delete the CloudFormation stack.

## Source Code

For source code, please refer to the [link](https://github.com/Durgaprasad-Budhwani/migrate-mongo-on-aws-lambda)

## Conclusion

In this post, we provided a solution to address version control of database changes and automate the deployment to various environments using a Lambda function and AWS CDK. migate-mongo helps to automate schema versioning and track all your Mongo Migration changes. With a few configuration changes, we can deploy the same migrations scripts to another database. 
