import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { ThemeProvider } from 'styled-components';
import { scadaTheme } from './styles/theme';
import { GlobalStyle } from './styles/globalStyles';
import { SimulatorProvider, useSimulator } from './context/SimulatorContext';
import DashboardLayout from './components/DashboardLayout';
import Login from './components/Login';
import InstructorDashboard from './components/InstructorDashboard';
import ScoreCard from './components/ScoreCard';

const RootRouter: React.FC = () => {
  const { username, role } = useSimulator();

  // Маршрутизация на основе авторизации
  if (!username) {
    return <Login />;
  }

  if (role === 'instructor') {
    return <InstructorDashboard />;
  }

  // Для роли operator рендерим SCADA панель + ScoreCard
  return (
    <>
      <DashboardLayout />
      <ScoreCard />
    </>
  );
};

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgElevated: '#111620',
          colorBgContainer: '#141b27',
          colorBorder: '#222c3e',
          colorText: '#e1e7f0',
          colorTextHeading: '#e1e7f0',
          colorPrimary: '#00e5ff',
        }
      }}
    >
      <AntdApp>
        <ThemeProvider theme={scadaTheme}>
          <GlobalStyle theme={scadaTheme} />
          <SimulatorProvider>
            <RootRouter />
          </SimulatorProvider>
        </ThemeProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
