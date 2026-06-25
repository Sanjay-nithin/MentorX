import { createContext, useContext, useState } from 'react';

const ParticlesContext = createContext();

export const ParticlesProvider = ({ children }) => {
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  const toggleParticles = () => {
    setParticlesEnabled(prev => !prev);
  };

  const enableParticles = () => {
    setParticlesEnabled(true);
  };

  const disableParticles = () => {
    setParticlesEnabled(false);
  };

  return (
    <ParticlesContext.Provider 
      value={{ 
        particlesEnabled, 
        toggleParticles, 
        enableParticles, 
        disableParticles 
      }}
    >
      {children}
    </ParticlesContext.Provider>
  );
};

export const useParticles = () => {
  const context = useContext(ParticlesContext);
  if (!context) {
    throw new Error('useParticles must be used within a ParticlesProvider');
  }
  return context;
};
