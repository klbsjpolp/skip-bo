import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import type { ServerMessage } from '@skipbo/multiplayer-protocol';

export interface RealtimeBroadcaster {
  send(connectionId: string, message: ServerMessage): Promise<void>;
}

export class ApiGatewayRealtimeBroadcaster implements RealtimeBroadcaster {
  private readonly client: ApiGatewayManagementApiClient;

  constructor(endpoint: string) {
    this.client = new ApiGatewayManagementApiClient({ endpoint });
  }

  async send(connectionId: string, message: ServerMessage): Promise<void> {
    await this.client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(message)),
    }));
  }
}
