//crud para pasta public inserir deletar arquivos
const fs = require('fs');
const path = require('path');
require('dotenv').config()

exports.renderPageFolderPublic = (req, res) => {
    //renderiza nomes dos arquivos na pasta public
    const pasta = process.env.PATH_PUBLIC;
    fs.readdir(pasta, (err, files) => {
        if (err) console.error(err);
        res.render('folder_public', { files });
    });
}

exports.deleteFile = (req, res) => {
    const filePath = path.join(process.env.PATH_PUBLIC, req.params.file);
    fs.unlink(filePath, (err) => {
        if (err) console.error(err);
        res.redirect('/folder_public');
    });
}

exports.renderFile = (req, res) => {
    const filePath = path.join(process.env.PATH_PUBLIC, req.params.file);
    res.download(filePath);
}

exports.deleteSelectedFiles = (req, res) => {
  let toDelete = req.body.toDelete; // pode vir array ou string

  if (!toDelete) return res.redirect('/folder_public');

  // Aceita: array de checkboxes OU string "a,b,c"
  const list = Array.isArray(toDelete)
    ? toDelete
    : String(toDelete).split(',').map(s => s.trim()).filter(Boolean);

  // Sanitiza (evita path traversal) e remove duplicados
  const uniqueSafe = [...new Set(list)].map(name => path.basename(name));

  uniqueSafe.forEach((f) => {
    const p = path.join(process.env.PATH_PUBLIC, f);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (err) {
      console.error(`Erro ao excluir ${f}:`, err);
    }
  });

  res.redirect('/folder_public');
};

