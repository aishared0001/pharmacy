-- ===========================================================================
-- MediGo - push notification tokens
-- Stores each customer's Expo push token so order-status updates can notify
-- them. Apply after 0002_addresses.sql.
-- ===========================================================================

alter table public.profiles
  add column if not exists push_token text;
