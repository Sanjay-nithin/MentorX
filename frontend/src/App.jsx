import Layout from './layout/Layout';
import LandingPage from './pages/LandingPage/LandingPage';
import { ParticlesProvider } from './contexts/ParticlesContext';
import './App.css';

function App() {

  return (
    <ParticlesProvider>
      <Layout>
        <LandingPage />
      </Layout>
    </ParticlesProvider>
  );
}

export default App;
