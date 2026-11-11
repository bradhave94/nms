-- Running visit totals used by the directory's Popular sort.
-- Prefill once from Analytics, then the site increments this on each alliance-page visit.
ALTER TABLE alliances ADD COLUMN page_views INTEGER NOT NULL DEFAULT 0;
