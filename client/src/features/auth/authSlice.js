import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  accessToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
    setAccessToken(state, action) {
      state.accessToken = action.payload;
    },
    setCredentials(state, action) {
      state.user = action.payload.user ?? state.user;
      state.accessToken = action.payload.accessToken ?? state.accessToken;
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const { setUser, setAccessToken, setCredentials, clearAuth } = authSlice.actions;
export default authSlice.reducer;

export const selectUser = (s) => s.auth.user;
export const selectAccessToken = (s) => s.auth.accessToken;
export const selectIsAuthenticated = (s) => !!s.auth.user && !!s.auth.accessToken;
export const selectIsAdmin = (s) => s.auth.user?.role === 'admin';
