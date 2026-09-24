-- Allow permanent deletion of deactivated team members by nulling historical FKs.

-- Make NOT NULL author/owner columns nullable so SET NULL works on delete.
ALTER TABLE lead_notes ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE notes ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE time_entries ALTER COLUMN team_user_id DROP NOT NULL;

-- Replace restrictive FKs with ON DELETE SET NULL.
ALTER TABLE leads DROP CONSTRAINT leads_assigned_to_fkey;
ALTER TABLE leads
  ADD CONSTRAINT leads_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE lead_notes DROP CONSTRAINT lead_notes_author_id_fkey;
ALTER TABLE lead_notes
  ADD CONSTRAINT lead_notes_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE project_phases DROP CONSTRAINT project_phases_assigned_to_fkey;
ALTER TABLE project_phases
  ADD CONSTRAINT project_phases_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE tasks DROP CONSTRAINT tasks_assigned_to_fkey;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE tasks DROP CONSTRAINT tasks_created_by_fkey;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE time_entries DROP CONSTRAINT time_entries_team_user_id_fkey;
ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_team_user_id_fkey
  FOREIGN KEY (team_user_id) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE proposals DROP CONSTRAINT proposals_created_by_fkey;
ALTER TABLE proposals
  ADD CONSTRAINT proposals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE contracts DROP CONSTRAINT contracts_created_by_fkey;
ALTER TABLE contracts
  ADD CONSTRAINT contracts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE invoices DROP CONSTRAINT invoices_created_by_fkey;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE files DROP CONSTRAINT files_uploaded_by_fkey;
ALTER TABLE files
  ADD CONSTRAINT files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE notes DROP CONSTRAINT notes_author_id_fkey;
ALTER TABLE notes
  ADD CONSTRAINT notes_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE activity_log DROP CONSTRAINT activity_log_performed_by_fkey;
ALTER TABLE activity_log
  ADD CONSTRAINT activity_log_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE client_credentials DROP CONSTRAINT client_credentials_created_by_fkey;
ALTER TABLE client_credentials
  ADD CONSTRAINT client_credentials_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE monthly_recaps DROP CONSTRAINT monthly_recaps_sent_by_fkey;
ALTER TABLE monthly_recaps
  ADD CONSTRAINT monthly_recaps_sent_by_fkey
  FOREIGN KEY (sent_by) REFERENCES team_users(id) ON DELETE SET NULL;

ALTER TABLE monthly_recaps DROP CONSTRAINT monthly_recaps_created_by_fkey;
ALTER TABLE monthly_recaps
  ADD CONSTRAINT monthly_recaps_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES team_users(id) ON DELETE SET NULL;
