import axios, { type AxiosInstance } from "axios";
import { getGoogleLoginCookies } from "../cookies/handleCookie";

const getAxiosClient = (): AxiosInstance => {
  const cookies = getGoogleLoginCookies();
  if (!cookies) {
    console.log("no token");
  }

  return axios.create({
    headers: {
      Authorization: `Bearer ${cookies?.token}`,
      //skip ngrok
      "ngrok-skip-browser-warning": "true",
    },
  });
};
export default getAxiosClient;
