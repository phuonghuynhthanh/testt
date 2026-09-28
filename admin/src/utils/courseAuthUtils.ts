// Normalize a bearer token before sending it to the course API.
export const normalizeCourseToken = (token?: string) =>
  token?.trim().replace(/^Bearer\s+/i, "");

// Build an Authorization header only when a token exists.
export const buildCourseAuthHeaders = (token?: string) => {
  const normalizedToken = normalizeCourseToken(token);
  return normalizedToken
    ? { Authorization: `Bearer ${normalizedToken}` }
    : undefined;
};
