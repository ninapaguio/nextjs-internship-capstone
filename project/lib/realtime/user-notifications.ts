export const USER_NOTIFICATIONS_UPDATED_EVENT = "notifications-updated";

// Creates the private channel owned by one application user.
export function getUserNotificationsChannelName(applicationUserId: string) {
	return `private-user-${applicationUserId}`;
}
