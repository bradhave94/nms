// Unique ids for repeated components that need id/aria-controls pairs (e.g. Accordion
// rendered without an explicit id). A build-wide counter keeps ids unique within each page.
let counter = 0;

export const uniqueId = (prefix: string): string => `${prefix}-${(counter += 1).toString(36)}`;
