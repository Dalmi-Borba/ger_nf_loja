const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const ORDERS_DIR = 'orders';
const OUTPUT_DIR = 'public';

// Cria a pasta 'pdfs' se não existir
const ensureOutputDir = async () => {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
};

// Função para extrair e formatar dados de pagamento (mantida igual)
const getPaymentInfo = (order) => {
  const pixMeta = order.meta_data.find(meta => meta.key === '_loja5_woo_getnet_api_dados_pix');
  const creditMeta = order.meta_data.find(meta => meta.key === '_loja5_woo_getnet_api_dados');

  if (order.payment_method === 'loja5_woo_getnet_api_pix' && pixMeta && pixMeta.value) {
    const pixData = pixMeta.value;
    const transactionId = pixData.additional_data?.transaction_id || pixData.payment_id || 'N/A';
    return `
      <div style="margin-top: 10px; font-size: 12px; color: #636363;">
        <strong>Dados do Pagamento (Pix):</strong><br>
        ID da Transação: ${transactionId}
      </div>
    `;
  }

  if (order.payment_method === 'loja5_woo_getnet_api' && creditMeta && creditMeta.value && creditMeta.value.credit) {
    const credit = creditMeta.value.credit;
    return `
      <div style="margin-top: 10px; font-size: 12px; color: #636363;">
        <strong>Dados do Cartão de Crédito:</strong><br>
        Adquirente: ${credit.acquirer || 'N/A'}<br>
        Bandeira: ${credit.brand || 'N/A'}<br>
        NSU do Terminal: ${credit.terminal_nsu || 'N/A'}<br>
        ID da Transação: ${credit.transaction_id || 'N/A'}
      </div>
    `;
  }

  return `
    <div style="margin-top: 10px; font-size: 12px; color: #636363;">
      Nenhum dado de pagamento disponível
    </div>
  `;
};

// Função para gerar HTML dinâmico (mantida igual)
const generateHTML = (order) => {
  const itemsHTML = order.line_items.map(item => `
    <tr class="order_item">
      <td class="td" style="color: #636363; border: 1px solid #e5e5e5; font-family: 'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif; border-color: #e4e4e4; border-width: 1px; border-style: solid; padding: 12px; text-align: left; vertical-align: middle; word-wrap: break-word;" align="left">
        ${item.name} - SKU: ${item.sku || 'N/A'}
      </td>
      <td class="td" style="color: #636363; border: 1px solid #e5e5e5; font-family: 'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif; border-color: #e4e4e4; border-width: 1px; border-style: solid; padding: 12px; text-align: left; vertical-align: middle;" align="left">
        ${item.quantity}
      </td>
      <td class="td" style="color: #636363; border: 1px solid #e5e5e5; font-family: 'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif; border-color: #e4e4e4; border-width: 1px; border-style: solid; padding: 12px; text-align: left; vertical-align: middle;" align="left">
        <span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">R$ </span>${parseFloat(item.price).toFixed(2)}</span>
      </td>
    </tr>
  `).join('');

  const billing = order.billing;
  const shipping = order.shipping;
  const paymentInfo = getPaymentInfo(order);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @media print {
          #lastpage { page-break-after: always; }
        }
      </style>
    </head>
    <body>
      <div id="card" style="height: 100%; position: relative; background-color: #f7f7f7; margin: 0; padding: 0;" bgcolor="#f7f7f7">
        <div id="wrapper" dir="ltr" style="background-color: #f7f7f7; margin: 0; padding: 20px 0; width: 100%; -webkit-text-size-adjust: none;" bgcolor="#f7f7f7" width="100%">
          <table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%">
            <tr>
              <td align="center" valign="top">
                <table border="0" cellpadding="0" cellspacing="0" width="600" id="template_container" style="background-color: #fff; overflow: hidden; border: 1px solid #dedede; border-radius: 3px; box-shadow: 0 1px 4px 1px rgba(0,0,0,.1);" bgcolor="#fff">
                  <tr>
                    <td align="center" valign="top">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" id="template_header" style="border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: 'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif; background-color: #96588a; color: #fff;" bgcolor="#96588a">
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" valign="top">
                      <table border="0" cellpadding="0" cellspacing="0" width="600" id="template_body">
                        <tr>
                          <td valign="top" id="body_content" style="background-color: #fff;" bgcolor="#fff">
                            <table border="0" cellpadding="20" cellspacing="0" width="100%">
                              <tr>
                                <td valign="top" style="padding: 0px 48px;">
                                  <div id="body_content_inner" style="color: #636363; text-align: left; font-size: 14px; line-height: 24px; font-family: 'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif; font-weight: 400;" align="left">
                                    <h2 style="display: block; margin: 0 0 18px; text-align: left; font-size: 18px; line-height: 26px; font-family: 'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif; font-weight: 700; color: #96588a;">
                                      <a class="link" href="https://ntstorems.com.br/wp-admin/post.php?post=${order.id}&action=edit" style="text-decoration: underline; color: #96588a;">Pedido #${order.id}</a> - (${new Date(order.date_created).toLocaleDateString('pt-BR')}) - ${order.status} <br>
                                      Cliente: ${billing.first_name} ${billing.last_name} <br>
                                      CPF: ${billing.cpf || 'N/A'}
                                      ${paymentInfo}
                                    </h2>
                                    <div class="email-spacing-wrap" style="margin-bottom: 40px;">
                                      <table class="td" cellspacing="0" cellpadding="6" width="100%" border="1" style="color: #636363; border: 1px solid #e4e4e4; font-family: 'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif;">
                                        <thead>
                                          <tr>
                                            <th class="td" scope="col" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">Produto</th>
                                            <th class="td" scope="col" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">Quantidade</th>
                                            <th class="td" scope="col" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">Preço</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${itemsHTML}
                                        </tbody>
                                        <tfoot>
                                          <tr>
                                            <th class="td" scope="row" colspan="2" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">Subtotal:</th>
                                            <td class="td" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">R$ </span>${parseFloat(order.total - order.shipping_total + (order.discount_total || 0)).toFixed(2)}</span></td>
                                          </tr>
                                          <tr>
                                            <th class="td" scope="row" colspan="2" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">Desconto:</th>
                                            <td class="td" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">-${order.discount_total ? `<span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">R$</span>${parseFloat(order.discount_total).toFixed(2)}</span>` : 'R$0,00'}</td>
                                          </tr>
                                          <tr>
                                            <th class="td" scope="row" colspan="2" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">Entrega:</th>
                                            <td class="td" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">R$</span>${parseFloat(order.shipping_total).toFixed(2)}</span></td>
                                          </tr>
                                          <tr>
                                            <th class="td" scope="row" colspan="2" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">Método de pagamento:</th>
                                            <td class="td" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">${order.payment_method_title || order.payment_method}</td>
                                          </tr>
                                          <tr>
                                            <th class="td" scope="row" colspan="2" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left">Total:</th>
                                            <td class="td" style="color: #636363; border: 1px solid #e4e4e4; padding: 12px; text-align: left;" align="left"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">R$</span>${parseFloat(order.total).toFixed(2)}</span></td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                    <table id="addresses" cellspacing="0" cellpadding="0" border="0" style="width: 100%; vertical-align: top; margin-bottom: 40px;">
                                      <tr>
                                        <td class="address-container" valign="top" width="50%" style="text-align: left; padding: 0;" align="left">
                                          <h2 style="font-size: 18px; line-height: 26px; font-family: 'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif; font-weight: 700; color: #96588a;">Endereço de cobrança</h2>
                                          <address class="address">
                                            <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                                              <tr>
                                                <td class="address-td" style="border: 1px solid #e5e5e5; padding: 12px; color: #8f8f8f; text-align: left;" align="left">
                                                  ${billing.first_name} ${billing.last_name}<br>
                                                  ${billing.address_1}, ${billing.address_2 || ''}<br>
                                                  ${billing.city}<br>
                                                  ${billing.state}<br>
                                                  ${billing.postcode}<br>
                                                  <a href="mailto:${billing.email}" style="color: #96588a; text-decoration: underline; display: block;">${billing.email}</a>
                                                </td>
                                              </tr>
                                            </table>
                                          </address>
                                        </td>
                                        <td class="shipping-address-container" valign="top" width="50%" style="text-align: left; padding: 0 0 0 20px;" align="left">
                                          <h2 style="font-size: 18px; line-height: 26px; font-family: 'Helvetica Neue',Helvetica,Roboto,Arial,sans-serif; font-weight: 700; color: #96588a;">Endereço de entrega</h2>
                                          <address class="address">
                                            <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                                              <tr>
                                                <td class="address-td" style="border: 1px solid #e5e5e5; padding: 12px; color: #8f8f8f; text-align: left;" align="left">
                                                  ${shipping.first_name} ${shipping.last_name}<br>
                                                  ${shipping.address_1}, ${shipping.address_2 || ''}<br>
                                                  ${shipping.city}<br>
                                                  ${shipping.state}<br>
                                                  ${shipping.postcode}
                                                </td>
                                              </tr>
                                            </table>
                                          </address>
                                        </td>
                                      </tr>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <div id="lastpage"></div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Função para gerar PDFs para todos os JSONs disponíveis
const generateAllPDFs = async () => {
  await ensureOutputDir();

  // Lista todos os arquivos JSON na pasta orders/
  const files = await fs.readdir(ORDERS_DIR);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  console.log(`Encontrados ${jsonFiles.length} arquivos JSON na pasta ${ORDERS_DIR}`);

  const browser = await puppeteer.launch({ headless: true });
  const skippedOrders = [];
  const generatedPdfs = [];

  for (const file of jsonFiles) {
    const id = file.replace('.json', '');
    const orderPath = path.join(ORDERS_DIR, file);
    console.log(`Gerando PDF para pedido #${id}...`);

    try {
      const orderData = await fs.readFile(orderPath, 'utf8');
      const order = JSON.parse(orderData);

      const html = generateHTML(order);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: path.join(OUTPUT_DIR, `${id}.pdf`),
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      await page.close();

      console.log(`PDF gerado: ${id}.pdf`);
      generatedPdfs.push(id);
    } catch (error) {
      console.error(`Erro ao processar pedido #${id}:`, error.message);
      skippedOrders.push(id);
    }
  }

  await browser.close();

  console.log(`\nResumo:`);
  console.log(`Total de JSONs encontrados: ${jsonFiles.length}`);
  console.log(`PDFs gerados com sucesso: ${generatedPdfs.length}`);
  if (skippedOrders.length > 0) {
    console.log(`Pedidos pulados devido a erros: ${skippedOrders.join(', ')}`);
  } else {
    console.log(`Nenhum pedido foi pulado.`);
  }
  console.log("Geração de PDFs concluída!");
};

// Executa a geração para todos os JSONs
generateAllPDFs().catch(console.error);