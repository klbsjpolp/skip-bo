// Bumped when the wire protocol changes in a backwards-incompatible way (new
// required message types, renamed fields, changed semantics). The server reads
// the client's reported version during auth and rejects mismatched clients
// with HTTP 426. Keep MIN_SUPPORTED_PROTOCOL_VERSION in sync with the oldest
// client build the server still accepts; pair bumps with
// PWA_MINIMUM_SUPPORTED_VERSION.
//
// v2 introduces the host-authoritative relay protocol (relay/setTurn/snapshot/
// endGame messages) and removes the server-authoritative `action`/`snapshot`
// flow. It is intentionally incompatible with v1 clients.
export const PROTOCOL_VERSION = 2;

export const MIN_SUPPORTED_PROTOCOL_VERSION = 2;

// Clients that omit `protocolVersion` predate the field entirely (v1). Since the
// relay protocol is a hard break, absent-field clients are rejected.
export const ASSUMED_LEGACY_PROTOCOL_VERSION = 1;

export const isProtocolVersionSupported = (clientVersion: number | undefined): boolean =>
  (clientVersion ?? ASSUMED_LEGACY_PROTOCOL_VERSION) >= MIN_SUPPORTED_PROTOCOL_VERSION;
