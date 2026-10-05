import openai

from config import settings


class GeminiConfig:
    # Request one bounded completion and release the asynchronous client afterwards.
    async def gemini_chat_completion(
        self, user_prompt: str, system_prompt: str, *, max_retries: int = 2
    ):
        if len(user_prompt) > 128000:
            raise ValueError("Gemini input is too long")
        async with openai.AsyncOpenAI(
            api_key=settings.GEMINI_API_KEY,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            timeout=30.0,
            max_retries=max_retries,
        ) as client:
            response = await client.chat.completions.create(
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
