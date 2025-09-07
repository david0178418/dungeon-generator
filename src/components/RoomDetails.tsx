import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Room, DungeonMap, ExitDirection, ConnectionType } from '../types';

interface RoomDetailsProps {
  room: Room | null;
  dungeonMap: DungeonMap | null;
}

export const RoomDetails: React.FC<RoomDetailsProps> = ({ room, dungeonMap }) => {
  if (!room) {
    return (
      <Paper elevation={3} sx={{ p: 3, height: 400 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary',
          }}
        >
          Select a room to view details
        </Box>
      </Paper>
    );
  }

  const getDirectionIcon = (direction: ExitDirection): string => {
    switch (direction) {
      case ExitDirection.North: return '↑';
      case ExitDirection.South: return '↓';
      case ExitDirection.East: return '→';
      case ExitDirection.West: return '←';
      case ExitDirection.Northeast: return '↗';
      case ExitDirection.Northwest: return '↖';
      case ExitDirection.Southeast: return '↘';
      case ExitDirection.Southwest: return '↙';
      default: return '?';
    }
  };

  const getConnectionTypeColor = (type: ConnectionType): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (type) {
      case ConnectionType.Door: return 'primary';
      case ConnectionType.Archway: return 'info';
      case ConnectionType.Corridor: return 'default';
      case ConnectionType.SecretDoor: return 'warning';
      default: return 'default';
    }
  };

  const formatRoomShape = (shape: string): string => {
    return shape.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatRoomSize = (size: string): string => {
    return size.charAt(0).toUpperCase() + size.slice(1);
  };

  // Find connected rooms through corridors
  const connectedRooms = dungeonMap ? 
    room.connectionPoints
      .filter(cp => cp.isConnected)
      .map(cp => {
        // Find the corridor or room connected to this point
        const connectedElement = dungeonMap.corridors.find(corridor => 
          corridor.connectionPoints.some(corridorCp => 
            Math.abs(corridorCp.position.x - cp.position.x) < 1 &&
            Math.abs(corridorCp.position.y - cp.position.y) < 1
          )
        );
        return { corridor: connectedElement };
      })
      .filter(item => item.corridor) : [];

  return (
    <Paper elevation={3} sx={{ p: 3, height: 400, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Room Details
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Room ID: {room.id.split('-')[1]?.slice(0, 8) || 'Unknown'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip 
          label={`Shape: ${formatRoomShape(room.shape)}`}
          variant="outlined"
          size="small"
        />
        <Chip 
          label={`Size: ${formatRoomSize(room.size)}`}
          variant="outlined"
          size="small"
          color="primary"
        />
      </Box>

      <Typography variant="body2" gutterBottom>
        <strong>Dimensions:</strong> {room.width} × {room.height} grid squares
      </Typography>
      
      <Typography variant="body2" gutterBottom>
        <strong>Grid Position:</strong> ({Math.round(room.position.x)}, {Math.round(room.position.y)})
      </Typography>
      
      <Typography variant="body2" gutterBottom sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
        <strong>Graph Paper:</strong> Top-left corner at ({Math.round(room.position.x)}, {Math.round(room.position.y)}), 
        extends to ({Math.round(room.position.x + room.width - 1)}, {Math.round(room.position.y + room.height - 1)})
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Connection Points ({room.connectionPoints.length})
      </Typography>
      
      {room.connectionPoints.length > 0 ? (
        <List dense>
          {room.connectionPoints.map((cp, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{getDirectionIcon(cp.direction)}</span>
                    <span>{formatRoomShape(cp.direction)}</span>
                    <Chip
                      label={cp.isConnected ? 'Connected' : 'Open'}
                      size="small"
                      color={cp.isConnected ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={`Position: (${Math.round(cp.position.x)}, ${Math.round(cp.position.y)})`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No connection points
        </Typography>
      )}

      {connectedRooms.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Connected Corridors ({connectedRooms.length})
          </Typography>
          <List dense>
            {connectedRooms.map(({ corridor }, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemText
                  primary={`Corridor ${corridor!.id.split('-')[1]?.slice(0, 8) || 'Unknown'}`}
                  secondary={
                    <Chip
                      label={formatRoomShape(corridor!.type)}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {room.description && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Description
          </Typography>
          <Typography variant="body2">
            {room.description}
          </Typography>
        </>
      )}
    </Paper>
  );
};