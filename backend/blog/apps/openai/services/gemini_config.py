import openai

from fastapi import HTTPException, status

from config import settings


class GeminiConfig:
    async def gemini_chat_completion(self, user_prompt: str, system_prompt: str):
        self.api_key = settings.GEMINI_API_KEY
        try:
            if len(user_prompt) > 128000:
                raise

            client = openai.OpenAI(
                api_key=self.api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )

            response = client.chat.completions.create(
                model=settings.GEMINI_MODEL,
                n=1,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {"role": "user", "content": user_prompt},
                ],
            )

            raw_output = response.choices[0].message.content

            if not raw_output:
                raise ValueError("No output from Gemini")

            return raw_output
        except openai.OpenAIError as e:
            raise e
        except HTTPException as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thêm API key Gemini thất bại",
            )
        except Exception as e:
            raise e
