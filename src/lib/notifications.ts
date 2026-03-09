import { NotificationItem } from '@/app/types';
import { supabase } from '@/lib/supabaseClient';

const mapNotification = (row: any): NotificationItem => ({
  id: row.id,
  userId: row.user_id,
  reminderId: row.reminder_id,
  title: row.title,
  body: row.body,
  isRead: row.is_read,
  createdAt: row.created_at,
});

export const listNotifications = async (
  userId: string,
  limit = 10,
): Promise<NotificationItem[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || 'Failed to load notifications.');
  }

  return (data || []).map(mapNotification);
};

export const getUnreadNotificationCount = async (
  userId: string,
): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(error.message || 'Failed to get unread count.');
  }

  return count || 0;
};

export const markNotificationRead = async (
  notificationId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to mark notification as read.');
  }
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(error.message || 'Failed to mark all notifications as read.');
  }
};
