import axios from "axios";

const defaultApiUrl = import.meta.env.DEV
  ? "http://localhost:3000"
  : "https://habit-tracker-backend-t7h7.onrender.com";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
