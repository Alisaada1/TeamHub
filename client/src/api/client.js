import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use(async (config) => {
  try {
    if (window.Clerk?.session) {
      const token = await window.Clerk.session.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {}
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      console.error("Network error:", err.message);
    }
    if (err.response?.status >= 500) {
      console.error("Server error:", err.response.status, err.response.data?.error || err.message);
    }
    return Promise.reject(err);
  }
);

export default client;
