"""Byte-level image validation shared by LinkedIn and Pexels flows."""

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.schemas import ValidatedImage

MAX_IMAGE_PIXELS = 36_152_319


# Decode a fixed-width integer while rejecting incomplete image headers.
def _uint16(value: bytes, offset: int, little_endian: bool = False) -> int:
    if offset + 2 > len(value):
        raise LinkedInError("invalid_image", "Image data is incomplete.")
    return int.from_bytes(value[offset:offset + 2], "little" if little_endian else "big")


# Read JPEG dimensions from a Start Of Frame marker rather than trusting metadata.
def _jpeg_dimensions(value: bytes) -> tuple[int, int]:
    offset = 2
    markers = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
    while offset < len(value):
        while offset < len(value) and value[offset] != 0xFF:
            offset += 1
        while offset < len(value) and value[offset] == 0xFF:
            offset += 1
        if offset >= len(value):
            break
        marker = value[offset]
        offset += 1
        if marker in {0xD8, 0xD9, *range(0xD0, 0xD8)}:
            continue
        length = _uint16(value, offset)
        if length < 8 or offset + length > len(value):
            raise LinkedInError("invalid_image", "JPEG data is incomplete.")
        if marker in markers:
            return _uint16(value, offset + 5), _uint16(value, offset + 3)
        offset += length
    raise LinkedInError("invalid_image", "JPEG dimensions could not be read.")


# Validate actual PNG, JPEG, or GIF bytes and LinkedIn's documented pixel ceiling.
def validate_image_bytes(value: bytes) -> ValidatedImage:
    if len(value) < 10:
        raise LinkedInError("invalid_image", "Image data is incomplete.")
    if value.startswith(b"\x89PNG\r\n\x1a\n"):
        if len(value) < 24:
            raise LinkedInError("invalid_image", "PNG data is incomplete.")
        media_type, width, height = "image/png", int.from_bytes(value[16:20], "big"), int.from_bytes(value[20:24], "big")
    elif value.startswith((b"GIF87a", b"GIF89a")):
        media_type, width, height = "image/gif", _uint16(value, 6, True), _uint16(value, 8, True)
    elif value.startswith(b"\xff\xd8"):
        media_type = "image/jpeg"
        width, height = _jpeg_dimensions(value)
    else:
        raise LinkedInError("invalid_image", "Image must be a PNG, JPEG, or GIF file.")
    if not width or not height or width * height > MAX_IMAGE_PIXELS:
        raise LinkedInError("invalid_image", "Image dimensions must contain fewer than 36,152,320 pixels.")
    return ValidatedImage(media_type=media_type, width=width, height=height, bytes=value)
