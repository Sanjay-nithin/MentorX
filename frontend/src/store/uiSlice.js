import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  showProfile: false,
  showDashboard: false,
  showSignIn: false,
  showSignUp: false,
  lightRays: {
    enabled: true,
    raysOrigin: 'top-center',
    raysColor: '#ffffff',
    raysSpeed: 1,
    lightSpread: 1,
    rayLength: 2,
    pulsating: false,
    fadeDistance: 1.0,
    saturation: 1.0,
    followMouse: true,
    mouseInfluence: 0.1,
    noiseAmount: 0.0,
    distortion: 0.0,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openProfile: (state) => {
      state.showProfile = true;
      state.showDashboard = false;
    },
    closeProfile: (state) => {
      state.showProfile = false;
    },
    openDashboard: (state) => {
      state.showDashboard = true;
      state.showProfile = false;
    },
    closeDashboard: (state) => {
      state.showDashboard = false;
    },
    openSignIn: (state) => {
      state.showSignIn = true;
      state.showSignUp = false;
    },
    closeSignIn: (state) => {
      state.showSignIn = false;
    },
    openSignUp: (state) => {
      state.showSignUp = true;
      state.showSignIn = false;
    },
    closeSignUp: (state) => {
      state.showSignUp = false;
    },
    closeAllModals: (state) => {
      state.showSignIn = false;
      state.showSignUp = false;
    },
    updateLightRays: (state, action) => {
      state.lightRays = { ...state.lightRays, ...action.payload };
    },
    toggleLightRays: (state) => {
      state.lightRays.enabled = !state.lightRays.enabled;
    },
    setLightRaysColor: (state, action) => {
      state.lightRays.raysColor = action.payload;
    },
    setLightRaysOrigin: (state, action) => {
      state.lightRays.raysOrigin = action.payload;
    },
  },
});

export const {
  openProfile,
  closeProfile,
  openDashboard,
  closeDashboard,
  openSignIn,
  closeSignIn,
  openSignUp,
  closeSignUp,
  closeAllModals,
  updateLightRays,
  toggleLightRays,
  setLightRaysColor,
  setLightRaysOrigin,
} = uiSlice.actions;

export default uiSlice.reducer;
