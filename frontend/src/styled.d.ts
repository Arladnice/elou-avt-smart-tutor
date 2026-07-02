import 'styled-components';
import { ScadaThemeType } from './styles/theme';

declare module 'styled-components' {
  export interface DefaultTheme extends ScadaThemeType {}
}
