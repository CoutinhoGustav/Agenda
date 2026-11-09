import { LogBox } from 'react-native';

LogBox.ignoreLogs([
 'expo-notifications: Android Push notifications',
 '`expo-notifications` functionality is not fully supported in Expo Go',
 'SafeAreaView has been deprecated'
]);

if (__DEV__) {
 const origError = console.error;
 console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('expo-notifications: Android Push notifications')) {
   return;
  }
  origError(...args);
 };

 const origWarn = console.warn;
 console.warn = (...args: any[]) => {
  if (
   typeof args[0] === 'string' &&
   (args[0].includes('expo-notifications') ||
    args[0].includes('NativeViewManagerAdapter') ||
    args[0].includes('SafeAreaView'))
  ) {
   return;
  }
  origWarn(...args);
 };
}
