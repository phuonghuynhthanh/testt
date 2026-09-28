import axios from "axios";
import { API_SERVICES } from "../../config/config";

interface ILoginResponse {
  token: string;
  roles: string[];
}
export const handleLogin = async (
  userName: string,
  userPassword: string,
): Promise<ILoginResponse> => {
  try {
    const response = await axios.post<ILoginResponse>(
      `${API_SERVICES}/account/login`,
      {
        username: userName,
        password: userPassword,
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get login");
  }
};
