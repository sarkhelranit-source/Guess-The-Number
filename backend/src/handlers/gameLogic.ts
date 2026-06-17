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
      } else {
        console.error(`Failed to send message to ${connId}`, e);
      }
    }
  };

  try {
    if (action === 'createRoom') {
      const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newRoom = {
        roomId: newRoomId,
        hostId: connectionId,
        gameMode: gameMode || 'race', // 'race', 'standard', 'elimination'
        players: [{ connectionId, name: playerName || 'Host', score: 0 }],
        status: 'waiting', // waiting, playing, finished
        messages: [],
      };
      await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: newRoom }));
      
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

      for (const p of room.players) {
        await sendMessage(p.connectionId, { type: 'playerJoined', room });
      }

    } else if (action === 'startGame') {
      const { Item: room } = await docClient.send(new GetCommand({ TableName: GAMES_TABLE, Key: { roomId } }));
      if (!room || room.hostId !== connectionId) throw new Error('Unauthorized');

      room.status = 'playing';
      if (gameMode) room.gameMode = gameMode; // Store selected mode!
      room.currentTurnIndex = 0;
      room.messages = [];

      // Assign target numbers
      const commonTarget = Math.floor(Math.random() * 100) + 1;
      room.players.forEach((p: any) => p.target = commonTarget);

      await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));

      for (const p of room.players) {
        await sendMessage(p.connectionId, { type: 'gameStarted', room });
      }

    } else if (action === 'returnToLobby') {
      const { Item: room } = await docClient.send(new GetCommand({ TableName: GAMES_TABLE, Key: { roomId } }));
      if (!room || room.hostId !== connectionId) throw new Error('Unauthorized');

      room.status = 'waiting';
      delete room.winner;
      room.messages = [];

      await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));

      for (const p of room.players) {
        await sendMessage(p.connectionId, { type: 'returnedToLobby', room });
      }

    } else if (action === 'rematchRequest') {
      const { Item: room } = await docClient.send(new GetCommand({ TableName: GAMES_TABLE, Key: { roomId } }));
      if (!room) throw new Error('Room not found');

      const host = room.players.find((p: any) => p.connectionId === room.hostId);
      if (host) {
        await sendMessage(host.connectionId, { type: 'rematchRequested', playerName });
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
      } else if (room.gameMode === 'standard') {
        // TURN BASED LOGIC
        const currentPlayer = room.players[room.currentTurnIndex];
        if (currentPlayer.connectionId !== connectionId) {
          await sendMessage(connectionId!, { type: 'error', message: "It's not your turn!" });
          return { statusCode: 200, body: 'Not turn' };
        }

        if (num === currentPlayer.target) {
          room.status = 'finished';
          room.winner = player.name;
          await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));
          for (const p of room.players) {
            await sendMessage(p.connectionId, { type: 'gameOver', winner: player.name });
          }
        } else {
          const hint = num < currentPlayer.target ? 'higher' : 'lower';
          room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
          
          if (!room.messages) room.messages = [];
          room.messages.unshift({ nickname: player.name, message: `Guessed ${num} (too ${hint === 'higher' ? 'low' : 'high'})` });
          if (room.messages.length > 20) room.messages.pop(); // keep last 20
          
          await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));
          
          for (const p of room.players) {
            await sendMessage(p.connectionId, { type: 'gameUpdated', room });
          }
          await sendMessage(connectionId!, { type: 'guessResult', hint });
        }
      }
    }

    return { statusCode: 200, body: 'Processed' };
  } catch (error: any) {
    console.error('Logic error:', error);
    await sendMessage(connectionId!, { type: 'error', message: error.message });
    return { statusCode: 200, body: 'Error processed' }; 
  }
};
