import 'styled-components';
import { ScadaThemeType } from './theme';

declare module 'styled-components' {
  export interface DefaultTheme extends ScadaThemeType {}
}
