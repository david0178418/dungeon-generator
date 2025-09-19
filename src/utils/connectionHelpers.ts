import { ConnectionPoint } from '../types';

/**
 * Determines if a connection point is connected to another element.
 * A connection point is considered connected if it has a connectedElementId.
 */
export function isConnectionPointConnected(cp: ConnectionPoint): boolean {
  return !!cp.connectedElementId;
}

/**
 * Connects a connection point to another element by setting its connectedElementId.
 */
export function connectConnectionPoint(cp: ConnectionPoint, elementId: string): void {
  cp.connectedElementId = elementId;
}

/**
 * Disconnects a connection point by clearing its connectedElementId.
 */
export function disconnectConnectionPoint(cp: ConnectionPoint): void {
  cp.connectedElementId = undefined;
}