/**
 * Category registry: the order, names, descriptions and subcategories of the
 * catalogue. Icons point to a category by the metadata file they live in
 * (src/catalog/metadata/<id>.json) and to a subcategory by id.
 *
 * Adding a category: add it here, create metadata/<id>.json and icons/<id>/,
 * then run `npm run catalog:index`. See docs/CATALOG.md.
 */
import type { CategoryDef } from '../types'

const sub = (id: string, pt: string, en: string) => ({ id, name: { pt, en } })

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'interface',
    name: { pt: 'Interface e navegação', en: 'Interface & navigation' },
    description: 'Os ícones que toda interface usa: menu, busca, fechar, adicionar, configurações, estados de carregamento e controles de formulário.',
    symbol: 'menu',
    subcategories: [
      sub('actions', 'Ações', 'Actions'),
      sub('navigation', 'Navegação', 'Navigation'),
      sub('controls', 'Controles', 'Controls'),
      sub('status', 'Estados e avisos', 'Status'),
      sub('view', 'Visualização', 'View'),
    ],
  },
  {
    id: 'arrows',
    name: { pt: 'Setas e direções', en: 'Arrows & directions' },
    description: 'Setas, chevrons, rotações e indicadores de direção para navegação, ordenação, transferência e movimento.',
    symbol: 'arrow-right',
    subcategories: [
      sub('arrows', 'Setas', 'Arrows'),
      sub('chevrons', 'Chevrons', 'Chevrons'),
      sub('rotation', 'Rotação e ciclos', 'Rotation'),
      sub('flow', 'Fluxo e troca', 'Flow'),
    ],
  },
  {
    id: 'text-editing',
    name: { pt: 'Texto e edição', en: 'Text & editing' },
    description: 'Formatação de texto, alinhamento, listas, edição e ferramentas de escrita para editores e documentos.',
    symbol: 'type',
    subcategories: [
      sub('formatting', 'Formatação', 'Formatting'),
      sub('alignment', 'Alinhamento', 'Alignment'),
      sub('lists', 'Listas e blocos', 'Lists & blocks'),
      sub('editing', 'Edição', 'Editing'),
    ],
  },
  {
    id: 'layout',
    name: { pt: 'Layout e janelas', en: 'Layout & windows' },
    description: 'Estruturas de tela, colunas, grades, painéis laterais, janelas e camadas para descrever interfaces e organização visual.',
    symbol: 'layout-grid',
    subcategories: [sub('grids', 'Grades e colunas', 'Grids'), sub('panels', 'Painéis e janelas', 'Panels'), sub('arrange', 'Organização', 'Arrange')],
  },
  {
    id: 'technology',
    name: { pt: 'Tecnologia e informática', en: 'Technology' },
    description: 'Dispositivos, componentes de hardware, conectividade e armazenamento: de celulares e notebooks a servidores e redes.',
    symbol: 'laptop',
    subcategories: [
      sub('devices', 'Dispositivos', 'Devices'),
      sub('hardware', 'Hardware', 'Hardware'),
      sub('connectivity', 'Conectividade', 'Connectivity'),
      sub('power', 'Energia e bateria', 'Power'),
    ],
  },
  {
    id: 'development',
    name: { pt: 'Desenvolvimento e programação', en: 'Development' },
    description: 'Código, terminal, controle de versão, bancos de dados, APIs, nuvem e depuração para ferramentas de desenvolvimento.',
    symbol: 'code',
    subcategories: [
      sub('code', 'Código', 'Code'),
      sub('version-control', 'Controle de versão', 'Version control'),
      sub('infrastructure', 'Infraestrutura e nuvem', 'Infrastructure'),
      sub('data', 'Dados e APIs', 'Data & APIs'),
    ],
  },
  {
    id: 'communication',
    name: { pt: 'Comunicação', en: 'Communication' },
    description: 'Mensagens, e-mail, chamadas, notificações e conversas para aplicativos de comunicação e suporte.',
    symbol: 'message',
    subcategories: [sub('messages', 'Mensagens', 'Messages'), sub('mail', 'E-mail', 'Mail'), sub('calls', 'Chamadas', 'Calls'), sub('notifications', 'Notificações', 'Notifications')],
  },
  {
    id: 'people',
    name: { pt: 'Usuários e pessoas', en: 'People & users' },
    description: 'Perfis, contas, grupos, papéis e gestos para representar pessoas, equipes e permissões.',
    symbol: 'user',
    subcategories: [sub('users', 'Usuários', 'Users'), sub('groups', 'Grupos', 'Groups'), sub('body', 'Corpo e gestos', 'Body & gestures'), sub('roles', 'Papéis', 'Roles')],
  },
  {
    id: 'business',
    name: { pt: 'Negócios e produtividade', en: 'Business & productivity' },
    description: 'Escritório, tarefas, projetos, metas, reuniões e organização do trabalho.',
    symbol: 'briefcase',
    subcategories: [sub('office', 'Escritório', 'Office'), sub('tasks', 'Tarefas e projetos', 'Tasks'), sub('strategy', 'Estratégia', 'Strategy')],
  },
  {
    id: 'commerce',
    name: { pt: 'Comércio e pagamentos', en: 'Commerce & payments' },
    description: 'Carrinho, sacola, loja, produtos, entregas, cupons e meios de pagamento para lojas virtuais e checkout.',
    symbol: 'shopping-cart',
    subcategories: [sub('shopping', 'Compras', 'Shopping'), sub('payments', 'Pagamentos', 'Payments'), sub('delivery', 'Entrega e estoque', 'Delivery')],
  },
  {
    id: 'finance',
    name: { pt: 'Finanças e investimentos', en: 'Finance' },
    description: 'Moedas, banco, carteira, investimentos, impostos e câmbio para aplicativos financeiros.',
    symbol: 'wallet',
    subcategories: [sub('money', 'Dinheiro', 'Money'), sub('banking', 'Banco', 'Banking'), sub('investing', 'Investimentos', 'Investing')],
  },
  {
    id: 'files',
    name: { pt: 'Arquivos e documentos', en: 'Files & documents' },
    description: 'Arquivos, pastas, documentos, anexos, transferência e organização de conteúdo digital.',
    symbol: 'file',
    subcategories: [sub('files', 'Arquivos', 'Files'), sub('folders', 'Pastas', 'Folders'), sub('documents', 'Documentos', 'Documents'), sub('transfer', 'Transferência', 'Transfer')],
  },
  {
    id: 'security',
    name: { pt: 'Segurança e privacidade', en: 'Security & privacy' },
    description: 'Cadeados, chaves, escudos, autenticação, privacidade e proteção de dados.',
    symbol: 'shield',
    subcategories: [sub('protection', 'Proteção', 'Protection'), sub('access', 'Acesso', 'Access'), sub('privacy', 'Privacidade', 'Privacy')],
  },
  {
    id: 'social',
    name: { pt: 'Redes sociais', en: 'Social' },
    description: 'Curtir, compartilhar, seguir, comentar, reações e publicações. Ícones genéricos de interação social, sem logotipos de marcas.',
    symbol: 'thumbs-up',
    subcategories: [sub('interactions', 'Interações', 'Interactions'), sub('content', 'Conteúdo', 'Content'), sub('reactions', 'Reações', 'Reactions')],
  },
  {
    id: 'media',
    name: { pt: 'Multimídia', en: 'Media' },
    description: 'Controles de reprodução, áudio, música, volume e listas para players e aplicativos de mídia.',
    symbol: 'play',
    subcategories: [sub('playback', 'Reprodução', 'Playback'), sub('audio', 'Áudio', 'Audio'), sub('music', 'Música', 'Music')],
  },
  {
    id: 'photo-video',
    name: { pt: 'Fotografia e vídeo', en: 'Photo & video' },
    description: 'Câmeras, imagens, galerias, edição de fotos, gravação e produção de vídeo.',
    symbol: 'camera',
    subcategories: [sub('photo', 'Fotografia', 'Photo'), sub('video', 'Vídeo', 'Video'), sub('editing', 'Edição de imagem', 'Image editing')],
  },
  {
    id: 'nature',
    name: { pt: 'Natureza e meio ambiente', en: 'Nature & environment' },
    description: 'Plantas, árvores, paisagens, elementos naturais, energia limpa e reciclagem.',
    symbol: 'leaf',
    subcategories: [sub('plants', 'Plantas', 'Plants'), sub('landscape', 'Paisagens', 'Landscape'), sub('ecology', 'Ecologia', 'Ecology')],
  },
  {
    id: 'animals',
    name: { pt: 'Animais', en: 'Animals' },
    description: 'Animais domésticos, selvagens, aves, peixes e insetos, além de pegadas e cuidados com pets.',
    symbol: 'cat',
    subcategories: [sub('pets', 'Domésticos', 'Pets'), sub('wild', 'Selvagens', 'Wild'), sub('birds', 'Aves', 'Birds'), sub('sea', 'Aquáticos', 'Sea life'), sub('insects', 'Insetos', 'Insects')],
  },
  {
    id: 'transport',
    name: { pt: 'Transporte', en: 'Transport' },
    description: 'Carros, ônibus, bicicletas, trens, aviões, barcos e infraestrutura de trânsito.',
    symbol: 'car',
    subcategories: [sub('road', 'Rodoviário', 'Road'), sub('rail-air-sea', 'Trilhos, ar e mar', 'Rail, air & sea'), sub('traffic', 'Trânsito', 'Traffic')],
  },
  {
    id: 'maps',
    name: { pt: 'Localização e mapas', en: 'Maps & location' },
    description: 'Marcadores, mapas, rotas, bússola, GPS e pontos de interesse para geolocalização e navegação.',
    symbol: 'map-pin',
    subcategories: [sub('location', 'Localização', 'Location'), sub('navigation', 'Navegação', 'Navigation'), sub('places', 'Lugares', 'Places')],
  },
  {
    id: 'education',
    name: { pt: 'Educação e conhecimento', en: 'Education' },
    description: 'Livros, escola, ciência, matemática, idiomas e aprendizado para plataformas de ensino.',
    symbol: 'graduation-cap',
    subcategories: [sub('school', 'Escola', 'School'), sub('science', 'Ciência', 'Science'), sub('knowledge', 'Conhecimento', 'Knowledge')],
  },
  {
    id: 'health',
    name: { pt: 'Saúde e bem-estar', en: 'Health & wellness' },
    description: 'Medicina, hospital, remédios, exames, corpo humano, exercício e bem-estar.',
    symbol: 'stethoscope',
    subcategories: [sub('medical', 'Medicina', 'Medical'), sub('body', 'Corpo', 'Body'), sub('wellness', 'Bem-estar', 'Wellness')],
  },
  {
    id: 'food',
    name: { pt: 'Alimentação', en: 'Food & drink' },
    description: 'Frutas, legumes, pratos, bebidas, cozinha e restaurante para cardápios e aplicativos de delivery.',
    symbol: 'coffee',
    subcategories: [sub('produce', 'Frutas e legumes', 'Produce'), sub('meals', 'Pratos e lanches', 'Meals'), sub('drinks', 'Bebidas', 'Drinks'), sub('kitchen', 'Cozinha', 'Kitchen')],
  },
  {
    id: 'home',
    name: { pt: 'Casa e construção', en: 'Home & building' },
    description: 'Casa, móveis, cômodos, eletrodomésticos, imóveis e construção civil.',
    symbol: 'house',
    subcategories: [sub('buildings', 'Edificações', 'Buildings'), sub('furniture', 'Móveis', 'Furniture'), sub('appliances', 'Eletrodomésticos', 'Appliances'), sub('construction', 'Construção', 'Construction')],
  },
  {
    id: 'tools',
    name: { pt: 'Indústria e ferramentas', en: 'Tools & industry' },
    description: 'Ferramentas manuais e elétricas, fábrica, engenharia e manutenção.',
    symbol: 'wrench',
    subcategories: [sub('hand-tools', 'Ferramentas manuais', 'Hand tools'), sub('industry', 'Indústria', 'Industry'), sub('maintenance', 'Manutenção', 'Maintenance')],
  },
  {
    id: 'charts',
    name: { pt: 'Gráficos e análise de dados', en: 'Charts & data' },
    description: 'Gráficos de barras, linhas, pizza e dispersão, painéis, métricas e tendências para relatórios e dashboards.',
    symbol: 'chart-bar',
    subcategories: [sub('charts', 'Gráficos', 'Charts'), sub('analytics', 'Análise', 'Analytics'), sub('trends', 'Tendências', 'Trends')],
  },
  {
    id: 'sports',
    name: { pt: 'Esportes', en: 'Sports' },
    description: 'Bolas, modalidades, academia, competições e troféus para aplicativos esportivos e de atividade física.',
    symbol: 'trophy',
    subcategories: [sub('balls', 'Esportes com bola', 'Ball sports'), sub('fitness', 'Academia e exercício', 'Fitness'), sub('competition', 'Competição', 'Competition'), sub('outdoor', 'Ao ar livre', 'Outdoor')],
  },
  {
    id: 'time',
    name: { pt: 'Tempo e calendário', en: 'Time & calendar' },
    description: 'Relógios, calendários, alarmes, cronômetros, agendamentos e histórico.',
    symbol: 'clock',
    subcategories: [sub('clocks', 'Relógios', 'Clocks'), sub('calendar', 'Calendário', 'Calendar'), sub('timers', 'Temporizadores', 'Timers')],
  },
  {
    id: 'weather',
    name: { pt: 'Clima', en: 'Weather' },
    description: 'Sol, nuvens, chuva, neve, vento, temperatura e fases da lua para previsões do tempo.',
    symbol: 'cloud-sun',
    subcategories: [sub('conditions', 'Condições', 'Conditions'), sub('precipitation', 'Precipitação', 'Precipitation'), sub('measurements', 'Medições', 'Measurements'), sub('sky', 'Céu', 'Sky')],
  },
  {
    id: 'travel',
    name: { pt: 'Viagens', en: 'Travel' },
    description: 'Bagagem, passaporte, hotel, passagens, turismo e lazer para aplicativos de viagem e hospedagem.',
    symbol: 'luggage',
    subcategories: [sub('trip', 'Viagem', 'Trip'), sub('lodging', 'Hospedagem', 'Lodging'), sub('leisure', 'Lazer e turismo', 'Leisure')],
  },
  {
    id: 'objects',
    name: { pt: 'Objetos cotidianos', en: 'Everyday objects' },
    description: 'Roupas, acessórios, utensílios, presentes e objetos de uso diário.',
    symbol: 'umbrella',
    subcategories: [sub('clothing', 'Roupas e acessórios', 'Clothing'), sub('personal', 'Uso pessoal', 'Personal'), sub('things', 'Objetos', 'Things')],
  },
  {
    id: 'symbols',
    name: { pt: 'Símbolos', en: 'Symbols' },
    description: 'Sinais matemáticos, moedas, pontuação, marcas, selos e símbolos universais.',
    symbol: 'asterisk',
    subcategories: [sub('math', 'Matemática', 'Math'), sub('signs', 'Sinais', 'Signs'), sub('marks', 'Marcas e selos', 'Marks')],
  },
  {
    id: 'shapes',
    name: { pt: 'Formas geométricas', en: 'Shapes' },
    description: 'Formas básicas, polígonos, sólidos, linhas e padrões para diagramas, ilustração e decoração.',
    symbol: 'hexagon',
    subcategories: [sub('basic', 'Formas básicas', 'Basic shapes'), sub('polygons', 'Polígonos', 'Polygons'), sub('solids', 'Sólidos e 3D', 'Solids'), sub('patterns', 'Linhas e padrões', 'Patterns')],
  },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id)
