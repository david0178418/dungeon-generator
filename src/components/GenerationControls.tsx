import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import { GenerationSettings } from '../types';
import { GENERATION_LIMITS } from '../constants';

interface GenerationControlsProps {
  onGenerate: (settings: GenerationSettings) => void;
  onReset: () => void;
  onExport: () => void;
  isGenerating: boolean;
  hasMap: boolean;
  initialSettings: GenerationSettings;
}

export const GenerationControls: React.FC<GenerationControlsProps> = ({
  onGenerate,
  onReset,
  onExport,
  isGenerating,
  hasMap,
  initialSettings,
}) => {
  const [settings, setSettings] = useState<GenerationSettings>(initialSettings);

  const handleSettingChange = <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = () => {
    onGenerate(settings);
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Dungeon Generator
      </Typography>
      
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
        gap: 2 
      }}>
        <TextField
          label="Minimum Rooms"
          type="number"
          value={settings.minRooms}
          onChange={(e) => handleSettingChange('minRooms', parseInt(e.target.value) || 1)}
          inputProps={{ min: GENERATION_LIMITS.MIN_ROOMS_LIMIT, max: GENERATION_LIMITS.MAX_ROOMS_LIMIT }}
          fullWidth
          size="small"
        />
        
        <TextField
          label="Maximum Rooms"
          type="number"
          value={settings.maxRooms}
          onChange={(e) => handleSettingChange('maxRooms', parseInt(e.target.value) || 1)}
          inputProps={{ min: GENERATION_LIMITS.MIN_ROOMS_LIMIT, max: GENERATION_LIMITS.MAX_ROOMS_LIMIT }}
          fullWidth
          size="small"
        />
        
        <TextField
          label="Grid Size"
          type="number"
          value={settings.gridSize}
          onChange={(e) => handleSettingChange('gridSize', parseInt(e.target.value) || 20)}
          inputProps={{ min: GENERATION_LIMITS.MIN_GRID_SIZE, max: GENERATION_LIMITS.MAX_GRID_SIZE }}
          fullWidth
          size="small"
          helperText="Grid squares (20-50)"
        />
        
        <TextField
          label="Room Spacing"
          type="number"
          value={settings.roomSpacing}
          onChange={(e) => handleSettingChange('roomSpacing', parseInt(e.target.value) || 1)}
          inputProps={{ min: GENERATION_LIMITS.MIN_ROOM_SPACING, max: GENERATION_LIMITS.MAX_ROOM_SPACING }}
          fullWidth
          size="small"
          helperText="Grid squares between rooms"
        />
        
        <TextField
          label="Max Exits per Room"
          type="number"
          value={settings.maxExitsPerRoom}
          onChange={(e) => handleSettingChange('maxExitsPerRoom', parseInt(e.target.value) || 1)}
          inputProps={{ min: GENERATION_LIMITS.MIN_ROOMS_LIMIT, max: GENERATION_LIMITS.MAX_EXITS_LIMIT }}
          fullWidth
          size="small"
        />
        
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerate}
          disabled={isGenerating}
          size="large"
        >
          {isGenerating ? 'Generating...' : 'Generate Dungeon'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={onReset}
          disabled={!hasMap || isGenerating}
        >
          Reset
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={onExport}
          disabled={!hasMap || isGenerating}
        >
          Export JSON
        </Button>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          📝 <strong>Graph Paper Instructions:</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
          • Each room is positioned on exact grid coordinates<br/>
          • Grid numbers help you place rooms accurately<br/>
          • Use 1 square = 5 feet for standard D&D scale<br/>
          • Light lines show individual squares, dark lines mark every 5 squares
        </Typography>
      </Box>
    </Paper>
  );
};