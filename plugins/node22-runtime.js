'use strict';

// Serverless 3.40 predates Lambda Node22. Extend only its runtime enum, keeping
// configuration validation strict. Remove when upgrading to a framework with
// native nodejs22.x schema support.
module.exports = class Node22Runtime {
  constructor(serverless) {
    const runtime = serverless.configSchemaHandler.schema.definitions.awsLambdaRuntime;
    if (!runtime || !Array.isArray(runtime.enum)) {
      throw new Error('Unexpected Serverless AWS runtime schema; review Node22 compatibility');
    }
    serverless.configSchemaHandler.defineProvider('aws', {
      definitions: {
        awsLambdaRuntime: { ...runtime, enum: [...new Set([...runtime.enum, 'nodejs22.x'])] },
      },
    });
  }
};
