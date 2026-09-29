from apps.blogs.services.blog import BlogServices


# Verify Vietnamese characters are transliterated instead of deleted.
def test_create_url_preserves_vietnamese_words():
    title = "Xu hướng đầu tư dài hạn tại Việt Nam"

    assert BlogServices._create_url(title) == (
        "xu-huong-dau-tu-dai-han-tai-viet-nam"
    )
