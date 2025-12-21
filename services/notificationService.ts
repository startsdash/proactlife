
export const notificationService = {
  // Check if browser supports notifications
  isSupported: (): boolean => {
    return 'Notification' in window;
  },

  // Request permission from user
  requestPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  },

  // Schedule a notification (Mock implementation for active tab)
  // In a real PWA this would interface with a Service Worker
  schedule: (title: string, body: string, time?: string) => {
    if (Notification.permission !== 'granted') return;

    // Simple immediate notification for demo purposes or strictly timed if tab is open
    // A real production app needs a backend or local notification SW strategy
    // Use 'any' type to avoid TS error if 'vibrate' is missing in NotificationOptions definition
    const options: any = {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200]
    };

    // If time is provided, we calculate delay (only works if tab stays open)
    if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        const scheduled = new Date();
        scheduled.setHours(hours, minutes, 0, 0);
        
        if (scheduled.getTime() <= now.getTime()) {
            // If time passed today, schedule for tomorrow
            scheduled.setDate(scheduled.getDate() + 1);
        }
        
        const delay = scheduled.getTime() - now.getTime();
        
        console.log(`Notification scheduled in ${Math.round(delay / 60000)} minutes`);
        
        setTimeout(() => {
            new Notification(title, options);
        }, delay);
    } else {
        new Notification(title, options);
    }
  }
};
