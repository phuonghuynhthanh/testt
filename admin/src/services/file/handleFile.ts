import { IMAGE_URL } from "../../config/config";
import getAxiosClient from "../../lib/axios/axiosClient";

// Upload a blog image using the backend's folder query parameter.
export const uploadFileImage = async (file: File, link_post: string) => {
  try {
    const formData = new FormData();
    const axiosClient = getAxiosClient();
    formData.append("image", file);

    const response = await axiosClient.post("/media/image", formData, {
      params: { link_blog: link_post },
    });
    const img_url = `${IMAGE_URL}/${response.data}`;
    return img_url;
  } catch (error) {
    console.log(error);
    throw new Error("Lỗi khi tải lên tệp tin");
  }
};
