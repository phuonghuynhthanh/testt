from pydantic import BaseModel


class GenerateSEOKeywordsIn(BaseModel):
    blog_title: str
    blog_content: str

class GenerateSEOBlogMarkdownOut(BaseModel):
    blog_content: str