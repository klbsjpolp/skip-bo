import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

import type { ConnectionRecord, ConnectionRepository } from './types.js';

export class DynamoConnectionRepository implements ConnectionRepository {
  private readonly client: DynamoDBDocumentClient;

  constructor(
    dynamoClient: DynamoDBClient,
    private readonly tableName: string,
    private readonly roomCodeIndexName = 'roomCode-index',
  ) {
    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  async delete(connectionId: string): Promise<void> {
    await this.client.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { connectionId },
    }));
  }

  async get(connectionId: string): Promise<ConnectionRecord | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { connectionId },
    }));

    return (result.Item as ConnectionRecord | undefined) ?? null;
  }

  async listByRoomCode(roomCode: string): Promise<ConnectionRecord[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: this.roomCodeIndexName,
      KeyConditionExpression: 'roomCode = :roomCode',
      ExpressionAttributeValues: {
        ':roomCode': roomCode,
      },
    }));

    return (result.Items as ConnectionRecord[] | undefined) ?? [];
  }

  async put(record: ConnectionRecord): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: record,
    }));
  }
}
