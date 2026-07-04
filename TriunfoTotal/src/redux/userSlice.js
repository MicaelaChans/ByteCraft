import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: null,
  reducers: {
    login(state, action) {
      return action.payload;
    },
    logout() {
      return null;
    },
    updateProfile(state, action) {
      return { ...state, ...action.payload };
    },
  },
});

const { actions, reducer } = userSlice;
export const { login, logout, updateProfile } = actions;
export default reducer;