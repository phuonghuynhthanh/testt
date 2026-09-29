import axios, { type AxiosInstance } from "axios";
import { API_SERVICES } from "../../config/config";
import { clearAuthSession, getAuthSession } from "../cookies/handleCookie";

// Create a backend client that always uses the active CMS JWT.
const getAxiosClient = (): AxiosInstance => {
  const session = getAuthSession();
  const client = axios.create({
    baseURL: API_SERVICES,
    headers: {
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
  });
  client.interceptors.response.use(undefined, (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      clearAuthSession();
      window.location.assign("/login");
    }
    return Promise.reject(error);
  });
  return client;
};
export default getAxiosClient;
