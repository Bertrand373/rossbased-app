// src/utils/testNotification.js
// Utility function to test push notifications

export const testLocalNotification = async () => {
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.error('Notification permission not granted');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification('🔥 Test Notification', {
      body: 'This is a test notification from TitanTrack!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: '/' },
      actions: [
        { action: 'open', title: 'View' },
        { action: 'close', title: 'Dismiss' }
      ],
      tag: 'test-notification'
    });

    console.log('✅ Test notification sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to send test notification:', error);
    return false;
  }
};

// Function to send notification via Firebase (requires backend)
export const sendFirebaseNotification = async (fcmToken, title, body) => {
  try {
    // This would be called from your backend
    // For now, this is just a placeholder
    console.log('To send Firebase notification, use your backend with FCM token:', fcmToken);
    console.log('Title:', title);
    console.log('Body:', body);
    
    // Example backend API call (you'll need to implement this)
    // const response = await fetch('/api/notifications/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ token: fcmToken, title, body })
    // });
    
    return true;
  } catch (error) {
    console.error('Failed to send Firebase notification:', error);
    return false;
  }
};