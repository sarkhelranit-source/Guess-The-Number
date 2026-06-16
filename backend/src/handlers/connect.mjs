import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE_NAME;

export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const eventType = event.requestContext.eventType;

  if (!connectionId) return { statusCode: 400, body: 'Missing connectionId' };

  try {
    if (eventType === 'CONNECT') {
      console.log('Client connected:', connectionId);
      await docClient.send(new PutCommand({
        TableName: CONNECTIONS_TABLE,
        Item: { connectionId, connectedAt: new Date().toISOString() }
      }));
    } else if (eventType === 'DISCONNECT') {
      console.log('Client disconnected:', connectionId);
      await docClient.send(new DeleteCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId }
      }));
    }
    return { statusCode: 200, body: 'Success' };
  } catch (error) {
    console.error('Connection error:', error);
    return { statusCode: 500, body: 'Internal server error.' };
  }
};
