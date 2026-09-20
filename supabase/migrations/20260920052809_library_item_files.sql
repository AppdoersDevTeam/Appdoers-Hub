-- Allow library items to store an uploaded PDF or Word file alongside written notes.

ALTER TABLE hub_library_items
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER;
