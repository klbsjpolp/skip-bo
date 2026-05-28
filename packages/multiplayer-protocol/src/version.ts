// Bumped when the wire protocol changes in a backwards-incompatible way (new
// required action types, renamed fields, changed semantics). The server reads
// the client's reported version during auth and warns/rejects mismatched
// clients. Keep MIN_SUPPORTED_PROTOCOL_VERSION in sync with the oldest client
// build the server still accepts; pair bumps with PWA_MINIMUM_SUPPORTED_VERSION.
export const PROTOCOL_VERSION = 1;

export const MIN_SUPPORTED_PROTOCOL_VERSION = 1;

export const isProtocolVersionSupported = (clientVersion: number | undefined): boolean =>
  clientVersion === undefined || clientVersion >= MIN_SUPPORTED_PROTOCOL_VERSION;
