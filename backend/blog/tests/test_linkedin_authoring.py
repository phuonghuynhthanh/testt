"""Offline checks for LinkedIn authoring and historical migration."""

import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine, text

from apps.blogs.schemas import GenerateBlogData
from apps.blogs.services.blog import BlogServices
from apps.linkedin_posts.models import LinkedInPost
from apps.linkedin_posts.schemas import (
    IndependentDraftRequest,
    LinkedInPostCreate,
    LinkedInPostUpdate,
    LinkedInPreviewRequest,
    TopicProposalRequest,
    LinkedInArticleSource,
    LinkedInMode,
    FactualReview,
)
from apps.linkedin_posts.services.generator import LinkedInDraftGenerator
from apps.linkedin_posts.services.posts import LinkedInPostService
from apps.publications.schemas import (
    DraftRequest,
    PublicationUpdate,
    LinkedInCommandRequest,
)
from apps.publications.services import PublicationService
from apps.publications.migrations import retire_comment_links
from apps.openai.services.prompt import PromptService
from tests.test_linkedin_posts import generated_post
from tests.test_content_lifecycle import post_state


# Compose current authoring text without using generated hashtag metadata.
@pytest.mark.parametrize(
    "content",
    [
        "Nội dung\n\n#VietQuant #AI",
        "Nội dung #AI trong câu\n\n#VietQuant\n#Systems",
        "Nội dung #AI trong câu\n\n#VietQuant, #AI\n#Systems; #Quant",
        "Nội dung\n\n#VietQuant，#AI；#Systems",
        "Nội dung",
        "Nội dung\n\n#VietQuant\n\n"
        "Tìm hiểu thêm về VietQuant:\nhttps://example.com",
        "Nội dung\nhttps://example.com\n\n#VietQuant",
        "Nội dung\n\n#VietQuant\nhttps://example.com",
        "Nội dung\n\n#VietQuant\nhttps://example.com/",
    ],
)
def test_link_precedes_hashtag_tail_without_mutating_storage(content):
    post = post_state(content=content, link_placement="IN_POST")
    rendered = LinkedInPostService._publish_content(
        post, "https://example.com"
    )
    assert rendered.count("https://example.com") == 1
    if "#VietQuant" in content:
        assert rendered.index("https://example.com") < rendered.index(
            "#VietQuant"
        )
    if "#AI trong câu" in content:
        assert "#AI trong câu" in rendered
    assert post.content == content
    assert (
        LinkedInPostService._publish_content(
            post_state(content=rendered, link_placement="IN_POST"),
            "https://example.com",
        )
        == rendered
    )


# Preserve inline links while distinguishing URLs with a shared prefix.
def test_inline_link_and_similar_url():
    post = post_state(
        content="Đọc https://example.com để biết thêm.\n\n#VietQuant",
        link_placement="IN_POST",
    )
    assert (
        LinkedInPostService._publish_content(post, "https://example.com")
        == post.content
    )
    post.content = "Đọc (https://example.com/) để biết thêm.\n\n#VietQuant"
    assert (
        LinkedInPostService._publish_content(post, "https://example.com")
        == post.content
    )
    post.content = "Đọc https://example.com/other\n\n#VietQuant"
    assert (
        "Tìm hiểu thêm về VietQuant:\nhttps://example.com\n\n#VietQuant"
        in LinkedInPostService._publish_content(post, "https://example.com")
    )


# Compare full URL tokens rather than matching hostname or path prefixes.
@pytest.mark.parametrize(
    "url",
    [
        "https://example.com.vn",
        "https://example.com.evil/path",
        "https://example.com/other",
        "https://example.com/article.extra",
        "https://example.com?query=1",
        "https://example.com#section",
    ],
)
def test_similar_urls_do_not_suppress_target_link(url):
    content = f"Đọc {url}\n\n#VietQuant, #AI"
    post = post_state(content=content, link_placement="IN_POST")
    rendered = LinkedInPostService._publish_content(
        post, "https://example.com"
    )
    assert url in rendered
    assert (
        "Tìm hiểu thêm về VietQuant:\nhttps://example.com\n\n#VietQuant, #AI"
        in rendered
    )
    assert post.content == content


# Recognize exact inline targets with punctuation and balanced URL brackets.
@pytest.mark.parametrize(
    "url",
    [
        "https://example.com.",
        "(https://example.com/).",
        "[https://example.com]",
        "https://example.com/reference/Function_(mathematics)",
        "(https://example.com/reference/Function_(mathematics)).",
    ],
)
def test_exact_inline_urls_remain_unchanged(url):
    target = (
        "https://example.com/reference/Function_(mathematics)"
        if "Function_" in url
        else "https://example.com"
    )
    post = post_state(
        content=f"Đọc {url}\n\n#VietQuant", link_placement="IN_POST"
    )
    assert LinkedInPostService._publish_content(post, target) == post.content


# Compose both preview sources without persistence or provider construction.
@pytest.mark.parametrize("language", ["vietnamese", "english"])
def test_preview_matches_publish_and_is_side_effect_free(
    monkeypatch, language
):
    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://example.com/")
    monkeypatch.setattr(
        LinkedInPost,
        "create",
        lambda **_: pytest.fail("preview must not save"),
    )
    monkeypatch.setattr(
        LinkedInPost,
        "update",
        lambda *_, **kwargs: pytest.fail("preview must not update"),
    )
    monkeypatch.setattr(
        "apps.linkedin_posts.services.posts.OrganizationPublisher",
        lambda *_: pytest.fail("preview must not call LinkedIn"),
    )
    monkeypatch.setattr(
        PublicationService,
        "_blog",
        classmethod(lambda cls, _: SimpleNamespace(link_post="latency")),
    )
    monkeypatch.setattr(
        PublicationService,
        "_find_publication",
        classmethod(lambda cls, _: None),
    )
    monkeypatch.setattr(
        PublicationService,
        "_publication",
        classmethod(
            lambda cls, _: pytest.fail("preview must not create association")
        ),
    )
    request = LinkedInPreviewRequest(
        content="Nội dung\n\n#VietQuant",
        linkPlacement="IN_POST",
        language=language,
    )
    for result, source, url in [
        (
            LinkedInPostService.preview(request),
            "CUSTOM",
            "https://example.com",
        ),
        (
            PublicationService.preview("blog-1", request),
            "BLOG_ADAPTATION",
            "https://example.com/blog/latency",
        ),
    ]:
        post = post_state(
            content=request.content,
            source_type=source,
            link_placement="IN_POST",
            generation={"language": language},
        )
        assert result == {
            "content": LinkedInPostService._publish_content(post, url),
            "targetUrl": url,
        }
        assert url in result["content"]
        if language == "english":
            assert "Đọc bài đầy đủ" not in result["content"]
            assert "Tìm hiểu thêm" not in result["content"]


# Require a configured domain only when attaching a link.
def test_preview_missing_domain_and_no_link(monkeypatch):
    monkeypatch.setattr("config.settings.DOMAIN_URL", "")
    assert LinkedInPostService.preview(
        LinkedInPreviewRequest(content="Copy")
    ) == {"content": "Copy", "targetUrl": None}
    with pytest.raises(HTTPException) as error:
        LinkedInPostService.preview(
            LinkedInPreviewRequest(content="Copy", linkPlacement="IN_POST")
        )
    assert error.value.status_code == 422


# Reject the retired placement at every request boundary.
@pytest.mark.parametrize(
    "schema,payload,key",
    [
        (LinkedInPostCreate, {"content": "Copy"}, "linkPlacement"),
        (LinkedInPostUpdate, {}, "linkPlacement"),
        (LinkedInPreviewRequest, {}, "linkPlacement"),
        (DraftRequest, {"mode": "SUMMARY"}, "linkPlacement"),
        (
            LinkedInCommandRequest,
            {"mode": "SUMMARY", "content": "Copy"},
            "linkPlacement",
        ),
        (
            PublicationUpdate,
            {"publishWeb": True, "publishLinkedin": True},
            "linkedinLinkPlacement",
        ),
    ],
)
def test_first_comment_is_rejected(schema, payload, key):
    with pytest.raises(ValidationError):
        schema(**payload, **{key: "FIRST_COMMENT"})


# Validate supported languages and preserve Vietnamese defaults.
@pytest.mark.parametrize(
    "schema,payload",
    [
        (GenerateBlogData, {"title": "Tiêu đề", "category": "TECH"}),
        (IndependentDraftRequest, {"topic": "Topic"}),
        (TopicProposalRequest, {}),
        (DraftRequest, {"mode": "SUMMARY"}),
        (LinkedInPreviewRequest, {}),
    ],
)
def test_language_defaults_and_validation(schema, payload):
    assert schema(**payload).language == "vietnamese"
    assert schema(**payload, language="english").language == "english"
    with pytest.raises(ValidationError):
        schema(**payload, language="french")


# Preserve the entered title while passing language to copy and metadata.
@pytest.mark.parametrize("language", ["vietnamese", "english"])
def test_blog_generation_passes_language_without_translating_title(
    monkeypatch, language
):
    calls = []

    # Capture the language used for article generation.
    async def markdown(title, language):
        calls.append(language)
        return SimpleNamespace(blog_content="Generated copy")

    # Capture the language used for SEO generation.
    async def seo(title, content, language):
        calls.append(language)
        return {"description": "Description", "keywords": ["Keyword"]}

    # Capture the language used for generated tags.
    async def tag(title, language):
        calls.append(language)
        return "Tag"

    monkeypatch.setattr(
        "apps.blogs.services.blog.GeminiAiService.generate_blog_markdown",
        markdown,
    )
    monkeypatch.setattr(
        "apps.blogs.services.blog.GeminiAiService."
        "generate_seo_keywords_and_description",
        seo,
    )
    monkeypatch.setattr(
        "apps.blogs.services.blog.GeminiAiService.generate_tag_base_on_title",
        tag,
    )
    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://example.com")
    result = asyncio.run(
        BlogServices.ai_generate_blog_markdown_with_title(
            "Tiêu đề", "TECH", language
        )
    )
    assert result["title"] == "Tiêu đề"
    assert result["seo"]["title"] == "Tiêu đề"
    assert calls == [language] * 3
    assert (
        f"Write all generated copy in {language}"
        in PromptService.prompt_blog_markdown("Tiêu đề", language)
    )
    for prompt in PromptService.prompt_seo_keywords_and_description(
        "Tiêu đề", "Copy", language
    ).values():
        assert f"Write all generated copy in {language}" in prompt
        if language == "english":
            assert "generate the keywords in Vietnamese" not in prompt


# Override the source language in both LinkedIn generation flows.
@pytest.mark.parametrize("language", ["vietnamese", "english"])
@pytest.mark.parametrize("mode", ["independent", "summary"])
def test_linkedin_language_reaches_generator(language, mode):
    class Provider:
        # Capture prompts while returning a valid language-specific draft.
        async def generate(self, system, prompt):
            assert f"Write all generated copy in {language}" in system
            assert f"Write all generated copy in {language}" in prompt
            content = (
                "Production differs from tests.\n\n"
                "Join VietQuant to explore more."
                if language == "english"
                else "Production khác test.\n\nCùng VietQuant tìm hiểu thêm."
            )
            return generated_post(content=content)

        # Keep factual review independent and offline.
        async def review(self, post):
            return FactualReview(
                requiresHumanFactCheck=False, factCheckNotes=[]
            )

    generator = LinkedInDraftGenerator(Provider())
    source = LinkedInArticleSource(
        title="Tiêu đề",
        content="Trusted copy",
        category="TECH",
        mode=LinkedInMode.SUMMARY,
    )
    result = asyncio.run(
        generator.independent(
            source.title, source.content, None, "none", [], language
        )
        if mode == "independent"
        else generator.summary(source, language)
    )
    assert result.content.endswith("#VietQuant #Systems")


# Hide retired response fields while preserving stored historical values.
def test_historical_comment_is_not_exposed_or_modified():
    post = post_state(
        link_placement="FIRST_COMMENT",
        status="PUBLISHED",
        link_comment_status="FAILED",
    )
    serialized = LinkedInPostService.serialize(post)
    assert serialized["linkPlacement"] == "NONE"
    assert not any("Comment" in key for key in serialized)
    assert post.link_placement == "FIRST_COMMENT"
    assert post.link_comment_status == "FAILED"


# Migrate twice while preserving in-flight, uncertain and published history.
def test_comment_migration_is_idempotent_and_preserves_history():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE linkedin_posts (id TEXT, link_placement TEXT, "
                "status TEXT, provider_post_id TEXT, link_comment_status TEXT)"
            )
        )
        connection.execute(
            text(
                "CREATE TABLE post_publications (linkedin_record_id TEXT, "
                "linkedin_link_placement TEXT, linkedin_status TEXT, "
                "linkedin_post_id TEXT, linkedin_include_web_link BOOLEAN)"
            )
        )
        for index, status in enumerate(
            [
                "DRAFT",
                "READY",
                "FAILED",
                "PUBLISHING",
                "REVIEW_REQUIRED",
                "PUBLISHED",
            ]
        ):
            connection.execute(
                text(
                    "INSERT INTO linkedin_posts VALUES "
                    "(:id, 'FIRST_COMMENT', :status, NULL, 'FAILED')"
                ),
                {"id": str(index), "status": status},
            )
            connection.execute(
                text(
                    "INSERT INTO post_publications VALUES "
                    "(:id, 'FIRST_COMMENT', :status, NULL, FALSE)"
                ),
                {"id": str(index), "status": status},
            )
        connection.execute(
            text(
                "INSERT INTO linkedin_posts VALUES "
                "('known', 'FIRST_COMMENT', 'FAILED', "
                "'urn:li:share:1', 'FAILED')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO post_publications VALUES "
                "(NULL, 'FIRST_COMMENT', 'NOT_SELECTED', NULL, FALSE)"
            )
        )
    retire_comment_links(engine)
    retire_comment_links(engine)
    with engine.connect() as connection:
        rows = (
            connection.execute(text("SELECT * FROM linkedin_posts"))
            .mappings()
            .all()
        )
        assert [row["link_placement"] for row in rows] == ["IN_POST"] * 3 + [
            "FIRST_COMMENT"
        ] * 4
        assert all(row["link_comment_status"] == "FAILED" for row in rows)
        assert (
            connection.execute(
                text(
                    "SELECT COUNT(*) FROM post_publications "
                    "WHERE linkedin_link_placement = 'IN_POST'"
                )
            ).scalar()
            == 4
        )
    engine.dispose()
