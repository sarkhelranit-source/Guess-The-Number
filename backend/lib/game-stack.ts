import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class GameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. DynamoDB Tables
    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const gamesTable = new dynamodb.Table(this, 'GamesTable', {
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. Lambda Functions (Using NodejsFunction to auto-bundle our local .ts files)
    const connectHandler = new NodejsFunction(this, 'ConnectHandlerFunction', {
      entry: path.join(__dirname, '../src/handlers/connect.ts'),
      runtime: new lambda.Runtime('nodejs24.x'),
      environment: {
        CONNECTIONS_TABLE_NAME: connectionsTable.tableName,
        GAMES_TABLE_NAME: gamesTable.tableName,
      },
    });

    const gameLogicHandler = new NodejsFunction(this, 'GameLogicHandlerFunction', {
      entry: path.join(__dirname, '../src/handlers/gameLogic.ts'),
      runtime: new lambda.Runtime('nodejs24.x'),
      environment: {
        CONNECTIONS_TABLE_NAME: connectionsTable.tableName,
        GAMES_TABLE_NAME: gamesTable.tableName,
      },
    });

    // Grant DynamoDB Permissions to Lambdas
    connectionsTable.grantReadWriteData(connectHandler);
    gamesTable.grantReadWriteData(connectHandler);
    connectionsTable.grantReadWriteData(gameLogicHandler);
    gamesTable.grantReadWriteData(gameLogicHandler);

    // 3. API Gateway WebSocket API
    const webSocketApi = new apigatewayv2.CfnApi(this, 'ApiGatewayV2Api', {
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
      name: 'GuessTheNumberWebSocket'
    });

    // Grant Lambdas permission to post back to the WebSocket API
    const apiGatewayPolicy = new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.ref}/*`],
    });
    connectHandler.addToRolePolicy(apiGatewayPolicy);
    gameLogicHandler.addToRolePolicy(apiGatewayPolicy);

    // 4. API Gateway Integrations
    const connectIntegration = new apigatewayv2.CfnIntegration(this, 'ConnectIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${connectHandler.functionArn}/invocations`,
    });

    const gameLogicIntegration = new apigatewayv2.CfnIntegration(this, 'GameLogicIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${gameLogicHandler.functionArn}/invocations`,
    });

    // 5. API Gateway Routes
    new apigatewayv2.CfnRoute(this, 'ConnectRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$connect',
      target: `integrations/${connectIntegration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, 'DisconnectRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$disconnect',
      target: `integrations/${connectIntegration.ref}`, // Connect handler handles both
    });

    new apigatewayv2.CfnRoute(this, 'DefaultRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$default',
      target: `integrations/${gameLogicIntegration.ref}`,
    });

    // 6. API Gateway Stage
    const apiStage = new apigatewayv2.CfnStage(this, 'ApiGatewayV2Stage', {
      stageName: 'production',
      apiId: webSocketApi.ref,
      autoDeploy: true,
    });

    // 7. Lambda Permissions (Allow API Gateway to invoke them)
    new lambda.CfnPermission(this, 'ConnectLambdaPermission', {
      action: 'lambda:InvokeFunction',
      functionName: connectHandler.functionArn,
      principal: 'apigateway.amazonaws.com',
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.ref}/*/*`,
    });

    new lambda.CfnPermission(this, 'GameLogicLambdaPermission', {
      action: 'lambda:InvokeFunction',
      functionName: gameLogicHandler.functionArn,
      principal: 'apigateway.amazonaws.com',
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.ref}/*/*`,
    });

    // Output the WebSocket URL to the terminal after deployment!
    new cdk.CfnOutput(this, 'WebSocketURL', {
      value: `wss://${webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/${apiStage.stageName}`,
      description: 'The WSS URL for the React frontend to connect to',
    });
  }
}
