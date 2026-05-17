import { Platform } from 'react-native';

export const shadows = {
  paper: Platform.select({
    ios: { shadowColor: '#6C5A4E', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 2 },
  }),
  card: Platform.select({
    ios: { shadowColor: '#6C5A4E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 14 },
    android: { elevation: 4 },
  }),
  fab: Platform.select({
    ios: { shadowColor: '#F47D8E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 14 },
    android: { elevation: 8 },
  }),
};
