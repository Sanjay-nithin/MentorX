import { useLocation } from 'react-router-dom';
import Particles from '../components/ui/Particles';
import { useParticles } from '../contexts/ParticlesContext';
import Header from '../components/LandingPage/Header/Header';
import ContactUs from '../components/LandingPage/ContactUs/ContactUs';
import Footer from '../components/LandingPage/Footer/Footer';

function Layout({ children }) {
  const { particlesEnabled } = useParticles();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="bg-black relative min-h-screen w-full pointer-events-auto">
      {/* Particles only on landing page */}
      {particlesEnabled && isLandingPage && (
        <div className="fixed inset-0 w-screen h-screen z-0 pointer-events-none">
          <Particles
            particleColors={['#ffffff', '#ffffff']}
            particleCount={300}
            particleSpread={10}
            speed={0.1}
            particleBaseSize={100}
            moveParticlesOnHover={false}
            particleHoverFactor={2}
            alphaParticles={true}
            disableRotation={false}
          />
        </div>
      )}

      {/* Page content layered above particles */}
      <div className="relative z-10 pointer-events-auto">
        {isLandingPage && <Header />}
        {children}
        {isLandingPage && (
          <>
            <ContactUs />
            <Footer />
          </>
        )}
      </div>
    </div>
  );
}

export default Layout;
