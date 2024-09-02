'use strict';

import { APIGatewayProxyEvent } from 'aws-lambda';

export const api = async (event: APIGatewayProxyEvent) => {
  const queryParams = event.queryStringParameters;
  return {
    statusCode: 200,
    body: queryParams['hub.challenge'],
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  };
};
