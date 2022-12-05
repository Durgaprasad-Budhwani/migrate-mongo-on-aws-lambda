import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as path from "path";
import {Duration} from "aws-cdk-lib";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

const {ENV, CONNECTION_STRING, DB_NAME} = process.env;

export class DeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
            afterBundling(): string[] {
             return [
                ];
            },
            beforeInstall(): string[] {
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
  }
}
