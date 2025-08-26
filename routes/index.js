//routes/index.js
const express = require('express');
const multer = require('multer');
const upload = require('../multer');
const uploadPublic = require('../multer_public');
const uploadExtrato = require('../controllers/uploadExtrato');
//const generatePDFOrder = require('../controllers/generatePDFOrder');
const conciliacao = require('../controllers/conciliacao');
const getRowsAroundId = require('../controllers/printExtrato');
const uploadXml = require('../controllers/uploadXml');
const alocar = require('../controllers/alocacao');
const merge_pdf = require('../controllers/merge_pdf');
const lancar = require('../controllers/lancar');
const folder_public = require('../controllers/folder_public');
const router = express.Router();
const { db } = require('../db');
const path = require('path');
const fs = require('fs');
/** 
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });
*/


// Rota principal
router.get('/', (req, res) => {
    db.all("SELECT * FROM notas", [], (err, rows) => {
        if (err) console.error(err.message);
        if (!rows) {
            res.render('index', { notas: [] });
        } else {
            res.render('index', { notas: rows });
        }
    });
});

router.get('/movimento', (req, res) => {
    let path_public =  process.env.PATH_PUBLIC;
    db.all("SELECT * FROM notas ORDER BY CAST(numero_nota AS INTEGER) ASC;", [], (err, rows) => {
        if (err) console.error(err.message);
        if (!rows) {
            res.render('merge_pdf', { notas: [], path_public });
        } else {
            res.render('merge_pdf', { notas: rows, path_public });
        }
    });
});

router.get('/lctos-vendas', (req, res) => {
    db.all("SELECT * FROM notas ORDER BY CAST(numero_nota AS INTEGER) ASC;", [], (err, rows) => {
        if (err) console.error(err.message);
        if (!rows) {
            res.render('lancamentos_vendas', { notas: [] });
        } else {
            res.render('lancamentos_vendas', { notas: rows });
        }
    });
});

router.get('/lctos-devolucao', (req, res) => {
    db.all("SELECT * FROM notas ORDER BY CAST(numero_nota AS INTEGER) ASC;", [], (err, rows) => {
        if (err) console.error(err.message);
        if (!rows) {
            res.render('lancamentos_devolucao', { notas: [] });
        } else {
            res.render('lancamentos_devolucao', { notas: rows });
        }
    });
});

router.get("/upload_extrato", (req, res) => {
    res.render("upload_extrato", { message: null });
});

router.get("/config", (req, res) => {
    res.render("config", { message: null });
});

//router.get('/order/:id', generatePDFOrder);
router.post('/upload_extrato', upload.single('file'), uploadExtrato.uploadExtrato);
router.post('/conciliacao', conciliacao);
router.get('/print_extrato/:id', getRowsAroundId);

router.post('/upload', upload.array('xmls'), uploadXml);
router.post('/alocar', alocar);

router.post('/merge', merge_pdf.merge_pdf);

router.post('/lancar', lancar);
router.get('/folder_public', folder_public.renderPageFolderPublic);
router.get('/folder_public/delete/:file', folder_public.deleteFile);
router.post('/folder_public/upload', uploadPublic.array('files'), folder_public.renderPageFolderPublic);
router.get('/public/:file', folder_public.renderFile);
router.post('/folder_public/delete', folder_public.deleteSelectedFiles);


//router update nota_informativa
router.post('/update', async (req, res) => {
    const { id, nota_informativa } = req.body;
    db.run("UPDATE notas SET nota_informativa = ? WHERE id = ?", [nota_informativa, id], (err) => { if (err) console.error(err.message); });
    res.redirect('/');
});


//POST /reset-db — apaga todas as linhas de notas e lancamentos
router.post('/reset-db', (req, res, next) => {
  db.serialize(() => {
    // Desativa restrições para evitar erros de FK
    db.run('PRAGMA foreign_keys = OFF', err => {
      if (err) return next(err);

      // Apaga todas as linhas de cada tabela
      db.run('DELETE FROM notas',          err => err && console.error('limpando notas:', err));
      db.run('DELETE FROM lancamentos',    err => err && console.error('limpando lancamentos:', err));

      // Zera o contador de AUTOINCREMENT
      db.run('DELETE FROM sqlite_sequence', err => err && console.error('limpando sqlite_sequence:', err));

      // Restaura as FKs
      db.run('PRAGMA foreign_keys = ON', err => {
        if (err) console.error('reativando FKs:', err);
      });

      // Recompacta o arquivo para liberar espaço
      db.run('VACUUM', err => {
        if (err) return next(err);
        // Tudo pronto
        res.sendStatus(204);
      });
    });
  });
});

// Rota para **limpar tudo** de public/
router.post('/clear-public', (req, res) => {
    const PUBLIC_DIR = path.join(__dirname, '..', 'public');
  
    // apaga **tudo** dentro de public, arquivos e pastas
    fs.readdirSync(PUBLIC_DIR).forEach(name => {
      const target = path.join(PUBLIC_DIR, name);
      fs.rmSync(target, { recursive: true, force: true });
    });
  
    // opcional: recria a pasta vazia (não estritamente necessário se ela ainda existe)
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  
    // retorna sem conteúdo
    res.redirect('/config');
  });

module.exports = router;
