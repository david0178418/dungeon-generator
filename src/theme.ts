import { createTheme } from '@mui/material/styles';
import { THEME_COLORS } from './constants';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: THEME_COLORS.PRIMARY,
    },
    secondary: {
      main: THEME_COLORS.SECONDARY,
    },
    background: {
      default: THEME_COLORS.BACKGROUND,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});