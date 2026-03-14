export interface HelperAgent {
  key: string;
  title: string;
  description: string;
  status: 'placeholder-ready';
}

export const helperAgents: HelperAgent[] = [
  { key: 'weekly-reminder', title: 'Weekly reminder agent', description: 'Reminds Salud to post this week menu.', status: 'placeholder-ready' },
  { key: 'menu-send', title: 'Menu-send agent', description: 'Queues menu broadcast to contacts for SMS/email integrations.', status: 'placeholder-ready' },
  { key: 'image-suggestion', title: 'Image suggestion agent', description: 'Future helper for finding free food pictures.', status: 'placeholder-ready' },
  { key: 'order-anomaly', title: 'Order anomaly agent', description: 'Flags unusually large order totals for confirmation.', status: 'placeholder-ready' },
  { key: 'pickup-ready', title: 'Pickup ready notification agent', description: 'Placeholder for pickup-ready messaging.', status: 'placeholder-ready' },
  { key: 'delivery-status', title: 'Delivery status notification agent', description: 'Placeholder for delivery status notifications.', status: 'placeholder-ready' },
  { key: 'dessert-helper', title: 'Dessert suggestion helper', description: 'Supports dessert quick presets and suggestions.', status: 'placeholder-ready' },
  { key: 'contact-growth', title: 'Contact list growth helper', description: 'Tracks contact collection opportunities from new orders.', status: 'placeholder-ready' }
];
