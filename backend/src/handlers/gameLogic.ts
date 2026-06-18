import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const GAMES_TABLE = process.env.GAMES_TABLE_NAME!;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE_NAME!;

if (!process.env.GAMES_TABLE_NAME || !process.env.CONNECTIONS_TABLE_NAME) {
  throw new Error("Missing required environment variables: GAMES_TABLE_NAME or CONNECTIONS_TABLE_NAME");
}

const getPublicRoom = (room: any) => {
  if (!room) return room;
  const publicRoom = { ...room };
  delete publicRoom.hostId; // Strip sensitive hostId
  if (publicRoom.players) {
    publicRoom.players = publicRoom.players.map((p: any) => {
      const { connectionId, ...publicPlayer } = p; // Strip sensitive connectionId
      return publicPlayer;
    });
  }
  return publicRoom;
};

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
      const safeName = (playerName || 'Host').substring(0, 15).replace(/[^a-zA-Z0-9 ]/g, "");
      const newRoom = {
        roomId: newRoomId,
        hostId: connectionId,
        gameMode: gameMode || 'race', // 'race', 'proximity', 'elimination'
        players: [{ connectionId, name: safeName, score: 0 }],
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

      await sendMessage(connectionId!, { type: 'roomCreated', room: getPublicRoom(newRoom) });

    } else if (action === 'joinRoom') {
      const { Item: room } = await docClient.send(new GetCommand({ TableName: GAMES_TABLE, Key: { roomId } }));
      if (!room) throw new Error('Room not found');
      if (room.status !== 'waiting') throw new Error('Game already started');

      const safeName = (playerName || 'Guest').substring(0, 15).replace(/[^a-zA-Z0-9 ]/g, "");
      const newPlayer = { connectionId, name: safeName, score: 0 };
      room.players.push(newPlayer);

      await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));
      await docClient.send(new UpdateCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: 'set roomId = :r',
        ExpressionAttributeValues: { ':r': roomId }
      }));

      for (const p of room.players) {
        await sendMessage(p.connectionId, { type: 'playerJoined', room: getPublicRoom(room) });
      }

    } else if (action === 'startGame') {
      const { Item: room } = await docClient.send(new GetCommand({ TableName: GAMES_TABLE, Key: { roomId } }));
      if (!room || room.hostId !== connectionId) throw new Error('Unauthorized');

      room.status = 'playing';
      if (gameMode) room.gameMode = gameMode; // Store selected mode!
      room.currentTurnIndex = 0;
      room.messages = [];

      // Assign target numbers
      if (room.gameMode === 'elimination') {
        room.roundTarget = Math.floor(Math.random() * 100) + 1;
        room.eliminated = [];
        room.roundGuesses = {};
      } else {
        const commonTarget = Math.floor(Math.random() * 100) + 1;
        room.players.forEach((p: any) => p.target = commonTarget);
      }

      await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));

      for (const p of room.players) {
        await sendMessage(p.connectionId, { type: 'gameStarted', room: getPublicRoom(room) });
      }

    } else if (action === 'returnToLobby') {
      const { Item: room } = await docClient.send(new GetCommand({ TableName: GAMES_TABLE, Key: { roomId } }));
      if (!room || room.hostId !== connectionId) throw new Error('Unauthorized');

      room.status = 'waiting';
      delete room.winner;
      room.messages = [];
      room.eliminated = [];
      room.roundGuesses = {};

      await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));

      for (const p of room.players) {
        await sendMessage(p.connectionId, { type: 'returnedToLobby', room: getPublicRoom(room) });
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
      if (isNaN(num)) {
        await sendMessage(connectionId!, { type: 'error', message: "Invalid guess! Must be a number." });
        return { statusCode: 200, body: 'Invalid guess' };
      }
      if (num < 1 || num > 100) {
        await sendMessage(connectionId!, { type: 'error', message: "Invalid guess! Must be between 1 and 100." });
        return { statusCode: 200, body: 'Out of range' };
      }

      if (room.gameMode === 'race') {
        if (num === player.target) {
          room.status = 'finished';
          room.winner = player.name;
          await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));
          for (const p of room.players) {
            await sendMessage(p.connectionId, { type: 'gameOver', winner: player.name, target: player.target });
          }
        } else {
          const hint = num < player.target ? 'higher' : 'lower';
          await sendMessage(connectionId!, { type: 'guessResult', hint });
        }
      } else if (room.gameMode === 'proximity') {
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
            await sendMessage(p.connectionId, { type: 'gameOver', winner: player.name, target: currentPlayer.target });
          }
        } else {
          const hint = num < currentPlayer.target ? 'higher' : 'lower';
          
          const diff = Math.abs(num - currentPlayer.target);
          let temp = '';
          if (diff <= 5) temp = '🌋 Boiling!';
          else if (diff <= 15) temp = '🔥 Hot!';
          else if (diff <= 30) temp = '☀️ Warm!';
          else if (diff <= 50) temp = '🧊 Cold!';
          else temp = '❄️ Freezing!';

          room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
          
          if (!room.messages) room.messages = [];
          room.messages.unshift({ nickname: player.name, message: `Guessed ${num} (${temp})` });
          if (room.messages.length > 20) room.messages.pop(); // keep last 20
          
          await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));
          
          for (const p of room.players) {
            await sendMessage(p.connectionId, { type: 'gameUpdated', room: getPublicRoom(room) });
          }
          await sendMessage(connectionId!, { type: 'guessResult', hint: temp, hintType: 'temperature' });
        }
      } else if (room.gameMode === 'elimination') {
        // ELIMINATION LOGIC
        if (!room.eliminated) room.eliminated = [];
        if (!room.roundGuesses) room.roundGuesses = {};

        if (room.eliminated.includes(player.name)) {
          await sendMessage(connectionId!, { type: 'error', message: "You are eliminated!" });
          return { statusCode: 200, body: 'Eliminated' };
        }

        if (room.roundGuesses[player.name] !== undefined) {
          await sendMessage(connectionId!, { type: 'error', message: "You already guessed this round!" });
          return { statusCode: 200, body: 'Already guessed' };
        }

        room.roundGuesses[player.name] = num;

        const activePlayers = room.players.filter((p: any) => !room.eliminated.includes(p.name));
        
        if (Object.keys(room.roundGuesses).length === activePlayers.length) {
          // Round is over
          const differences = activePlayers.map((p: any) => {
            const diff = Math.abs(room.roundGuesses[p.name] - room.roundTarget);
            return { name: p.name, diff, guess: room.roundGuesses[p.name] };
          });

          const maxDiff = Math.max(...differences.map((d: any) => d.diff));
          const furthestPlayers = differences.filter((d: any) => d.diff === maxDiff);

          const roundResults = {
            target: room.roundTarget,
            guesses: differences,
            eliminated: [] as string[],
            isTiebreaker: false
          };

          if (furthestPlayers.length === activePlayers.length && activePlayers.length > 1) {
            // Everyone tied! Tiebreaker!
            roundResults.isTiebreaker = true;
          } else {
            // Eliminate furthest
            roundResults.eliminated = furthestPlayers.map((p: any) => p.name);
            room.eliminated.push(...roundResults.eliminated);
          }

          const remainingPlayers = room.players.filter((p: any) => !room.eliminated.includes(p.name));

          if (remainingPlayers.length <= 1) {
            room.status = 'finished';
            room.winner = remainingPlayers.length === 1 ? remainingPlayers[0].name : "No one";
            await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));

            for (const p of room.players) {
              await sendMessage(p.connectionId, { type: 'roundEnded', room: getPublicRoom(room), roundResults });
              await sendMessage(p.connectionId, { type: 'gameOver', winner: room.winner, delay: 5000, target: room.roundTarget });
            }
          } else {
            // Start next round
            room.roundTarget = Math.floor(Math.random() * 100) + 1;
            room.roundGuesses = {};
            await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));
            
            for (const p of room.players) {
              await sendMessage(p.connectionId, { type: 'roundEnded', room: getPublicRoom(room), roundResults });
            }
          }
        } else {
          // Just update state that someone guessed
          await docClient.send(new PutCommand({ TableName: GAMES_TABLE, Item: room }));
          for (const p of room.players) {
            await sendMessage(p.connectionId, { type: 'gameUpdated', room: getPublicRoom(room) });
          }
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
