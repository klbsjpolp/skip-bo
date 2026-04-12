import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

import { RoomVersionConflictError, type RoomRecord, type RoomRepository } from './types.js';

export class DynamoRoomRepository implements RoomRepository {
  private readonly client: DynamoDBDocumentClient;

  constructor(
    dynamoClient: DynamoDBClient,
    private readonly tableName: string,
  ) {
    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  async create(room: RoomRecord): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: room,
      ConditionExpression: 'attribute_not_exists(roomCode)',
    }));
  }

  async get(roomCode: string): Promise<RoomRecord | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { roomCode },
    }));

    return (result.Item as RoomRecord | undefined) ?? null;
  }

  async update(room: RoomRecord, expectedVersion?: number): Promise<void> {
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: room,
        ...(expectedVersion === undefined
          ? {}
          : {
              ConditionExpression: 'version = :expectedVersion',
              ExpressionAttributeValues: {
                ':expectedVersion': expectedVersion,
              },
            }),
      }));
    } catch (error) {
      if (
        expectedVersion !== undefined &&
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        throw new RoomVersionConflictError(room.roomCode);
      }

      throw error;
    }
  }
}
