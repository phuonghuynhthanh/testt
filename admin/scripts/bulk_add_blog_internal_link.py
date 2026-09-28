import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

CTA_LINE = "**Khám phá chiến lược trading tại** [quantvn.com](https://quantvn.com)"
CTA_PATTERN = re.compile(
    r"\*\*Khám\s+phá\s+chiến\s+lược\s+trading\s+tại\*\*\s*"
    r"\[quantvn\.com\]\(https://quantvn\.com/?\)",
    re.IGNORECASE,
)
STATE_SCOPE = "APPROVED"


# Prints UTF-8 text safely on Windows consoles.
def safe_print(message: str) -> None:
    sys.stdout.buffer.write((message + "\n").encode("utf-8", errors="replace"))
    sys.stdout.buffer.flush()


# Reads a bearer token from CLI or environment without persisting it.
def resolve_token(cli_token: Optional[str]) -> str:
    token = (cli_token or os.getenv("ADMIN_BLOG_TOKEN") or "").strip()
    if not token:
        raise RuntimeError("Missing token. Pass --token or set ADMIN_BLOG_TOKEN.")
    return token


# Builds request headers for authenticated admin blog API calls.
def build_headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "ngrok-skip-browser-warning": "true",
    }


# Fetches the approved admin blog list from the backend.
def fetch_approved_blogs(base_url: str, token: str) -> List[Dict[str, Any]]:
    response = requests.get(
        f"{base_url.rstrip('/')}/blog/admin/blogs",
        headers=build_headers(token),
        params={"state": STATE_SCOPE},
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, list):
        raise RuntimeError("Unexpected /blog/admin/blogs response format.")
    return [item for item in data if isinstance(item, dict)]


# Fetches full blog detail so the update payload can preserve existing fields.
def fetch_blog_detail(base_url: str, token: str, blog_id: str) -> Dict[str, Any]:
    response = requests.get(
        f"{base_url.rstrip('/')}/blog/admin/{blog_id}",
        headers=build_headers(token),
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise RuntimeError(f"Unexpected detail response for blog {blog_id}.")
    return data


# Detects whether the internal CTA already exists anywhere in the markdown content.
def has_internal_cta(content: str) -> bool:
    return bool(CTA_PATTERN.search(content or ""))


# Appends the internal CTA while preserving all existing markdown except trailing whitespace.
def append_internal_cta(content: str) -> str:
    return f"{(content or '').rstrip()}\n\n{CTA_LINE}"


# Normalizes blog detail into the update payload expected by the admin API.
def build_update_payload(blog_detail: Dict[str, Any], updated_content: str) -> Dict[str, Any]:
    payload = dict(blog_detail)
    payload["content"] = updated_content
    return payload


# Sends an update request without uploading or changing the banner image.
def update_blog_content(base_url: str, token: str, blog_payload: Dict[str, Any]) -> requests.Response:
    blog_id = blog_payload.get("id")
    if not blog_id:
        raise RuntimeError("Missing blog id in update payload.")

    response = requests.put(
        f"{base_url.rstrip('/')}/blog/{blog_id}",
        headers=build_headers(token),
        files={
            "blog_data": (
                None,
                json.dumps(blog_payload, ensure_ascii=False),
                "application/json",
            )
        },
        timeout=180,
    )
    return response


# Builds a compact report item without storing full blog content.
def build_result_item(
    index: int,
    blog: Dict[str, Any],
    status: str,
    old_length: int,
    new_length: int,
    error: Optional[str] = None,
) -> Dict[str, Any]:
    item = {
        "index": index,
        "id": blog.get("id"),
        "title": blog.get("title") or "",
        "link_post": blog.get("link_post") or "",
        "status": status,
        "old_content_length": old_length,
        "new_content_length": new_length,
    }
    if error:
        item["error"] = error
    return item


# Writes the JSON report for later audit and reruns.
def write_report(report_path: Path, payload: Dict[str, Any]) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# Builds the default timestamped report path.
def default_report_path() -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Path(f"admin/scripts/blog_internal_link_report_{stamp}.json")


# Runs the sequential approved-blog update workflow.
def run(args: argparse.Namespace) -> Dict[str, Any]:
    token = resolve_token(args.token)
    blogs = fetch_approved_blogs(args.base_url, token)
    target_blogs = blogs[: args.limit] if args.limit and args.limit > 0 else blogs

    results: List[Dict[str, Any]] = []
    updated_count = 0
    skipped_count = 0
    failed_count = 0

    safe_print(f"Processing {len(target_blogs)} {STATE_SCOPE} blog(s).")

    for index, list_blog in enumerate(target_blogs, start=1):
        blog_id = list_blog.get("id")
        title = list_blog.get("title") or ""

        if not blog_id:
            failed_count += 1
            results.append(
                build_result_item(
                    index=index,
                    blog=list_blog,
                    status="failed",
                    old_length=0,
                    new_length=0,
                    error="missing blog id",
                )
            )
            continue

        try:
            detail = fetch_blog_detail(args.base_url, token, blog_id)
            content = detail.get("content") or ""
            old_length = len(content)

            if has_internal_cta(content):
                skipped_count += 1
                results.append(
                    build_result_item(index, detail, "skipped", old_length, old_length)
                )
                safe_print(f"[{index}/{len(target_blogs)}] skipped {blog_id} | {title}")
                continue

            updated_content = append_internal_cta(content)
            payload = build_update_payload(detail, updated_content)
            response = update_blog_content(args.base_url, token, payload)

            if response.status_code >= 400:
                raise RuntimeError(f"update failed: {response.status_code} {response.text}")

            updated_count += 1
            results.append(
                build_result_item(
                    index=index,
                    blog=detail,
                    status="updated",
                    old_length=old_length,
                    new_length=len(updated_content),
                )
            )
            safe_print(f"[{index}/{len(target_blogs)}] updated {blog_id} | {title}")
        except Exception as exc:
            failed_count += 1
            results.append(
                build_result_item(
                    index=index,
                    blog=list_blog,
                    status="failed",
                    old_length=0,
                    new_length=0,
                    error=str(exc),
                )
            )
            safe_print(f"[{index}/{len(target_blogs)}] failed {blog_id} | {title} | {exc}")

        time.sleep(max(args.sleep_ms, 0) / 1000.0)

    report = {
        "source": "api:/blog/admin/blogs",
        "base_url": args.base_url,
        "state_scope": STATE_SCOPE,
        "total": len(target_blogs),
        "updated": updated_count,
        "skipped": skipped_count,
        "failed": failed_count,
        "cta_line": CTA_LINE,
        "report_path": str(Path(args.report)),
        "results": results,
    }

    write_report(Path(args.report), report)
    return report


# Parses CLI arguments for the bulk internal-link script.
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Append the QuantVN internal trading CTA to approved blog posts."
    )
    parser.add_argument("--token", default=None, help="Bearer token without the Bearer prefix.")
    parser.add_argument("--base-url", default="https://be.quantvn.com")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of approved blogs to process.")
    parser.add_argument("--sleep-ms", type=int, default=250)
    parser.add_argument("--report", default=str(default_report_path()))
    return parser.parse_args()


# Entrypoint for CLI execution.
def main() -> None:
    report = run(parse_args())
    safe_print(
        "Done. "
        f"Updated: {report['updated']}, "
        f"skipped: {report['skipped']}, "
        f"failed: {report['failed']}."
    )
    safe_print(f"Report: {report['report_path']}")


if __name__ == "__main__":
    main()
