// routes/splitPdf.js
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
// ❌ não usamos mais Python
// const { exec } = require('child_process');
const { splitPdf } = require('../helpers/split_pdf');

const router = express.Router();

// 1) pasta pública raiz (recebe uploads e splits)
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

router.use('/public', express.static(PUBLIC_DIR));

// 2) Multer grava todo PDF em public/
const storage = multer.diskStorage({
  destination: PUBLIC_DIR,
  filename: (req, file, cb) => {
    // nomeia apenas o upload como split_<ts>.pdf
    cb(null, `split_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// 3) GET /split → form de upload
router.get('/split', (req, res) => {
  res.render('upload_notas', { files: null, error: null });
});

// 4) POST /split → recebe, limpa antigos, processa em Node e lista resultados
router.post('/split', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.render('upload_notas', { files: null, error: 'Nenhum arquivo selecionado.' });
    }

    const current   = req.file.filename;
    const inputPath = path.join(PUBLIC_DIR, current);

    // a) apaga uploads antigos (só os split_*.pdf), mantém só o atual
    fs.readdirSync(PUBLIC_DIR)
      .filter(f => f.startsWith('split_') && f !== current)
      .forEach(f => fs.unlinkSync(path.join(PUBLIC_DIR, f)));

    // b) apaga splits antigos (só os NF_*.pdf)
    fs.readdirSync(PUBLIC_DIR)
      .filter(f => f.startsWith('NF_') && f.endsWith('.pdf'))
      .forEach(f => fs.unlinkSync(path.join(PUBLIC_DIR, f)));

    // c) processa o PDF no Node (sem Python)
    await splitPdf(inputPath, PUBLIC_DIR);

    // d) lista apenas os novos NF_*.pdf gerados em public/
    const files = fs.readdirSync(PUBLIC_DIR)
      .filter(f => f.startsWith('NF_') && f.endsWith('.pdf'));

    res.render('upload_notas', { files, error: null });
  } catch (err) {
    console.error(err);
    res.render('upload_notas', { files: null, error: err.message || 'Erro ao processar PDF.' });
  }
});

module.exports = router;
