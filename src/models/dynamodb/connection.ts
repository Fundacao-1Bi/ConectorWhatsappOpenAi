import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

require('dotenv').config();
const enviroment = process.env.IS_LOCAL
  ? {
      region: 'localhost',
      endpoint: 'http://localhost:8000',
    }
  : { region: 'us-east-1' };

const client = new DynamoDBClient(enviroment);
const dynamoDb = DynamoDBDocument.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export default dynamoDb;
