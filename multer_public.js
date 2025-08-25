//funcao para enviar arquivos
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './public/',
    filename: (req, file, cb) => cb(null, file.originalname)
});

module.exports = multer({ storage });