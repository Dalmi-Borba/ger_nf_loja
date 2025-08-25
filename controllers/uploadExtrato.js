const fs = require('fs');
const xlsx = require('xlsx');
const { extratoDb } = require('../db');

// Variável para rastrear se a função já foi chamada (opcional, para debug)
let isProcessing = false;

exports.uploadExtrato = async (req, res) => {
  if (!req.file) {
    return res.render("index", { message: "Erro ao fazer upload." });
  }

  const filePath = req.file.path;
  console.log(`[${new Date().toISOString()}] uploadExtrato chamado com filePath:`, filePath);

  // Verifica se já está processando (opcional, para debug)
  if (isProcessing) {
    console.log("Função já em execução, ignorando chamada duplicada.");
    return res.render('upload_extrato', { message: "Processamento já em andamento." });
  }
  isProcessing = true;

  try {
    // Lê o arquivo uma vez
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(`[${new Date().toISOString()}] Total de linhas no CSV:`, data.length);
    console.log(`[${new Date().toISOString()}] Primeiras 3 linhas:`, data.slice(0, 3));

    const insertQuery = `INSERT INTO extrato (data, descricao, cpf_cnpj, valor) VALUES (?, ?, ?, ?)`;

    // Função auxiliar para inserir uma linha
    const insertRow = (row, index) => {
      return new Promise((resolve, reject) => {
        const data = row['Data'] || "";
        const descricao = row['Histórico'] || "";
        const valor = parseFloat(row['Valor (R$)'] || 0);
        const cpf_cnpj_match = descricao.match(/\b(\d{11}|\d{14})\b/);
        const cpf_cnpj = cpf_cnpj_match ? cpf_cnpj_match[0] : "";

        if (data && descricao && valor) {
          extratoDb.run(insertQuery, [data, descricao, cpf_cnpj, valor], function (err) {
            if (err) {
              console.error(`[${new Date().toISOString()}] Erro ao inserir linha ${index}:`, err.message);
              reject(err);
            } else {
              console.log(`[${new Date().toISOString()}] Linha ${index} inserida com ID: ${this.lastID}`);
              resolve();
            }
          });
        } else {
          console.log(`[${new Date().toISOString()}] Linha ${index} incompleta, ignorada:`, row);
          resolve();
        }
      });
    };

    // Processa as linhas sequencialmente
    for (let i = 0; i < data.length; i++) {
      await insertRow(data[i], i);
    }
    console.log(`[${new Date().toISOString()}] Total de linhas processadas: ${data.length}`);

    fs.unlinkSync(filePath);
    console.log(`[${new Date().toISOString()}] Arquivo ${filePath} removido.`);

    isProcessing = false;
    res.render('upload_extrato', { message: "Arquivo processado com sucesso!" });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro geral ao processar arquivo:`, error.message);
    isProcessing = false;
    res.render('upload_extrato', { message: "Erro ao processar arquivo: " + error.message });
  }
};