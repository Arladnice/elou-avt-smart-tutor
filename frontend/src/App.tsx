import { ThemeProvider } from 'styled-components';
import { scadaTheme } from './styles/theme';
import { GlobalStyle } from './styles/globalStyles';
import { SimulatorProvider } from './context/SimulatorContext';
import DashboardLayout from './components/DashboardLayout';

function App() {
  return (
    <ThemeProvider theme={scadaTheme}>
      <GlobalStyle theme={scadaTheme} />
      <SimulatorProvider>
        <DashboardLayout />
      </SimulatorProvider>
    </ThemeProvider>
  );
}

export default App;
