from pydantic import BaseModel
from apps.core.language import PostLanguage


class GenerateSEOKeywordsIn(BaseModel):
    blog_title: str
    blog_content: str
    language: PostLanguage | None = None

class GenerateSEOBlogMarkdownOut(BaseModel):
    blog_content: str
