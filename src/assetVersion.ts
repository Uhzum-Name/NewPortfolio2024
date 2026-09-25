// Evaluated once per build (module scope), so every page in a build shares the
// same value. Appended to the un-hashed CSS/JS in /public as ?v=... so browsers
// re-fetch them after each deploy instead of serving a cached copy.
export const assetVersion = Date.now().toString(36);
