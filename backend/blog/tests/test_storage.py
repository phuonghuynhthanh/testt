from contextlib import contextmanager
from datetime import timedelta
from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from apps.core.storage import StorageService
from apps.blogs.services.blog import BlogServices


class FakeMinio:
    def __init__(self, exists=True):
        self.exists = exists
        self.bucket_checks = 0
        self.created = []
        self.puts = []
        self.removed = []
        self.objects = []

    # Return a predictable object descriptor for signed media URL tests.
    def stat_object(self, _bucket, key):
        return SimpleNamespace(object_name=key)

    # Return a safe fake URL without requiring a live MinIO server.
    def presigned_get_object(self, _bucket, key, expires):
        assert expires == timedelta(minutes=15)
        return f"https://media.test/{key}"

    # Simulate the SDK bucket existence check.
    def bucket_exists(self, _bucket):
        self.bucket_checks += 1
        return self.exists

    # Record explicit bucket creation requests.
    def make_bucket(self, bucket, location):
        self.created.append((bucket, location))
        self.exists = True

    # Record streaming uploads without consuming the stream.
    def put_object(self, bucket, key, stream, length, content_type):
        self.puts.append((bucket, key, stream, length, content_type))

    # Record object deletions.
    def remove_object(self, bucket, key):
        self.removed.append((bucket, key))

    # Return only objects matching the supplied prefix, like MinIO does.
    def list_objects(self, _bucket, prefix, recursive):
        assert recursive is True
        return [item for item in self.objects if item.object_name.startswith(prefix)]


# Configure an isolated fake client and deterministic storage settings.
@pytest.fixture
def storage(monkeypatch):
    fake = FakeMinio()
    StorageService._client = fake
    StorageService._initialized = False
    monkeypatch.setattr("config.settings.MINIO_BUCKET", "cms-media")
    monkeypatch.setattr("config.settings.MINIO_REGION", "")
    monkeypatch.setattr("config.settings.MINIO_AUTO_CREATE_BUCKET", False)
    monkeypatch.setattr("config.settings.MEDIA_MAX_UPLOAD_MB", 10)
    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://quant.vn")
    yield fake
    StorageService._client = None
    StorageService._initialized = False


# Create an UploadFile carrying the supplied MIME type and byte content.
def image(content_type="image/png", content=b"image"):
    return UploadFile(
        filename="untrusted.exe",
        file=BytesIO(content),
        headers=Headers({"content-type": content_type}),
    )


# Build the minimum Blog payload used by create rollback tests.
def blog_data(banner_url=None):
    return SimpleNamespace(
        tag="tag",
        title="Title",
        banner_url=banner_url,
        link_post="quant-trading",
        content="Content",
        category="NEWS",
        seo=SimpleNamespace(
            title="SEO",
            description="Description",
            url="https://quant.vn/blog/quant-trading",
            keywords=[],
            author="Quant VN",
        ),
    )


# Build the minimum Blog update payload used by rollback tests.
def blog_update_data():
    return SimpleNamespace(
        title=None,
        link_post=None,
        content=None,
        tag=None,
        state=None,
        category=None,
        banner_url=None,
        seo=None,
    )


# Verify uploads retain a relative key, configured bucket, and image content type.
def test_upload_uses_minio_stream_and_safe_key(storage):
    key = StorageService.upload_image(image(), folder="../quant-trading/./images")

    assert key.startswith("quant-trading/images/")
    assert key.endswith(".png")
    bucket, uploaded_key, stream, length, content_type = storage.puts[0]
    assert (bucket, uploaded_key, length, content_type) == (
        "cms-media",
        key,
        5,
        "image/png",
    )
    assert stream.read() == b"image"


# Verify browser media URLs use a short-lived signed MinIO request.
def test_presigned_image_url_uses_exact_relative_key(storage):
    assert StorageService.presigned_image_url("quant/banner.png") == (
        "https://media.test/quant/banner.png"
    )


# Verify traversal attempts cannot be normalized into a different bucket object.
def test_presigned_image_url_rejects_path_traversal(storage):
    with pytest.raises(HTTPException) as error:
        StorageService.presigned_image_url("../quant/banner.png")

    assert error.value.status_code == 404


# Verify disallowed MIME types are rejected before any storage request.
def test_upload_rejects_unsupported_mime(storage):
    with pytest.raises(HTTPException, match="Chỉ hỗ trợ") as error:
        StorageService.upload_image(image("application/pdf"))

    assert error.value.status_code == 415
    assert not storage.puts


# Verify oversized streams are rejected without uploading them.
def test_upload_rejects_oversized_image(storage, monkeypatch):
    monkeypatch.setattr("config.settings.MEDIA_MAX_UPLOAD_MB", 0)
    with pytest.raises(HTTPException) as error:
        StorageService.upload_image(image())

    assert error.value.status_code == 413
    assert not storage.puts


# Verify a compatible relative key deletes exactly that MinIO object.
def test_delete_image_uses_relative_or_legacy_static_key(storage):
    assert StorageService.delete_image("/static/quant/banner.png") == {
        "message": "Image deleted successfully!"
    }
    assert storage.removed == [("cms-media", "quant/banner.png")]


# Verify arbitrary external URLs are never treated as MinIO object names.
def test_delete_image_ignores_external_urls(storage):
    assert StorageService.delete_image("https://other.example/image.png") == {
        "message": "Image path is empty or external."
    }
    assert not storage.removed


# Verify trusted legacy absolute URLs still resolve to their stored object key.
def test_delete_image_accepts_trusted_legacy_url(storage):
    StorageService.delete_image("https://quant.vn/static/quant/banner.png")

    assert storage.removed == [("cms-media", "quant/banner.png")]


# Verify prefix cleanup has a trailing slash boundary and ignores similar slugs.
def test_delete_key_uses_exact_slug_prefix(storage):
    storage.objects = [
        SimpleNamespace(object_name="quant-trading/a.png"),
        SimpleNamespace(object_name="quant-trading-old/b.png"),
    ]
    StorageService.delete_key("quant-trading")

    assert storage.removed == [("cms-media", "quant-trading/a.png")]


# Verify an existing bucket does not trigger infrastructure creation.
def test_initialize_uses_existing_bucket(storage):
    StorageService.initialize()
    assert not storage.created


# Verify startup validation is reused instead of checking the bucket per operation.
def test_initialize_reuses_successful_validation(storage):
    StorageService.initialize()
    StorageService.initialize()

    assert storage.bucket_checks == 1


# Verify opt-in local setup creates a missing bucket in the configured region.
def test_initialize_auto_creates_missing_bucket(storage, monkeypatch):
    storage.exists = False
    monkeypatch.setattr("config.settings.MINIO_AUTO_CREATE_BUCKET", True)
    monkeypatch.setattr("config.settings.MINIO_REGION", "us-west-1")
    StorageService.initialize()
    assert storage.created == [("cms-media", "us-west-1")]


# Verify production defaults fail clearly for a missing bucket.
def test_initialize_rejects_missing_bucket_without_auto_create(storage):
    storage.exists = False
    with pytest.raises(RuntimeError, match="does not exist"):
        StorageService.initialize()


# Verify an explicitly blank bucket fails with a clear startup error.
def test_initialize_rejects_blank_bucket(storage, monkeypatch):
    monkeypatch.setattr("config.settings.MINIO_BUCKET", "")

    with pytest.raises(RuntimeError, match="bucket must be configured"):
        StorageService.initialize()


# Verify MinIO upload errors become safe API errors without backend details.
def test_upload_hides_minio_errors(storage, monkeypatch):
    # Replace the fake upload with a server-side failure.
    monkeypatch.setattr(
        storage,
        "put_object",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("secret")),
    )
    with pytest.raises(HTTPException, match="Tải hình ảnh lên thất bại") as error:
        StorageService.upload_image(image())

    assert error.value.status_code == 500


# Verify create rollback removes only the image uploaded by the failed request.
def test_blog_create_rolls_back_uploaded_banner(monkeypatch):
    deleted = []
    monkeypatch.setattr(
        "apps.blogs.services.blog.Blog.filter",
        lambda *_args: SimpleNamespace(first=lambda: None),
    )
    monkeypatch.setattr(
        "apps.blogs.services.blog.Blog.create",
        lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("database failed")),
    )
    monkeypatch.setattr(
        StorageService,
        "upload_image",
        lambda *_args, **_kwargs: "quant-trading/new.png",
    )
    monkeypatch.setattr(StorageService, "delete_image", deleted.append)

    with pytest.raises(HTTPException, match="Tạo bài viết thất bại"):
        BlogServices.create_blog(blog_data(), image=image())

    assert deleted == ["quant-trading/new.png"]


# Verify create failure never deletes a pre-existing banner supplied by the caller.
def test_blog_create_preserves_existing_banner_on_failure(monkeypatch):
    deleted = []
    monkeypatch.setattr(
        "apps.blogs.services.blog.Blog.filter",
        lambda *_args: SimpleNamespace(first=lambda: None),
    )
    monkeypatch.setattr(
        "apps.blogs.services.blog.Blog.create",
        lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("database failed")),
    )
    monkeypatch.setattr(StorageService, "delete_image", deleted.append)

    with pytest.raises(HTTPException):
        BlogServices.create_blog(blog_data("existing/banner.png"))

    assert not deleted


# Verify a replacement banner preserves the old object until the database update succeeds.
def test_blog_update_deletes_old_banner_after_database_update(monkeypatch):
    events = []
    blog = SimpleNamespace(banner_url="old/banner.png", link_post="quant", seo={})

    class Field:
        # Supply the minimal SQLAlchemy-like expression interface used by the service.
        def __eq__(self, _other):
            return self

        def __ne__(self, _other):
            return self

        def __and__(self, _other):
            return self

        # Support the active-row predicate used by soft-delete queries.
        def is_(self, _other):
            return self

    class FakeBlog:
        id = Field()
        link_post = Field()
        deleted_at = Field()

        # Record when the database write is reached.
        @staticmethod
        def update(_id, **_data):
            events.append("database")
            return blog

    class FakeQuery:
        # Keep the service's query chain database-free.
        def filter(self, _condition):
            return self

        def first(self):
            return blog

    class FakeSession:
        # Return the target blog only for the primary model query.
        def query(self, _model):
            query = FakeQuery()
            query.first = lambda: blog if _model is FakeBlog else None
            return query

    # Replace the service session with a no-op context manager.
    @contextmanager
    def fake_session():
        yield FakeSession()

    data = blog_update_data()
    monkeypatch.setattr("apps.blogs.services.blog.Blog", FakeBlog)
    monkeypatch.setattr(BlogServices, "get_db_session", fake_session)
    monkeypatch.setattr(
        StorageService,
        "upload_image",
        lambda *_args, **_kwargs: events.append("upload") or "new/banner.png",
    )
    monkeypatch.setattr(
        StorageService,
        "delete_image",
        lambda key: events.append(f"delete:{key}"),
    )

    BlogServices.update_blog("blog-id", data=data, image=image())

    assert events == ["upload", "database", "delete:old/banner.png"]


# Verify every failed database update rolls back its newly uploaded banner.
def test_blog_update_rolls_back_banner_on_http_error(monkeypatch):
    blog = SimpleNamespace(banner_url="old/banner.png", link_post="quant", seo={})
    query_results = iter([blog, None])
    deleted = []

    class FakeQuery:
        # Preserve the service query chain while returning deterministic results.
        def filter(self, _condition):
            return self

        # Return the Blog lookup first and duplicate lookup second.
        def first(self):
            return next(query_results)

    class FakeSession:
        # Return a minimal query for either model or selected column.
        def query(self, _model):
            return FakeQuery()

    # Replace the service session with a database-free context manager.
    @contextmanager
    def fake_session():
        yield FakeSession()

    monkeypatch.setattr(BlogServices, "get_db_session", fake_session)
    monkeypatch.setattr(
        "apps.blogs.services.blog.Blog.update",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            HTTPException(status_code=404, detail="Blog not found")
        ),
    )
    monkeypatch.setattr(
        StorageService,
        "upload_image",
        lambda *_args, **_kwargs: "new/banner.png",
    )
    monkeypatch.setattr(StorageService, "delete_image", deleted.append)

    with pytest.raises(HTTPException) as error:
        BlogServices.update_blog("blog-id", blog_update_data(), image=image())

    assert error.value.status_code == 404
    assert deleted == ["new/banner.png"]


# Verify storage cleanup failure cannot turn a committed Blog delete into an error.
def test_blog_delete_succeeds_when_prefix_cleanup_fails(monkeypatch):
    blog = SimpleNamespace(banner_url="old/banner.png", link_post="quant")

    class FakeQuery:
        # Preserve the service query chain for the Blog lookup.
        def filter(self, _condition):
            return self

        # Return the Blog selected for deletion.
        def first(self):
            return blog

    class FakeSession:
        def __init__(self):
            self.committed = False

        # Return a minimal query for the Blog model.
        def query(self, _model):
            return FakeQuery()

        # Accept the Blog row selected for deletion.
        def delete(self, _blog):
            return None

        # Record that the irreversible database step completed.
        def commit(self):
            self.committed = True

    session = FakeSession()

    # Replace the service session with a database-free context manager.
    @contextmanager
    def fake_session():
        yield session

    monkeypatch.setattr(BlogServices, "get_db_session", fake_session)
    monkeypatch.setattr(StorageService, "delete_image", lambda _key: None)
    monkeypatch.setattr(
        StorageService,
        "delete_key",
        lambda _key: (_ for _ in ()).throw(RuntimeError("MinIO unavailable")),
    )

    result = BlogServices.delete_blog("blog-id")

    assert session.committed is True
    assert result == {"message": "Xóa bài viết thành công"}
