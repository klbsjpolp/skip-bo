const requireEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export interface ApiEnvironment {
  connectionsTableName: string;
  roomsTableName: string;
  websocketManagementEndpoint: string;
  websocketUrl: string;
}

export const getApiEnvironment = (): ApiEnvironment => ({
  connectionsTableName: requireEnv('CONNECTIONS_TABLE_NAME'),
  roomsTableName: requireEnv('ROOMS_TABLE_NAME'),
  websocketManagementEndpoint: requireEnv('WEBSOCKET_MANAGEMENT_ENDPOINT'),
  websocketUrl: requireEnv('WEBSOCKET_URL'),
});
