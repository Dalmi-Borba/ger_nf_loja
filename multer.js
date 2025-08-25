//funcao para enviar arquivos
const express = require('express');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => cb(null, file.originalname)
});

module.exports = multer({ storage });