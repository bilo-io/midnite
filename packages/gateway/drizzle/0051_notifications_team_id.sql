ALTER TABLE notifications ADD team_id text;
--> statement-breakpoint
CREATE INDEX notification_team_idx ON notifications (team_id, created_at);
