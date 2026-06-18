import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE_NAME!;
const GAMES_TABLE = process.env.GAMES_TABLE_NAME!;

if (!process.env.GAMES_TABLE_NAME || !process.env.CONNECTIONS_TABLE_NAME) {
  throw new Error("Missing required environment variables: GAMES_TABLE_NAME or CONNECTIONS_TABLE_NAME");
}

const getPublicRoom = (room: any) => {
  if (!room) return room;
  const publicRoom = { ...room };
  delete publicRoom.hostId;
  if (publicRoom.players) {
    publicRoom.players = publicRoom.players.map((p: any) => {
      const { connectionId, ...publicPlayer } = p;
      return publicPlayer;
    });
  }
  return publicRoom;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const eventType = event.requestContext.eventType;
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const apiGateway = new ApiGatewayManagementApiClient({ endpoint });

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
      
      const { Item: connection } = await docClient.send(new GetCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId }
      }));

      if (connection && connection.roomId) {
        const roomId = connection.roomId;
        const { Item: room } = await docClient.send(new GetCommand({
          TableName: GAMES_TABLE,
          Key: { roomId }
        }));

        if (room) {
          const leavingPlayer = room.players.find((p: any) => p.connectionId === connectionId);
          room.players = room.players.filter((p: any) => p.connectionId !== connectionId);

          if (room.players.length === 0) {
            await docClient.send(new DeleteCommand({
              TableName: GAMES_TABLE,
              Key: { roomId }
            }));
          } else {
            if (room.hostId === connectionId) {
              room.hostId = room.players[0].connectionId;
            }

            await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));

            for (const p of room.players) {
              try {
                await apiGateway.send(new PostToConnectionCommand({
                  ConnectionId: p.connectionId,
                  Data: Buffer.from(JSON.stringify({ type: 'playerLeft', room: getPublicRoom(room), leftPlayer: leavingPlayer?.name }))
                }));
              } catch (e) {
                // Ignore stale connection errors
              }
            }
          }
        }
      }

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
