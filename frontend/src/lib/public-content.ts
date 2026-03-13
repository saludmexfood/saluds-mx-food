export type Locale = 'en' | 'es';

export const copy = {
  en: {
    wordmark: "Salud's Mexican Meals",
    menuTitle: "This Week's Menu",
    subtitle: 'Homestyle Mexican food made fresh for you.',
    orderNow: 'Order Now',
    cartSummary: 'Cart Summary',
    deliveryInfo: 'Delivery Details',
    checkout: 'Checkout with Stripe',
    checkoutRedirect: 'Redirecting to Stripe…',
    emptyCart: 'Your cart is empty.',
    loading: 'Loading menu…',
    noMenu: 'No menu published yet. Check back soon!',
    aboutTitle: 'About Salud',
    aboutBody:
      "At Salud's Mexican Meals, every plate is made with warmth, tradition, and care. We are a family-rooted kitchen focused on fresh ingredients, authentic flavor, and dependable weekly service for our community.",
    aboutBody2:
      'From weekday comfort meals to special treats, we prepare each order with intention so your table feels welcoming and full.',
    panelTitle: 'Hours & Contact',
    chatTitle: 'Ask Salud Assistant',
    chatPlaceholder: 'Ask about menu, ingredients, orders, pickup, or contact info…',
    chatNudge: 'I can help with menu items, ordering, pickup/delivery, and contact information.',
    disclaimer: 'Food allergy notice: dishes may contain common allergens. Please ask before ordering.'
  },
  es: {
    wordmark: 'Comidas Mexicanas de Salud',
    menuTitle: 'Menú de Esta Semana',
    subtitle: 'Comida casera mexicana hecha fresca para ti.',
    orderNow: 'Ordenar Ahora',
    cartSummary: 'Resumen del Carrito',
    deliveryInfo: 'Datos de Entrega',
    checkout: 'Pagar con Stripe',
    checkoutRedirect: 'Redirigiendo a Stripe…',
    emptyCart: 'Tu carrito está vacío.',
    loading: 'Cargando menú…',
    noMenu: 'Aún no hay menú publicado. ¡Vuelve pronto!',
    aboutTitle: 'Sobre Salud',
    aboutBody:
      'En Comidas Mexicanas de Salud, cada platillo se prepara con calidez, tradición y cuidado. Somos una cocina con raíces familiares, enfocada en ingredientes frescos y sabor auténtico.',
    aboutBody2:
      'Desde comidas reconfortantes hasta postres especiales, preparamos cada orden para servir a nuestra comunidad con cariño.',
    panelTitle: 'Horario y Contacto',
    chatTitle: 'Asistente de Salud',
    chatPlaceholder: 'Pregunta sobre menú, ingredientes, pedidos, entrega o contacto…',
    chatNudge: 'Te puedo ayudar con menú, pedidos, entrega/recoger y contacto.',
    disclaimer: 'Aviso de alergias: los platillos pueden contener alérgenos comunes. Pregunta antes de ordenar.'
  }
} as const;
