import './src/utils/polyfils';
import { AppRegistry } from 'react-native';
import App from './App';

console.log('[Index] Registering main component');

AppRegistry.registerComponent("main", () => App);
