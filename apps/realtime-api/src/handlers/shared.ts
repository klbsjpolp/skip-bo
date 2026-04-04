import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { getApiEnvironment } from '../config/env.js';
import { DynamoConnectionRepository } from '../repositories/dynamoConnectionRepository.js';
import { DynamoRoomRepository } from '../repositories/dynamoRoomRepository.js';
import { ApiGatewayRealtimeBroadcaster } from '../services/broadcaster.js';

const environment = getApiEnvironment();
const dynamoClient = new DynamoDBClient({});

export const roomRepository = new DynamoRoomRepository(dynamoClient, environment.roomsTableName);
export const connectionRepository = new DynamoConnectionRepository(dynamoClient, environment.connectionsTableName);
export const broadcaster = new ApiGatewayRealtimeBroadcaster(environment.websocketManagementEndpoint);
export const websocketUrl = environment.websocketUrl;
