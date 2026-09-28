import argparse
import base64
import json
import mimetypes
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODELS = [
    "openai/gpt-5-image-mini",
    "openai/gpt-5-image",
    "openai/gpt-5.4-image-2",
    "google/gemini-2.5-flash-image",
]
CATEGORY_VISUAL_INTENT = {
    "NEWS": "timely business update, editorial and factual mood",
    "INVESTMENT_INSIGHTS": "financial analysis, market trend visuals, strategic mood",
    "FOREIGN_INVESTMENT": "cross-border business, global trade and investment context",
    "KNOWLEDGE_BASE": "educational explainer style, clear and structured visual metaphor",
    "ALL": "professional business editorial banner",
}


def read_env_value(env_path: Path, key: str) -> Optional[str]:
    if not env_path.exists():
        return None
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() == key:
            return v.strip()
    return None


def safe_print(message: str) -> None:
    sys.stdout.buffer.write((message + "\n").encode("utf-8", errors="replace"))
    sys.stdout.buffer.flush()


def sanitize(value: Optional[str]) -> str:
    return (value or "").strip()


def build_blog_banner_prompt(
    title: str,
    category: Optional[str],
    tag: Optional[str],
    seo_keywords: Optional[List[str]],
    seo_description: Optional[str],
    aspect_ratio: str,
) -> str:
    clean_title = sanitize(title)
    clean_tag = sanitize(tag)
    clean_desc = sanitize(seo_description)
    clean_keywords = [k.strip() for k in (seo_keywords or []) if k and k.strip()][:8]

    visual_intent = CATEGORY_VISUAL_INTENT.get(
        sanitize(category).upper(), "professional business editorial banner"
    )

    prompt_parts = [
        "Create a high-quality blog hero banner image.",
        "Primary goal: the image must match the article title as closely as possible.",
        "Do not create a generic finance image if the title suggests a specific scene or concept.",
        "Make the central subject directly represent the title meaning.",
        f"Target aspect ratio: {aspect_ratio}.",
        "Style: modern editorial, clean composition, clear focal point, cinematic but natural lighting.",
        "Color direction: balanced and professional, avoid over-saturated neon colors.",
        "Constraints: no text, no watermark, no logo, no UI screenshot, no distorted anatomy.",
        "Leave enough negative space so the website can place title text later.",
        f"Visual intent: {visual_intent}.",
    ]

    if clean_title:
        prompt_parts.append(f'Article title (highest priority): "{clean_title}".')
        prompt_parts.append(f'Build the scene around this exact title: "{clean_title}".')
    if clean_tag:
        prompt_parts.append(f"Primary tag: {clean_tag}.")
    if clean_keywords:
        prompt_parts.append(
            f"SEO keywords (secondary support only): {', '.join(clean_keywords)}."
        )
    if clean_desc:
        prompt_parts.append(f"Article summary context: {clean_desc}.")

    return " ".join(prompt_parts)


def parse_data_url(data_url: str) -> Tuple[bytes, str, str]:
    if not data_url.startswith("data:image/"):
        raise ValueError("Invalid data URL")
    header, encoded = data_url.split(",", 1)
    mime = header.split(";")[0].replace("data:", "")
    ext = mimetypes.guess_extension(mime) or ".png"
    if ext == ".jpe":
        ext = ".jpg"
    return base64.b64decode(encoded), mime, ext


def generate_image_data_url(
    openrouter_key: str,
    prompt: str,
    model_candidates: List[str],
    aspect_ratio: str,
    image_size: str,
    quality: str,
    max_tokens: int,
) -> Tuple[str, str]:
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "Quant-VN Batch Blog Banner",
    }

    last_error = "Unknown error"
    for model in model_candidates:
        payload: Dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "modalities": ["image", "text"],
            "max_tokens": max_tokens,
            "image_config": {
                "aspect_ratio": aspect_ratio,
                "image_size": image_size,
                "quality": quality,
            },
            "stream": False,
        }

        resp = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=180)
        body_text = resp.text
        try:
            body_json = resp.json()
        except Exception:
            body_json = {}

        if resp.status_code >= 400:
            message = (
                body_json.get("error", {}).get("message")
                if isinstance(body_json, dict)
                else None
            ) or body_text
            last_error = f"{resp.status_code} {message}"
            if "not a valid model id" in str(message).lower():
                continue
            raise RuntimeError(last_error)

        data_url = (
            body_json.get("choices", [{}])[0]
            .get("message", {})
            .get("images", [{}])[0]
            .get("image_url", {})
            .get("url")
        )
        if data_url and isinstance(data_url, str) and data_url.startswith("data:image/"):
            return data_url, model
        last_error = f"No image data returned for model {model}"

    raise RuntimeError(last_error)


def fetch_blogs(base_url: str, bearer_token: str) -> List[Dict[str, Any]]:
    resp = requests.get(
        f"{base_url.rstrip('/')}/blog/admin/blogs",
        headers={"Authorization": f"Bearer {bearer_token}"},
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, list):
        raise RuntimeError("Unexpected /blog/admin/blogs response")
    return data


def read_source_blogs(source_json: Optional[str]) -> Optional[List[Dict[str, Any]]]:
    if not source_json:
        return None
    path = Path(source_json)
    if not path.exists():
        return None
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and isinstance(raw.get("data"), list):
        raw = raw["data"]
    if not isinstance(raw, list):
        raise RuntimeError("source_json must be an array of blog objects")
    return [item for item in raw if isinstance(item, dict)]


def normalize_blog_for_update(item: Dict[str, Any]) -> Dict[str, Any]:
    seo = item.get("seo") if isinstance(item.get("seo"), dict) else {}
    return {
        "id": item.get("id"),
        "tag": item.get("tag") or "",
        "title": item.get("title") or "",
        "banner_url": item.get("banner_url") or "",
        "link_post": item.get("link_post") or "",
        "category": item.get("category") or "INVESTMENT_INSIGHTS",
        "state": item.get("state") or "PENDING",
        "seo": {
            "title": seo.get("title") or item.get("title") or "",
            "description": seo.get("description") or "",
            "url": seo.get("url") or item.get("link_post") or "",
            "keywords": seo.get("keywords") or [],
            "author": seo.get("author") or "Vietnam Business Brokers",
        },
    }


def update_blog_banner(
    base_url: str,
    bearer_token: str,
    blog_data: Dict[str, Any],
    image_bytes: bytes,
    image_mime: str,
    image_ext: str,
) -> requests.Response:
    blog_id = blog_data["id"]
    filename = f"banner_{blog_id}{image_ext}"
    files = {"image": (filename, image_bytes, image_mime)}
    form_data = {"blog_data": json.dumps(blog_data, ensure_ascii=False)}
    resp = requests.put(
        f"{base_url.rstrip('/')}/blog/{blog_id}",
        headers={"Authorization": f"Bearer {bearer_token}"},
        data=form_data,
        files=files,
        timeout=180,
    )
    return resp


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate and update blog banners in bulk")
    parser.add_argument("--token", required=True, help="Bearer token without the Bearer prefix")
    parser.add_argument("--base-url", default="https://be.quantvn.com")
    parser.add_argument("--source-json", default="Quant/Blog/result.json")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--aspect-ratio", default="16:9")
    parser.add_argument("--image-size", default="1K")
    parser.add_argument("--quality", default="low")
    parser.add_argument("--max-tokens", type=int, default=500)
    parser.add_argument("--sleep-ms", type=int, default=300)
    parser.add_argument("--report", default="admin/scripts/bulk_update_report.json")
    args = parser.parse_args()

    env_path = Path("admin/.env")
    openrouter_key = read_env_value(env_path, "VITE_OPEN_ROUTER_API_KEY") or os.getenv("VITE_OPEN_ROUTER_API_KEY")
    if not openrouter_key:
        raise RuntimeError("OpenRouter API key not found in admin/.env")

    source_blogs = read_source_blogs(args.source_json)
    used_source = args.source_json if source_blogs is not None else "api:/blog/admin/blogs"

    full_blogs = fetch_blogs(args.base_url, args.token)
    full_map = {item.get("id"): item for item in full_blogs if item.get("id")}

    if source_blogs is None:
        target_blogs = full_blogs[: args.limit]
    else:
        picked: List[Dict[str, Any]] = []
        for src in source_blogs:
            blog_id = src.get("id")
            if not blog_id:
                continue
            full = full_map.get(blog_id)
            if full:
                picked.append(full)
        target_blogs = picked[: args.limit]

    if not target_blogs:
        raise RuntimeError("No target blogs found to process")

    safe_print(f"Source: {used_source}")
    safe_print(f"Processing {len(target_blogs)} blogs...")

    results: List[Dict[str, Any]] = []
    success_count = 0

    for idx, raw_blog in enumerate(target_blogs, start=1):
        blog = normalize_blog_for_update(raw_blog)
        blog_id = blog["id"]
        title = blog.get("title") or ""

        if not blog_id or not title.strip():
            results.append(
                {
                    "index": idx,
                    "id": blog_id,
                    "title": title,
                    "status": "skipped",
                    "reason": "missing id or title",
                }
            )
            continue

        prompt = build_blog_banner_prompt(
            title=title,
            category=blog.get("category"),
            tag=blog.get("tag"),
            seo_keywords=(blog.get("seo") or {}).get("keywords") or [],
            seo_description=(blog.get("seo") or {}).get("description") or "",
            aspect_ratio=args.aspect_ratio,
        )

        try:
            data_url, used_model = generate_image_data_url(
                openrouter_key=openrouter_key,
                prompt=prompt,
                model_candidates=DEFAULT_MODELS,
                aspect_ratio=args.aspect_ratio,
                image_size=args.image_size,
                quality=args.quality,
                max_tokens=args.max_tokens,
            )
            image_bytes, image_mime, image_ext = parse_data_url(data_url)

            resp = update_blog_banner(
                base_url=args.base_url,
                bearer_token=args.token,
                blog_data=blog,
                image_bytes=image_bytes,
                image_mime=image_mime,
                image_ext=image_ext,
            )

            if resp.status_code >= 400:
                raise RuntimeError(f"update failed: {resp.status_code} {resp.text}")

            success_count += 1
            results.append(
                {
                    "index": idx,
                    "id": blog_id,
                    "title": title,
                    "status": "updated",
                    "model": used_model,
                    "image_mime": image_mime,
                }
            )
            safe_print(f"[{idx}/{len(target_blogs)}] updated {blog_id} | {title}")
        except Exception as exc:
            results.append(
                {
                    "index": idx,
                    "id": blog_id,
                    "title": title,
                    "status": "failed",
                    "error": str(exc),
                }
            )
            safe_print(f"[{idx}/{len(target_blogs)}] failed {blog_id} | {title} | {exc}")

        time.sleep(max(args.sleep_ms, 0) / 1000.0)

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_payload = {
        "source": used_source,
        "base_url": args.base_url,
        "total": len(target_blogs),
        "success": success_count,
        "failed": len(target_blogs) - success_count,
        "results": results,
    }
    report_path.write_text(json.dumps(report_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    safe_print(f"Done. Success: {success_count}/{len(target_blogs)}")
    safe_print(f"Report: {report_path}")


if __name__ == "__main__":
    main()
