const sqlite3 = require('sqlite3');
const processarXML = require('../controllers/xmlProcessor');
const { getOrderPaymentInfo } = require('../helpers/apiWoo');

const db = new sqlite3.Database('./database/database.db', (err) => {
  if (err) console.error('Erro na conexão com o banco:', err.message);
});

const tasksDb = new sqlite3.Database('./database/tasks.db', (err) => {
  if (err) console.error('Erro na conexão com o banco:', err.message);
});


// Pré-compilar a regex fora do loop
//const regex = /Numero do Pedido (\d+)/;
const regex = /Numero do Pedido (\d+)/i;

// Função para inserir no banco de dados com Promise
const insertNota = (dadosNota, orderId, pagtoType, aut_card, dataPagtoFormat, hitorico) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO notas (natureza_operacao, numero_nota, nome_destinatario, data, valor, cpf_cnpj, observacao, order_id, caminho_arquivo, metodo_pagamento, aut_card, data_criacao_pedido, historico) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        dadosNota.natureza_operacao,
        dadosNota.numero,
        dadosNota.nome_destinatario,
        dadosNota.data,
        dadosNota.valor,
        dadosNota.cpf_cnpj,
        dadosNota.observacao,
        orderId,
        dadosNota.caminho_arquivo,
        pagtoType,
        aut_card,
        dataPagtoFormat,
        hitorico
      ],
      (err) => {
        if (err) {
          console.error('Erro ao inserir no banco:', err.message);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};


async function uploadXml(req, res) {
  const arquivos = req.files;

  // Processar todos os arquivos em paralelo
  const processamentos = arquivos.map(async (file) => {
    try {
      const dadosNota = await processarXML(file.path);
      if (!dadosNota) return;

      const obsNF = dadosNota.observacao;
      const match = obsNF.match(regex);
      const orderId = match ? match[1] : null;




      // Fazer a chamada à API
      const { pagtoType, aut_card, dataPagtoFormat } = await getOrderPaymentInfo(orderId);
      var hitorico = '';

      if (pagtoType == 'Cartão de Crédito') {
        hitorico =  `Vda ${aut_card} - ${dataPagtoFormat.split(" ")[0]} - NF-e. ${dadosNota.numero} E${orderId}`;
      }

      if (dadosNota.natureza_operacao === 'Devolucao de Venda de Mercadoria') {
        const matches = obsNF.match(/\d{3,}/g);
      
        // Detectar tipo de nota
        const tipoNota = /NFC-e/i.test(obsNF) ? 'NFC-e' :
                         /NF-e/i.test(obsNF) ? 'NF-e' :
                         'NFC-e'; // default
      
        if (matches?.length >= 2) {
          const num1 = matches[0];
          const num2 = matches[matches.length - 1];
          hitorico = `NF-e. ${num1} Dev ${tipoNota} ${num2} - ${dadosNota.numero}`;
        } else if (matches?.length === 1) {
          const num1 = matches[0];
          hitorico = `Dev ${tipoNota} ${num1} - ${dadosNota.numero}`;
        }
      }


      // Inserir no banco
      await insertNota(dadosNota, orderId, pagtoType, aut_card, dataPagtoFormat, hitorico);
    } catch (error) {
      console.error(`Erro ao processar arquivo ${file.path}: ${process.env.URL_API_WOO}`, error.message);
    }
  });

  // Aguardar todos os processamentos, mas sem bloquear a resposta
  Promise.all(processamentos)
    .then(() => 
      console.log('Todos os arquivos foram processados'))
    .catch((err) => console.error('Erro geral no processamento:', err));

  // Responder imediatamente ao cliente
  res.redirect('/');
}

module.exports = uploadXml;