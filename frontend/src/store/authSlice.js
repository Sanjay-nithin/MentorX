import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoggedIn: false,
  currentUser: null,
  accessToken: null,
  refreshToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.isLoggedIn = true;
      state.currentUser = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      // Persist user
      try {
        localStorage.setItem('mx_user', JSON.stringify(action.payload.user));
      } catch (e) {
        console.error('Failed to persist user:', e);
      }
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.currentUser = null;
      state.accessToken = null;
      state.refreshToken = null;
      // Clear persisted user
      localStorage.removeItem('mx_user');
    },
    updateUser: (state, action) => {
      state.currentUser = action.payload;
      // Persist updated user
      try {
        localStorage.setItem('mx_user', JSON.stringify(action.payload));
      } catch (e) {
        console.error('Failed to persist user:', e);
      }
    },
    setTokens: (state, action) => {
      state.accessToken = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
    },
    initializeAuth: (state, action) => {
      state.isLoggedIn = action.payload.isLoggedIn;
      state.currentUser = action.payload.currentUser;
    },
  },
});

export const { loginSuccess, logout, updateUser, setTokens, initializeAuth } = authSlice.actions;
export default authSlice.reducer;
