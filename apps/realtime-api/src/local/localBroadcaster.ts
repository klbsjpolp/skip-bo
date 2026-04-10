import WebSocket from 'ws';

import type { ServerMessage } from '@skipbo/multiplayer-protocol';

import type { RealtimeBroadcaster } from '../services/broadcaster.js';

const createGoneException = (): Error & {
  $metadata: { httpStatusCode: number };
  name: string;
} => Object.assign(new Error('connection closed'), {
  $metadata: { httpStatusCode: 410 },
  name: 'GoneException',
});

export class LocalRealtimeBroadcaster implements RealtimeBroadcaster {
  private readonly sockets = new Map<string, WebSocket>();

  attach(connectionId: string, socket: WebSocket): void {
    this.sockets.set(connectionId, socket);
  }

  detach(connectionId: string): void {
    this.sockets.delete(connectionId);
  }

  async send(connectionId: string, message: ServerMessage): Promise<void> {
    const socket = this.sockets.get(connectionId);

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw createGoneException();
    }

    await new Promise<void>((resolve, reject) => {
      socket.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}
