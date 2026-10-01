from apps.auth.services import require_admin
from apps.main import app


EXPECTED_CMS_ROUTES = {
    ("GET", "/blog/client/blogs"),
    ("GET", "/blog/admin/blogs"),
    ("GET", "/blog/admin/{blog_id}"),
    ("GET", "/blog/link/{link_post}"),
    ("POST", "/blog"),
    ("PUT", "/blog/{id}"),
    ("DELETE", "/blog/{blog_id}"),
    ("GET", "/blog/is-duplicate-link-post"),
    ("POST", "/blog/ai-generate-markdown"),
    ("GET", "/blog/openai/ai-generate-list-title"),
    ("POST", "/blog/search-references"),
    ("POST", "/blog/classify-links"),
    ("POST", "/blog/fetch-content"),
    ("POST", "/media/image"),
    ("POST", "/media/ai/generate"),
    ("POST", "/openai/seo-keywords"),
    ("POST", "/openai/seo-description"),
    ("POST", "/linkedin/preview"),
    ("POST", "/publications/blogs/{blog_id}/linkedin/preview"),
}


# Verify the app imports and retains the complete CMS HTTP surface.
def test_app_preserves_cms_routes():
    actual_routes = {
        (method, route.path)
        for route in app.routes
        for method in getattr(route, "methods", set())
    }

    assert EXPECTED_CMS_ROUTES <= actual_routes
    assert not any("link-comment" in path for _, path in actual_routes)
    removed_prefixes = (
        "/course",
        "/business",
        "/expert",
        "/investment",
        "/package",
    )
    assert not any(path.startswith(removed_prefixes) for _, path in actual_routes)


# Verify public routes stay open while CMS routes require admin JWT.
def test_route_authentication_boundaries():
    routes = {route.path: route for route in app.routes}
    assert not routes["/blog/client/blogs"].dependant.dependencies
    assert not routes["/blog/link/{link_post}"].dependant.dependencies
    for method, path in EXPECTED_CMS_ROUTES - {
        ("GET", "/blog/client/blogs"),
        ("GET", "/blog/link/{link_post}"),
    }:
        route = routes[path]
        assert method in route.methods
        assert any(
            dependency.call is require_admin
            for dependency in route.dependant.dependencies
        )
