import { API_SERVICES, IMAGE_URL } from "../../config/config";
import getAxiosClient from "../../lib/axios/axiosClient";

export const uploadFileImage = async (file: File, link_post: string) => {
  try {
    const formData = new FormData();
    const axiosClient = getAxiosClient();
    formData.append("image", file);

    const response = await axiosClient.post(
      `${API_SERVICES}/media/image?link_post=${link_post}`,
      formData,
    );
    const img_url = `${IMAGE_URL}/${response.data}`;
    return img_url;
  } catch (error) {
    console.log(error);
    throw new Error("Error uploading file");
  }
};
