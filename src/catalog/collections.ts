/**
 * Thematic collections: curated sets of catalogue icons for a kind of product
 * (an online store, a dashboard, a weather app). Each one lists slugs that
 * exist in the catalogue; `npm run catalog:index -- --strict` (part of verify)
 * fails when a slug does not.
 */
export interface CollectionDef {
  id: string
  name: string
  description: string
  /** Icon slugs, in display order. The first one is the collection's cover. */
  icons: string[]
}

export const COLLECTIONS: CollectionDef[] = [
  {
    id: 'ecommerce',
    name: 'Loja virtual',
    description: 'Carrinho, sacola, produtos, pagamento, entrega e pós-venda para lojas virtuais, marketplaces e checkout.',
    icons: [
      'shopping-cart', 'cart-plus', 'cart-minus', 'cart-check', 'cart-x', 'shopping-bag', 'bag-plus', 'bag-check', 'basket', 'store', 'storefront', 'tag', 'tags', 'discount',
      'percent-badge', 'coupon', 'sale-sign', 'gift-card', 'loyalty-card', 'heart', 'star', 'search', 'filter', 'credit-card', 'wallet', 'contactless', 'qr-code-pay',
      'payment-check', 'payment-x', 'installments', 'checkout', 'receipt', 'invoice', 'truck-delivery', 'shipping', 'tracking', 'package-location', 'parcel', 'box-open',
      'returns', 'refund', 'cashback', 'click-collect', 'warehouse', 'inventory',
    ],
  },
  {
    id: 'finance-app',
    name: 'Banco e finanças pessoais',
    description: 'Conta, cartões, transferências, investimentos e orçamento para bancos digitais, carteiras e controle de gastos.',
    icons: [
      'bank', 'wallet', 'credit-card', 'banknote', 'coins', 'cash', 'piggy-bank', 'savings', 'money-send', 'money-receive', 'transfer', 'statement', 'budget', 'salary',
      'loan', 'mortgage', 'interest-rate', 'tax', 'receipt-tax', 'atm', 'vault', 'currency-real', 'currency-dollar', 'currency-euro', 'currency-exchange', 'portfolio',
      'stock-up', 'stock-down', 'chart-candlestick', 'dividends', 'gold-bars', 'crypto-coin', 'insurance', 'calculator-dollar', 'chart-pie', 'trending-up', 'shield-check',
    ],
  },
  {
    id: 'project-management',
    name: 'Gestão de projetos',
    description: 'Tarefas, quadros, metas, prazos, equipes e aprovações para ferramentas de produtividade e gestão de projetos.',
    icons: [
      'kanban', 'checklist', 'task-square', 'clipboard-list', 'clipboard-check', 'backlog', 'sprint', 'gantt', 'timeline', 'roadmap', 'milestone', 'goal', 'target',
      'flag', 'priority-high', 'priority-medium', 'priority-low', 'assign', 'delegate', 'approve', 'reject', 'review', 'dependency', 'deadline', 'calendar', 'users-group',
      'meeting', 'org-chart', 'hierarchy', 'mind-map', 'brainstorm', 'presentation', 'kpi', 'growth', 'briefcase',
    ],
  },
  {
    id: 'weather-app',
    name: 'Previsão do tempo',
    description: 'Condições, chuva, neve, vento, temperatura, umidade e fases da lua para aplicativos e widgets de clima.',
    icons: [
      'sun', 'cloud-sun', 'cloud', 'clouds', 'cloud-fog', 'cloud-drizzle', 'cloud-rain', 'rain-heavy', 'cloud-rain-wind', 'cloud-lightning', 'thunderstorm', 'cloud-snow', 'snowflake',
      'cloud-sleet', 'cloud-hail', 'cloud-moon', 'moon', 'moon-star', 'wind', 'tornado', 'hurricane', 'rainbow', 'raindrop', 'umbrella', 'thermometer', 'thermometer-high',
      'thermometer-low', 'humidity', 'uv-index', 'barometer', 'sunrise', 'sunset', 'celsius', 'fahrenheit', 'moon-full', 'moon-half', 'moon-new', 'map-pin',
    ],
  },
  {
    id: 'food-delivery',
    name: 'Restaurante e delivery',
    description: 'Pratos, bebidas, cardápio, pedido e entrega para restaurantes, cafeterias e aplicativos de delivery.',
    icons: [
      'fork-knife', 'utensils', 'menu-food', 'chef-hat', 'pizza', 'burger', 'fries', 'hot-dog', 'sandwich', 'taco', 'sushi', 'noodles', 'rice-bowl', 'salad', 'soup', 'steak',
      'drumstick', 'cake', 'ice-cream-cone', 'donut', 'coffee', 'tea', 'juice', 'soda', 'beer', 'wine', 'cocktail', 'take-away', 'lunch-box', 'recipe', 'shopping-bag',
      'truck-delivery', 'tracking', 'clock', 'star', 'heart', 'map-pin', 'receipt',
    ],
  },
  {
    id: 'health-app',
    name: 'Saúde e bem-estar',
    description: 'Consultas, exames, remédios, sinais vitais e hábitos saudáveis para clínicas, telemedicina e aplicativos de bem-estar.',
    icons: [
      'stethoscope', 'hospital', 'doctor', 'nurse', 'medical-cross', 'first-aid', 'medical-bag', 'heart-pulse', 'blood-pressure', 'blood-drop', 'pill', 'pills', 'capsule',
      'prescription', 'syringe', 'vaccine', 'clipboard-medical', 'x-ray', 'thermometer', 'mask-medical', 'tooth', 'brain', 'lungs', 'heart-organ', 'weight-scale', 'bmi',
      'calories', 'sleep', 'meditation', 'yoga', 'mental-health', 'calendar-plus', 'video-call', 'bell',
    ],
  },
  {
    id: 'smart-home',
    name: 'Casa inteligente',
    description: 'Cômodos, eletrodomésticos, iluminação, clima interno e segurança para automação residencial e imobiliárias.',
    icons: [
      'smart-home', 'house', 'house-key', 'door', 'door-open', 'doorbell', 'window', 'lamp', 'ceiling-light', 'lamp-floor', 'thermostat', 'air-conditioner', 'heater', 'fan',
      'ceiling-fan', 'refrigerator', 'oven', 'microwave', 'dishwasher', 'washing-machine', 'vacuum', 'tv', 'speaker', 'wifi', 'cctv', 'door-lock', 'lock', 'bed', 'sofa',
      'bathtub', 'shower', 'garage', 'for-sale-sign', 'house-plan', 'blueprint',
    ],
  },
  {
    id: 'dashboard',
    name: 'Painel administrativo',
    description: 'Navegação, métricas, filtros, tabelas e estados para painéis de gestão e área logada.',
    icons: [
      'layout-dashboard', 'menu', 'house', 'search', 'bell', 'settings', 'user-circle', 'users', 'chart-bar', 'chart-line', 'chart-pie', 'chart-donut', 'trending-up', 'trending-down',
      'activity', 'metrics', 'report', 'filter', 'sliders', 'sort-ascending', 'sort-descending', 'calendar', 'download', 'upload', 'plus', 'more-horizontal', 'more-vertical', 'trash',
      'circle-check', 'circle-alert', 'triangle-alert', 'info', 'loader-circle', 'log-out', 'panel-left', 'layout-grid', 'list', 'external-link',
    ],
  },
  {
    id: 'dev-tools',
    name: 'Ferramentas de desenvolvimento',
    description: 'Código, terminal, controle de versão, servidores, bancos de dados e depuração para IDEs, documentação e plataformas de deploy.',
    icons: [
      'code', 'code-xml', 'terminal', 'terminal-square', 'braces', 'brackets', 'function-square', 'variable', 'regex', 'bug', 'bug-play', 'breakpoint', 'step-over', 'step-into',
      'git-branch', 'git-commit', 'git-merge', 'git-pull-request', 'git-fork', 'git-compare', 'diff', 'repository', 'package', 'component', 'api', 'webhook', 'json',
      'server', 'database', 'database-search', 'cloud-upload', 'cloud-download', 'container', 'deploy', 'pipeline', 'workflow', 'test-pass', 'test-fail', 'cache',
    ],
  },
  {
    id: 'chat-app',
    name: 'Mensagens e atendimento',
    description: 'Conversas, e-mail, chamadas e notificações para aplicativos de chat, suporte e caixas de entrada.',
    icons: [
      'message', 'messages', 'message-circle', 'message-dots', 'message-plus', 'message-reply', 'message-forward', 'message-check', 'typing-indicator', 'send', 'send-horizontal',
      'mail', 'mail-open', 'inbox', 'draft-mail', 'mail-search', 'phone', 'phone-call', 'phone-incoming', 'phone-missed', 'video-call', 'voicemail', 'headset-support',
      'bell', 'bell-ring', 'bell-off', 'contact-book', 'user-plus', 'users-group', 'paperclip', 'smile', 'microphone', 'image',
    ],
  },
  {
    id: 'media-player',
    name: 'Player de música e vídeo',
    description: 'Reprodução, volume, listas, legendas e biblioteca para players, streaming e podcasts.',
    icons: [
      'play', 'pause', 'play-pause', 'stop', 'skip-back', 'skip-forward', 'rewind', 'fast-forward', 'play-circle', 'pause-circle', 'eject', 'record',
      'volume', 'volume-1', 'volume-2', 'volume-x', 'volume-off', 'playlist', 'playlist-add', 'list-music', 'queue', 'music', 'music-note', 'album', 'disc', 'headphones',
      'microphone', 'radio', 'podcast', 'captions', 'subtitles', 'equalizer', 'audio-waveform', 'fullscreen', 'picture-in-picture', 'heart', 'share',
    ],
  },
  {
    id: 'file-manager',
    name: 'Gerenciador de arquivos',
    description: 'Arquivos, pastas, tipos de documento, transferência e organização para drives, uploads e sistemas de documentos.',
    icons: [
      'folder', 'folder-open', 'folder-plus', 'folder-tree', 'folders', 'folder-lock', 'folder-star', 'file', 'files', 'file-plus', 'file-text', 'file-image', 'file-video',
      'file-audio', 'file-code', 'file-spreadsheet', 'file-archive', 'file-lock', 'file-search', 'file-check', 'file-x', 'upload', 'download', 'share-file', 'sync', 'archive',
      'archive-restore', 'clipboard', 'paperclip', 'trash', 'copy', 'link', 'search', 'layout-grid', 'list', 'sort-ascending',
    ],
  },
  {
    id: 'auth-security',
    name: 'Login e segurança',
    description: 'Entrada, senha, verificação em duas etapas, permissões e privacidade para telas de autenticação e configurações de conta.',
    icons: [
      'log-in', 'log-out', 'user', 'user-lock', 'user-key', 'lock', 'lock-open', 'key', 'key-round', 'password', 'passkey', 'otp', 'two-factor', 'fingerprint', 'face-id',
      'scan-face', 'shield', 'shield-check', 'shield-alert', 'shield-lock', 'eye', 'eye-off', 'mail-check', 'phone', 'access-granted', 'access-denied', 'captcha',
      'encryption', 'data-protection', 'consent', 'incognito', 'circle-alert', 'circle-check',
    ],
  },
  {
    id: 'social-network',
    name: 'Rede social',
    description: 'Publicações, reações, comentários, seguidores e transmissões para redes sociais e comunidades. Sem logotipos de marcas.',
    icons: [
      'feed', 'post', 'story', 'story-plus', 'reel', 'live-stream', 'go-live', 'gallery-post', 'poll', 'thumbs-up', 'thumbs-down', 'heart', 'reaction-love', 'reaction-laugh',
      'reaction-wow', 'reaction-sad', 'clap', 'comment', 'comments', 'comment-heart', 'reply', 'repost', 'quote-post', 'share', 'send-dm', 'save-post', 'subscribe',
      'user-plus', 'users', 'community', 'forum', 'bell', 'search', 'camera', 'image', 'video',
    ],
  },
  {
    id: 'calendar-productivity',
    name: 'Agenda e produtividade',
    description: 'Calendário, horários, lembretes, tarefas e foco para agendas, reservas e aplicativos de produtividade.',
    icons: [
      'calendar', 'calendar-days', 'calendar-week', 'calendar-range', 'calendar-plus', 'calendar-check', 'calendar-x', 'calendar-clock', 'calendar-sync', 'calendar-edit',
      'agenda', 'planner', 'clock', 'alarm-clock', 'alarm-plus', 'timer', 'stopwatch', 'hourglass', 'pomodoro', 'deadline', 'recurring', 'snooze', 'history', 'bell',
      'check', 'check-check', 'square-check', 'list', 'bookmark', 'pin', 'video-call', 'users',
    ],
  },
  {
    id: 'photo-editor',
    name: 'Editor de fotos',
    description: 'Câmera, galeria, ajustes, recorte, pincéis e camadas para editores de imagem e aplicativos de criação.',
    icons: [
      'camera', 'aperture', 'image', 'images', 'gallery', 'image-plus', 'crop', 'rotate-image', 'aspect-ratio', 'grid-thirds', 'brightness', 'contrast', 'exposure',
      'saturation', 'sharpen', 'blur', 'vignette', 'curves', 'histogram', 'magic-wand', 'paintbrush', 'brush-stroke', 'eyedropper', 'color-picker', 'palette', 'swatches',
      'gradient', 'lasso', 'mask', 'layers', 'undo-circle', 'download', 'share',
    ],
  },
  {
    id: 'maps-mobility',
    name: 'Mapas e mobilidade',
    description: 'Localização, rotas, navegação e transporte para aplicativos de mapas, entregas e mobilidade urbana.',
    icons: [
      'map', 'map-pin', 'map-pins', 'map-pin-plus', 'locate', 'locate-fixed', 'navigation', 'navigation-2', 'compass', 'route', 'waypoints', 'distance', 'signpost', 'street-view',
      'globe', 'world-map', 'radar', 'car', 'taxi', 'bus', 'bus-stop', 'train', 'metro', 'tram', 'bicycle', 'kick-scooter', 'motorcycle', 'parking', 'fuel', 'ev-charger',
      'traffic-light', 'road', 'plane', 'search', 'heart',
    ],
  },
  {
    id: 'travel-booking',
    name: 'Viagem e reservas',
    description: 'Passagens, hospedagem, bagagem, documentos e passeios para aplicativos de viagem, hotéis e turismo.',
    icons: [
      'plane', 'plane-takeoff', 'plane-landing', 'airport', 'boarding-pass', 'ticket', 'passport', 'luggage', 'suitcase', 'suitcase-rolling', 'backpack-travel', 'baggage-claim',
      'customs', 'hotel', 'key-card', 'reception', 'concierge-bell', 'room-service', 'check-in', 'do-not-disturb', 'swimming-pool', 'beach', 'beach-umbrella', 'camping',
      'tent', 'museum', 'sightseeing', 'binoculars', 'itinerary', 'map', 'map-pin', 'calendar', 'globe-plane',
    ],
  },
]

export const collectionById = (id: string) => COLLECTIONS.find((c) => c.id === id)
