import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Responses from '@aprendizap/aws-lambda-responses';
import { processChanges } from './processors/slicers';

export const api = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body || '{}');
  const { entry } = body;
  try {
    for (const item of entry) {
      const { id, changes } = item;
      if (changes) {
        console.log('changes', changes);
        await processChanges(changes, id);
      }
    }

    return Responses._200();
  } catch (error) {
    console.error('Error', error);
    return Responses._500();
  }
};
