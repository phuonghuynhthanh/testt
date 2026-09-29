import asyncio
import math
import re
import time
from datetime import datetime
from typing import List, Tuple
from urllib.parse import urlencode, urlparse

import httpx
import trafilatura
from fastapi import HTTPException, status

from apps.blogs import schemas
from config import settings


class ReferenceSearchService:
    """
    Service để tìm kiếm và phân loại link tham khảo.

    Lưu ý:
    - Hàm _fetch_serp_results hiện tại chỉ là stub, cần được
      implement tích hợp thực với SERP provider (SerpAPI / Google CSE).
    """

    @classmethod
    async def search_references(
        cls,
        payload: schemas.SearchReferencesRequest,
    ) -> List[schemas.LinkReference]:
        """
        Tìm kiếm link tham khảo từ keyword và keywords phụ, sau đó phân loại kết quả.
        """
        # Tạo danh sách keywords để search (keyword chính + keywords phụ)
        keywords_to_search = [payload.keyword]
        if payload.keywords:
            keywords_to_search.extend(payload.keywords)

        # Tính số kết quả mỗi keyword (chia đều)
        max_results = payload.max_results or 20
        results_per_keyword = max(1, max_results // len(keywords_to_search))

        all_links: List[schemas.LinkReference] = []
        seen_urls: set[str] = set()  # Để deduplicate

        # Search từng keyword
        for keyword in keywords_to_search:
            if len(all_links) >= max_results:
                break

            # Gọi SERP API cho keyword này
            raw_results = await cls._fetch_serp_results(
                keyword=keyword,
                language=payload.language or "vietnamese",
                max_results=results_per_keyword,
            )

            # Phân loại và thêm vào danh sách
            for item in raw_results:
                if len(all_links) >= max_results:
                    break

                url = item.get("url") or ""
                title = item.get("title") or ""
                snippet = item.get("snippet") or ""

                if not url:
                    continue

                # Deduplicate theo URL
                if url in seen_urls:
                    continue
                seen_urls.add(url)

                domain = cls._extract_domain(url)
                is_ad, _ = cls._detect_ads(url, title, snippet)
                is_spam, _ = cls._detect_spam(url, domain, title or snippet)

                # Map category sang tag
                if is_ad:
                    tag = "ADS"
                elif is_spam:
                    tag = "SPAM"
                else:
                    tag = "NORMAL"

                # Bỏ qua theo flag filter
                if payload.exclude_ads and tag == "ADS":
                    continue
                if payload.exclude_spam and tag == "SPAM":
                    continue

                all_links.append(
                    schemas.LinkReference(
                        title=title,
                        url=url,
                        tag=tag,  # type: ignore[arg-type]
                    )
                )

        return all_links[:max_results]

    @classmethod
    async def classify_links(
        cls,
        payload: schemas.ClassifyLinksRequest,
    ) -> schemas.ClassifyLinksResponse:
        """
        Phân loại danh sách link đã có.
        """
        items = payload.links

        # Tạo map để phát hiện duplicate theo canonical url (normalized)
        normalized_map: dict[str, str] = {}
        classified: List[schemas.ClassifiedLink] = []

        for link in items:
            url = link.url
            title = link.title or ""
            snippet = link.snippet or ""
            domain = cls._extract_domain(url)

            is_ad, ad_score = cls._detect_ads(url, title, snippet)
            is_spam, spam_score = cls._detect_spam(url, domain, title or snippet)

            normalized = cls._normalize_url(url)
            duplicate_of = normalized_map.get(normalized)
            is_duplicate = duplicate_of is not None

            if is_duplicate:
                category = "duplicate"
                confidence = 0.95
                reason = f"Duplicate of {duplicate_of}"
            elif is_ad:
                category = "ad"
                confidence = ad_score
                reason = "Detected as advertisement link"
            elif is_spam:
                category = "spam"
                confidence = spam_score
                reason = "Detected as spam link"
            else:
                category = "organic"
                confidence = 0.8
                reason = "No spam/ads/duplicate signals detected"

            if not is_duplicate:
                normalized_map[normalized] = url

            metadata = {
                "is_duplicate": is_duplicate,
                "duplicate_of": duplicate_of,
                "spam_score": spam_score,
                "ad_score": ad_score,
                "domain": domain,
            }

            classified.append(
                schemas.ClassifiedLink(
                    url=url,
                    category=category,  # type: ignore[arg-type]
                    confidence=confidence,
                    reason=reason,
                    metadata=metadata,
                )
            )

        summary = {
            "total": len(classified),
            "organic": sum(1 for c in classified if c.category == "organic"),
            "ads": sum(1 for c in classified if c.category == "ad"),
            "spam": sum(1 for c in classified if c.category == "spam"),
            "duplicates": sum(1 for c in classified if c.category == "duplicate"),
        }

        return schemas.ClassifyLinksResponse(
            classified_links=classified,
            summary=summary,
        )

    @classmethod
    async def fetch_content_from_url(
        cls,
        payload: schemas.FetchContentRequest,
    ) -> schemas.FetchContentResponse:
        """
        Fetch và extract nội dung từ một URL.
        Sử dụng trafilatura để extract nội dung chính từ trang web.
        """
        url = payload.url.strip()

        # Validate URL
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return schemas.FetchContentResponse(
                    url=url,
                    success=False,
                    error_message="Invalid URL format. URL must include scheme (http:// or https://)",
                )
        except Exception as e:
            return schemas.FetchContentResponse(
                url=url,
                success=False,
                error_message=f"Invalid URL: {str(e)}",
            )

        try:
            # Fetch HTML content từ URL
            async with httpx.AsyncClient(
                timeout=30.0,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                },
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
                html_content = response.text

            # Extract plain text content
            text_content = trafilatura.extract(
                html_content,
                include_comments=False,
                include_tables=True,
                include_images=False,
                include_links=False,
                output_format="txt",
                favor_recall=True,  # Ưu tiên lấy nhiều nội dung hơn
            )

            # Extract metadata nếu được yêu cầu
            metadata_dict = {}
            title = None
            author = None
            published_date = None
            language = None
            html_content_extracted = None

            if payload.include_metadata:
                # Extract metadata
                metadata = trafilatura.extract_metadata(html_content)
                if metadata:
                    title = metadata.title
                    author = metadata.author
                    if metadata.date:
                        published_date = (
                            metadata.date.isoformat()
                            if hasattr(metadata.date, "isoformat")
                            else str(metadata.date)
                        )
                    language = metadata.language

                    metadata_dict = {
                        "hostname": metadata.hostname or "",
                        "sitename": metadata.sitename or "",
                        "description": metadata.description or "",
                    }

                # Extract HTML/XML content nếu cần
                html_content_extracted = trafilatura.extract(
                    html_content,
                    include_comments=False,
                    include_tables=True,
                    include_images=False,
                    include_links=False,
                    output_format="xml",
                    favor_recall=True,
                )

            return schemas.FetchContentResponse(
                url=url,
                title=title,
                content=html_content_extracted,  # HTML/XML content (nếu include_metadata=True)
                text_content=text_content,  # Plain text
                author=author,
                published_date=published_date,
                language=language,
                metadata=metadata_dict,
                success=True,
                error_message=None,
            )

        except httpx.HTTPStatusError as e:
            return schemas.FetchContentResponse(
                url=url,
                success=False,
                error_message=f"HTTP error {e.response.status_code}: {e.response.reason_phrase}",
            )
        except httpx.TimeoutException:
            return schemas.FetchContentResponse(
                url=url,
                success=False,
                error_message="Request timeout. The URL took too long to respond.",
            )
        except httpx.RequestError as e:
            return schemas.FetchContentResponse(
                url=url,
                success=False,
                error_message=f"Request error: {str(e)}",
            )
        except Exception as e:
            return schemas.FetchContentResponse(
                url=url,
                success=False,
                error_message=f"Failed to extract content: {str(e)}",
            )

    # ---------- Internal helpers ----------

    @staticmethod
    def _extract_domain(url: str) -> str:
        try:
            parsed = urlparse(url)
            return parsed.netloc or ""
        except Exception:
            return ""

    @staticmethod
    def _normalize_url(url: str) -> str:
        """
        Chuẩn hóa URL để so sánh duplicate:
        - lowercase host
        - bỏ query tracking phổ biến (utm_*, gclid, fbclid,...)
        """
        try:
            parsed = urlparse(url)
            host = parsed.netloc.lower()
            path = parsed.path.rstrip("/")
            return f"{host}{path}"
        except Exception:
            return url.strip().lower()

    @staticmethod
    def _detect_ads(url: str, title: str, snippet: str) -> Tuple[bool, float]:
        """
        Phát hiện link quảng cáo dựa trên heuristic đơn giản.
        Returns: (is_ad, confidence_score)
        """
        ad_keywords = [
            "mua",
            "bán",
            "khuyến mãi",
            "giảm giá",
            "ưu đãi",
            "đặt ngay",
            "đăng ký ngay",
            "sale",
        ]
        tracking_params = ["utm_", "gclid", "fbclid"]

        text = f"{title} {snippet}".lower()
        score = 0.0

        if any(k in text for k in ad_keywords):
            score += 0.5

        if any(p in url.lower() for p in tracking_params):
            score += 0.3

        # Domain hint
        domain = ReferenceSearchService._extract_domain(url).lower()
        if any(d in domain for d in ["googleadservices", "doubleclick", "ads."]):
            score += 0.4

        is_ad = score >= 0.7
        return is_ad, min(score, 1.0)

    @staticmethod
    def _detect_spam(url: str, domain: str, text: str) -> Tuple[bool, float]:
        """
        Phát hiện link spam dựa trên heuristic đơn giản.
        Returns: (is_spam, confidence_score)
        """
        spam_indicators = [
            "free money",
            "get rich quick",
            "xxx",
            "casino",
            "betting",
        ]
        score = 0.0

        lower_text = text.lower()

        if any(k in lower_text for k in spam_indicators):
            score += 0.5

        # Domain với nhiều số hoặc ký tự lạ
        if re.search(r"[0-9]{3,}", domain):
            score += 0.2

        if domain.count("-") >= 3:
            score += 0.2

        is_spam = score >= 0.6
        return is_spam, min(score, 1.0)

    @staticmethod
    def _calculate_relevance_score(keyword: str, title: str, snippet: str) -> float:
        """
        Tính điểm liên quan đơn giản dựa trên tần suất keyword
        trong title + snippet.
        """
        full_text = f"{title} {snippet}".lower()
        kw = keyword.lower().strip()

        if not kw:
            return 0.0

        occurrences = full_text.count(kw)
        if occurrences == 0:
            return 0.0

        # Normalized by length
        length = max(len(full_text.split()), 1)
        density = occurrences / length

        # Capped between 0 and 1
        score = min(0.2 + density * 10, 1.0)
        return score

    @classmethod
    def _mark_duplicates(
        cls, results: List[schemas.ReferenceResult]
    ) -> Tuple[List[schemas.ReferenceResult], int]:
        """
        Đánh dấu duplicate trong list ReferenceResult dựa trên normalized url.
        """
        seen: dict[str, str] = {}
        duplicates = 0

        for item in results:
            normalized = cls._normalize_url(item.url)
            if normalized in seen:
                duplicates += 1
                item.metadata["is_duplicate"] = True
                item.metadata["duplicate_of"] = seen[normalized]
            else:
                seen[normalized] = item.url

        return results, duplicates

    @staticmethod
    async def _fetch_serp_results(
        keyword: str,
        language: str,
        max_results: int,
    ) -> List[dict]:
        """
        Gọi SERP API để lấy kết quả tìm kiếm.
        Hỗ trợ SerpAPI và Google Custom Search API.
        """
        api_key = getattr(settings, "SERP_API_KEY", None)
        if not api_key:
            return []

        provider = getattr(settings, "SERP_API_PROVIDER", "serpapi").lower()

        try:
            if provider == "serpapi":
                return await ReferenceSearchService._fetch_serpapi_results(
                    keyword, language, max_results, api_key
                )
            elif provider == "google_custom_search":
                google_cse_id = getattr(
                    settings, "GOOGLE_CUSTOM_SEARCH_ENGINE_ID", None
                )
                if not google_cse_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cần cấu hình GOOGLE_CUSTOM_SEARCH_ENGINE_ID cho Google Custom Search",
                    )
                return await ReferenceSearchService._fetch_google_cse_results(
                    keyword, language, max_results, api_key, google_cse_id
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Nhà cung cấp SERP không được hỗ trợ: {provider}. Hỗ trợ: serpapi, google_custom_search",
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lấy kết quả SERP thất bại: {str(e)}",
            )

    @staticmethod
    async def _fetch_serpapi_results(
        keyword: str, language: str, max_results: int, api_key: str
    ) -> List[dict]:
        """
        Gọi SerpAPI để lấy kết quả tìm kiếm.
        Docs: https://serpapi.com/search-api
        """
        # Map language to SerpAPI language code (hl expects e.g. "vi", "en")
        lang_map = {
            "vietnamese": "vi",
            "english": "en",
        }
        serp_lang = lang_map.get(language.lower(), "vi")

        # Calculate number of pages needed (SerpAPI returns ~10 results per page)
        num_pages = (max_results + 9) // 10

        all_results = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for page in range(1, num_pages + 1):
                params = {
                    "engine": "google",
                    "q": keyword,
                    "api_key": api_key,
                    "hl": serp_lang,
                    "gl": "vn" if language.lower() == "vietnamese" else "us",
                    "num": 10,
                    "start": (page - 1) * 10,
                }

                try:
                    response = await client.get(
                        "https://serpapi.com/search", params=params
                    )
                    response.raise_for_status()
                    data = response.json()

                    # Extract organic results
                    organic = data.get("organic_results", [])
                    for item in organic:
                        all_results.append(
                            {
                                "url": item.get("link", ""),
                                "title": item.get("title", ""),
                                "snippet": item.get("snippet", ""),
                            }
                        )

                        if len(all_results) >= max_results:
                            break

                    # Rate limiting: SerpAPI free tier allows ~100 searches/month
                    if page < num_pages:
                        await asyncio.sleep(1)  # Avoid rate limit

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 401:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Khóa API SERP không hợp lệ",
                        )
                    elif e.response.status_code == 429:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Đã vượt quá giới hạn lượt gọi API SERP",
                        )
                    raise

        return all_results[:max_results]

    @staticmethod
    async def _fetch_google_cse_results(
        keyword: str,
        language: str,
        max_results: int,
        api_key: str,
        cse_id: str,
    ) -> List[dict]:
        """
        Gọi Google Custom Search API để lấy kết quả tìm kiếm.
        Docs: https://developers.google.com/custom-search/v1/overview
        """
        # Map language to Google language code
        lang_map = {
            "vietnamese": "vi",
            "english": "en",
        }
        google_lang = lang_map.get(language.lower(), "vi")

        # Google CSE returns max 10 results per request
        num_requests = (max_results + 9) // 10
        all_results = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for start_index in range(1, num_requests * 10 + 1, 10):
                params = {
                    "key": api_key,
                    "cx": cse_id,
                    "q": keyword,
                    "lr": f"lang_{google_lang}",
                    "num": min(10, max_results - len(all_results)),
                    "start": start_index,
                }

                try:
                    response = await client.get(
                        "https://www.googleapis.com/customsearch/v1", params=params
                    )
                    response.raise_for_status()
                    data = response.json()

                    # Extract results
                    items = data.get("items", [])
                    for item in items:
                        all_results.append(
                            {
                                "url": item.get("link", ""),
                                "title": item.get("title", ""),
                                "snippet": item.get("snippet", ""),
                            }
                        )

                        if len(all_results) >= max_results:
                            break

                    # Rate limiting: Google CSE allows 100 queries/day free tier
                    if start_index + 10 < num_requests * 10:
                        await asyncio.sleep(1)

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 401:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Khóa Google Custom Search API không hợp lệ",
                        )
                    elif e.response.status_code == 429:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Đã vượt quá giới hạn lượt gọi Google Custom Search API",
                        )
                    raise

        return all_results[:max_results]
