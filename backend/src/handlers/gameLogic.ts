import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const GAMES_TABLE = process.env.GAMES_TABLE_NAME!;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const apiGateway = new ApiGatewayManagementApiClient({ endpoint });

  if (!event.body) return { statusCode: 400, body: 'Missing body' };
  
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { action, roomId, playerName, guess, gameMode } = payload;

  const sendMessage = async (connId: string, data: any) => {
    try {
      await apiGateway.send(new PostToConnectionCommand({
        ConnectionId: connId,
        Data: Buffer.from(JSON.stringify(data))
      }));
    } catch(e: any) {
      if (e.$metadata?.httpStatusCode === 410) {
        // connection is stale
      }
    }
  };

  try {
    if (action === 'createRoom') {
      const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newRoom = {
        roomId: newRoomId,
        hostId: connectionId,
        gameMode: gameMode || 'race', // 'race', 'turn-based', 'elimination'
        players: [{ connectionId, name: playerName || 'Host', score: 0 }],
        status: 'waiting', // waiting, playing, finished
      };
      await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: newRoom }));
      
      // Update connection with roomId
      await docClient.send(new UpdateCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: 'set roomId = :r',
        ExpressionAttributeValues: { ':r': newRoomId }
      }));

      await sendMessage(connectionId!, { type: 'roomCreated', room: newRoom });

    } else if (action === 'joinRoom') {
      const { Item: room } = await docClient.send(new GetCommand({ TableName: GAMES_TABLE, Key: { roomId } }));
      if (!room) throw new Error('Room not found');
      if (room.status !== 'waiting') throw new Error('Game already started');

      const newPlayer = { connectionId, name: playerName || 'Guest', score: 0 };
      room.players.push(newPlayer);

      await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));
      await docClient.send(new UpdateCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: 'set roomId = :r',
        ExpressionAttributeValues: { ':r': roomId }
      }));

      // Broadcast to all
      for (const p of room.players) {
        await sendMessage(p.connectionId, { type: 'playerJoined', room });
      }

    } else if (action === 'startGame') {
      const { Item: room } = await docClient.send(new GetCommand({ TableName: GAMES_TABLE, Key: { roomId } }));
      if (!room || room.hostId !== connectionId) throw new Error('Unauthorized');

      room.status = 'playing';
      // Assign target numbers
      room.players.forEach((p: any) => p.target = Math.floor(Math.random() * 100) + 1);
      room.currentTurnIndex = 0;

      await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));

      for (const p of room.players) {
        await sendMessage(p.connectionId, { type: 'gameStarted', room });
      }

    } else if (action === 'guess') {
      const { Item: room } = await docClient.send(new GetCommand({ TableName: GAMES_TABLE, Key: { roomId } }));
      if (!room || room.status !== 'playing') throw new Error('Game not active');

      const player = room.players.find((p: any) => p.connectionId === connectionId);
      if (!player) throw new Error('Player not in room');

      const num = parseInt(guess);

      if (room.gameMode === 'race') {
        if (num === player.target) {
          room.status = 'finished';
          room.winner = player.name;
          await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));
          for (const p of room.players) {
            await sendMessage(p.connectionId, { type: 'gameOver', winner: player.name });
          }
        } else {
          const hint = num < player.target ? 'higher' : 'lower';
          await sendMessage(connectionId!, { type: 'guessResult', hint });
        }
      }
      // Note: Turn-Based and Elimination logic to be expanded...
    }

    return { statusCode: 200, body: 'Processed' };
  } catch (error: any) {
    console.error('Logic error:', error);
    await sendMessage(connectionId!, { type: 'error', message: error.message });
    return { statusCode: 200, body: 'Error processed' }; 
  }
};
