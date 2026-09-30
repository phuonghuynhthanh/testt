import re
import json
from typing import List

from apps.openai.schemas import GenerateSEOBlogMarkdownOut
from apps.openai.services.prompt import PromptService
from apps.openai.services.gemini_config import GeminiConfig


class GeminiAiService:

    async def get_prompt_completion(self, prompt: str) -> str:
        # Use Gemini API for completion
        system_prompt = "You are a helpful assistant."
        gemini_config = GeminiConfig()
        return await gemini_config.gemini_chat_completion(prompt, system_prompt)

    @classmethod
    async def generate_seo_keywords(cls, blog_title: str, blog_content: str):
        prompt = PromptService.prompt_seo_keywords(blog_title, blog_content)
        service = cls()
        result = await service.get_prompt_completion(prompt)

        try:
            match = re.search(r"\[.*?\]", result, re.DOTALL)
            if match:
                keywords = json.loads(match.group(0))
                if isinstance(keywords, list) and all(
                    isinstance(k, str) for k in keywords
                ):
                    return keywords
            raise ValueError("Invalid keyword format.")
        except Exception as e:
            raise ValueError(f"Error parsing keywords from Gemini: {e}")

    @classmethod
    async def generate_seo_description(cls, blog_title: str, blog_content: str) -> str:
        prompt = PromptService.prompt_seo_description(blog_title, blog_content)
        service = cls()
        return await service.get_prompt_completion(prompt)

    @classmethod
    async def generate_blog_markdown(cls, title: str) -> GenerateSEOBlogMarkdownOut:
        try:
            prompt = PromptService.prompt_blog_markdown(title)
            service = cls()
            markdown_content = await service.get_prompt_completion(prompt)

            return GenerateSEOBlogMarkdownOut(
                blog_content=markdown_content
            )
        except Exception as e:
            raise ValueError(f"Error generating blog HTML: {e}")

    @classmethod
    async def generate_list_title(cls, keyword: str, quantity: int, language: str) -> List[str]:
        try:
            trans_key = await cls().get_prompt_completion(f'Translate {keyword} to {language.lower()}')
            prompt = PromptService.prompt_get_list_title(keyword=trans_key, quantity=quantity, language=language)
            service = cls()
            list_title_str = await service.get_prompt_completion(prompt)
            
            # Clean the response string
            cleaned_str = list_title_str.strip()
            
            # Remove leading 'json' if present (case-insensitive)
            if cleaned_str.lower().startswith("json"):
                cleaned_str = cleaned_str[4:].strip()
            
            # Try to find JSON array in the response using regex
            json_match = re.search(r'\[.*?\]', cleaned_str, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                list_title = json.loads(json_str)
            else:
                # If no JSON array found, try to parse the entire cleaned string
                list_title = json.loads(cleaned_str)
            
            if not isinstance(list_title, list):
                raise ValueError("Model response is not a JSON array.")
            
            return list_title
        except Exception as e:
            raise ValueError(f"Error generating list title: {e}")

    @classmethod
    async def generate_seo_keywords_and_description(
        cls, blog_title: str, blog_content: str
    ) -> dict:
        try:
            # Use PromptService to generate the combined prompt
            prompt_data = PromptService.prompt_seo_keywords_and_description(
                blog_title, blog_content
            )

            openai_service = cls()
            completion = await openai_service.get_prompt_completion(
                prompt_data["keywords"] + "\n" + prompt_data["description"]
            )

            # Extract the JSON array for keywords
            json_match = re.search(r"\[.*?\]", completion, re.DOTALL)
            if not json_match:
                # Try to extract from code block if present
                code_block_match = re.search(
                    r"```(?:json)?\n(\[.*?\])\n```", completion, re.DOTALL
                )
                if code_block_match:
                    keywords_json = code_block_match.group(1)
                else:
                    raise ValueError(
                        f"No valid JSON array found in the completion. Raw response: {completion}"
                    )
            else:
                keywords_json = json_match.group(0)
            keywords = json.loads(keywords_json)
            if isinstance(keywords, list) and all(
                isinstance(keyword, str) for keyword in keywords
            ):
                # Extract the description text (after the JSON block)
                description_match = re.search(
                    r"\]\s*(```)?\s*(.*)", completion, re.DOTALL
                )
                if description_match:
                    raw_description = description_match.group(2).strip()
                    # Remove potential Markdown code block markers
                    description = re.sub(r"^```|```$", "", raw_description).strip()
                    return {"keywords": keywords, "description": description}
                else:
                    raise ValueError("Failed to extract description.")
            else:
                raise ValueError("The extracted JSON is not a valid string array.")

        except json.JSONDecodeError as e:
            raise ValueError(f"Error parsing JSON: {e}")
        except Exception as e:
            raise ValueError(f"Error generating SEO keywords and description: {e}")
    
    @classmethod
    async def generate_tag_base_on_title(cls, title: str) -> str:
        try:
            prompt = PromptService.prompt_get_tag(title=title)
            service = cls()
            tag = await service.get_prompt_completion(prompt)
            
            return tag
        except Exception as e:
            raise ValueError(f"Error generating tag base on title: {e}")