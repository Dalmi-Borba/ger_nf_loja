// helpers/apiWoo.js
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
require('dotenv').config()

// timezone do seu servidor/projeto (Campo Grande/MS)
const TZ = 'America/Campo_Grande';

const api = new WooCommerceRestApi({
  url: process.env.HOST_STORE,
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
  wpAPI: true,
  version: "wc/v3"
});

/**
 * Formata data/hora em pt-BR respeitando o fuso configurado.
 */
function formatarDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const data = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ }).format(d);
  const hora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit'
  }).format(d);
  return `${data} ${hora}`;
}

/**
 * Busca o pedido no WooCommerce e extrai:
 * - pagtoType: tipo do pagamento
 * - aut_card: NSU/transaction id (quando houver)
 * - dataPagtoFormat: data/hora legível do pagamento/criação
 * Retorna também o `order` completo (caso precise em outro lugar).
 */
async function getOrderPaymentInfo(orderId) {
  if (!orderId) throw new Error('orderId é obrigatório');

  const resp = await api.get(`orders/${orderId}`);
  const order = resp.data;

  // defaults
  let pagtoType = order.payment_method_title || order.payment_method || '';
  let aut_card = '';
  let dataPagtoFormat = formatarDataHora(order.date_created);

  // Metadados Getnet (crédito)
  const creditMeta = order.meta_data?.find(m => m.key === '_loja5_woo_getnet_api_dados');
  const credit = creditMeta?.value?.credit;

  // Metadados Getnet (PIX)
  const pixMeta = order.meta_data?.find(m => m.key === '_loja5_woo_getnet_api_dados_pix');
  const pix = pixMeta?.value;

  if (credit) {
    pagtoType = 'Cartão de Crédito';
    aut_card = credit.terminal_nsu || credit.transaction_id || '';
    dataPagtoFormat = formatarDataHora(credit.created_at || order.date_created);
  } else if (pix) {
    pagtoType = 'Pix';
    aut_card = pix.additional_data?.transaction_id || pix.payment_id || '';
    dataPagtoFormat = formatarDataHora(pix.created_at || order.date_created);
  }

  return { pagtoType, aut_card, dataPagtoFormat, order };
}

module.exports = { getOrderPaymentInfo };
