import axios from "axios";
import { API_SERVICES } from "../../config/config";

interface ILoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

// Exchange CMS credentials for the backend access-token contract.
export const handleLogin = async (
  userName: string,
  userPassword: string,
): Promise<ILoginResponse> => {
  try {
    const response = await axios.post<ILoginResponse>(
      `${API_SERVICES}/auth/login`,
      {
        username: userName,
        password: userPassword,
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Không thể đăng nhập");
    }
    throw error;
  }
};
