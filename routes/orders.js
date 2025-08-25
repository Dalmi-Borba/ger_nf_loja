// routes/orders.js
const express = require('express');
const { exec } = require('child_process');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Diretórios e arquivos
const CACHE_FILE = path.resolve(__dirname, '..', 'cache.json');
const ORDERS_DIR  = path.resolve(__dirname, '..', 'orders');
const PDF_DIR     = path.resolve(__dirname, '..', 'public');

// Servir arquivos estáticos JSON e PDF
router.use('/orders', express.static(ORDERS_DIR));
router.use('/pdfs', express.static(PDF_DIR));

// Renderiza a página dashboard com EJS
router.get('/woo', (req, res) => {
  const { message, error } = req.query;
  let orderFiles = [];
  let pdfFiles   = [];
  
  try {
    orderFiles = fs.readdirSync(ORDERS_DIR).filter(f => f.endsWith('.json'));
  } catch (e) {}
  try {
    pdfFiles = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
  } catch (e) {}

  res.render('orders', {
    message,
    error,
    orderFiles,
    pdfFiles
  });
});

// Buscar pedidos via getOrders.js
router.post('/fetch', (req, res) => {
  const { min, max } = req.body;
  const getOrders = path.resolve(__dirname, '..', 'helpers', 'getOrders.js');
  const cwd = path.resolve(__dirname, '..');

  const args = [getOrders];
  if (min) args.push(`--min=${min}`);
  if (max) args.push(`--max=${max}`);

  execFile(process.execPath, args, { cwd }, (error, stdout, stderr) => {
    if (error) {
      console.error('getOrders erro:', error, stderr);
      return res.redirect('/woo/woo?error=' + encodeURIComponent(stderr || error.message));
    }
    return res.redirect('/woo/woo?message=' + encodeURIComponent('Pedidos buscados com sucesso'));
  });
});


// Gerar todos os PDFs
router.post('/generate', (req, res) => {
  const generatePDF = path.resolve(__dirname, '..', 'helpers', 'generatePDForders.js');
  const cwd = path.resolve(__dirname, '..');

  // (opcional) garante que a pasta de saída exista
  try { fs.mkdirSync(PDF_DIR, { recursive: true }); } catch (e) {}

  execFile(
    process.execPath,                  // executa o Node atual
    [generatePDF],                     // script como 1º arg
    { cwd, env: process.env, maxBuffer: 1024 * 1024 }, // buffer maior p/ muitos logs
    (error, stdout, stderr) => {
      if (error) {
        console.error('generatePDF erro:', error, stderr);
        // Mostra o erro real na UI para diagnosticar rapidamente
        return res.redirect('/woo/woo?error=' + encodeURIComponent(stderr || error.message));
      }
      return res.redirect('/woo/woo?message=' + encodeURIComponent('PDFs gerados com sucesso'));
    }
  );
});


// Apagar JSONs selecionados
router.post('/orders/delete', (req, res) => {
  let files = req.body.toDelete;
  if (!files) {
    return res.redirect('/woo/woo');
  }
  files = Array.isArray(files) ? files : [files];
  files.forEach(f => {
    const p = path.join(ORDERS_DIR, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
  res.redirect('/woo/woo?message=Arquivos JSON removidos');
});

// Apagar todos os JSONs de pedidos
router.post('/orders/delete-all', (req, res) => {
  fs.readdirSync(ORDERS_DIR)
    .filter(f => f.endsWith('.json'))
    .forEach(f => fs.unlinkSync(path.join(ORDERS_DIR, f)));
  res.redirect('/woo/woo?message=Todos os JSONs apagados');
});

// Apagar cache.json
router.post('/cache/delete', (req, res) => {
  if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
  res.redirect('/woo/woo?message=Cache apagado');
});

module.exports = router;
