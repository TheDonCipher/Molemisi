-- Notifications table for admin-to-player communication
-- Players see these in-game as toast/banner notifications

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',           -- info, warning, ban, reset, achievement, system
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,                             -- optional deep link
  metadata JSONB DEFAULT '{}',                 -- extra data (e.g. {amount: 500, item: 'sorghum'})
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_player ON notifications(player_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS: players can only read their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_read_own_notifications" ON notifications
  FOR SELECT USING (auth.uid() = player_id);

-- No insert/update/delete for regular users — admin/system only via service role

COMMENT ON TABLE notifications IS 'In-game notifications from admin actions, achievements, and system events';
COMMENT ON COLUMN notifications.type IS 'info | warning | ban | reset | achievement | system';
COMMENT ON COLUMN notifications.metadata IS 'JSON payload with extra context (amounts, items, etc.)';
