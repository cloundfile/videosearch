import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import Transcribe from '@/screens/transcribe';
import { useState } from 'react';

export default function App() {
  const screma = useColorScheme();
  const theme = screma === 'dark' ?
    DarkTheme :
    DefaultTheme;
  const [url, setUrl] = useState('');
  return (
    <NavigationContainer theme={theme}>
      <Transcribe />
    </NavigationContainer>
  );
};