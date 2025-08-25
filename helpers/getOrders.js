// no topo de getOrders.js
require('dotenv').config()
const argv = require('minimist')(process.argv.slice(2));
const minId = parseInt(argv.min, 10);
const maxId = parseInt(argv.max, 10);

if (isNaN(minId) || isNaN(maxId)) {
  console.error('Você precisa passar --min e --max válidos');
  process.exit(1);
}

const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const fs = require('fs').promises;
const path = require('path');

const api = new WooCommerceRestApi({
  url: process.env.HOST_STORE,
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
  wpAPI: true,
  version: "wc/v3"
});

const CACHE_FILE = 'cache.json';
const ORDERS_DIR = 'orders';

// Cria a pasta 'orders' se não existir
const ensureOrdersDir = async () => {
  try {
    await fs.mkdir(ORDERS_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
};

// Carrega o cache
const loadCache = async () => {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
};

// Salva o cache
const saveCache = async (cache) => {
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
};

// Salva um pedido individual como JSON
const saveOrder = async (order) => {
  const filePath = path.join(ORDERS_DIR, `${order.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(order, null, 2), 'utf8');
};

// Carrega um pedido do arquivo
const loadOrder = async (id) => {
  const filePath = path.join(ORDERS_DIR, `${id}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null; // Retorna null se o pedido não estiver salvo
  }
};

const fetchOrdersInRange = async (minId, maxId) => {
  let allOrders = [];
  let page = 1;
  let hasMoreOrders = true;
  const cache = await loadCache();

  await ensureOrdersDir();
  console.log(`Iniciando busca de pedidos entre ${minId} e ${maxId}`);

  try {
    while (hasMoreOrders) {
      const cacheKey = `page_${page}`;

      // Verifica o cache
      if (cache[cacheKey]) {
        console.log(`Usando cache para página ${page}`);
        const cachedPage = cache[cacheKey];
        const filteredIds = cachedPage.orders.filter(id => id >= minId && id <= maxId);

        // Carrega os pedidos do disco
        for (const id of filteredIds) {
          const order = await loadOrder(id);
          if (order) allOrders.push(order);
        }

        if (cachedPage.minId <= minId || cachedPage.orders.length === 0) {
          hasMoreOrders = false;
          console.log("Parando busca: cache cobriu o intervalo ou fim dos dados");
        }
        page++;
        continue;
      }

      // Busca na API
      console.log(`Buscando página ${page} na API...`);
      const response = await api.get("orders", {
        orderby: "id",
        order: "desc",
        per_page: 100,
        page: page
      });

      const orders = response.data;
      console.log(`Recebidos ${orders.length} pedidos na página ${page}`);

      if (orders.length > 0) {
        const minIdPage = orders[orders.length - 1].id;
        const maxIdPage = orders[0].id;
        console.log(`Primeiro ID: ${maxIdPage}, Último ID: ${minIdPage}`);

        // Filtra e salva os pedidos
        const filteredOrders = orders.filter(order => order.id >= minId && order.id <= maxId);
        console.log(`Filtrados ${filteredOrders.length} pedidos dentro do intervalo`);
        if (filteredOrders.length > 0) {
          allOrders.push(...filteredOrders);
        }

        // Salva cada pedido em um arquivo individual
        for (const order of orders) {
          await saveOrder(order);
        }

        // Salva apenas os IDs no cache
        const orderIds = orders.map(order => order.id);
        cache[cacheKey] = { minId: minIdPage, maxId: maxIdPage, orders: orderIds };
        await saveCache(cache);

        // Condição de parada
        if (minIdPage <= minId || minIdPage <= 10000 || orders.length === 0) {
          hasMoreOrders = false;
          console.log("Parando busca: intervalo atingido, limite 10000 ou fim dos dados");
        }
      } else {
        hasMoreOrders = false;
        console.log("Parando busca: sem mais pedidos");
      }

      page++;
    }

    console.log(`Total de pedidos encontrados: ${allOrders.length}`);
    return allOrders;
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error.response ? error.response.data : error.message);
    return [];
  }
};

/*
fetchOrdersInRange(14224, 14300).then(orders => {
  console.log("Pedidos encontrados:", orders);
  console.log("Busca concluída");
});
*/

// Em vez de fetchOrdersInRange(14224, 14300)…
fetchOrdersInRange(minId, maxId)
  .then(orders => {
    console.log("Pedidos encontrados:", orders.length);
    console.log("Busca concluída");
  })
  .catch(err => console.error(err));
