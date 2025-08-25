const express = require('express');
const path = require('path');
const multer = require('multer');
const routes = require('./routes/index');
const ordersRouter = require('./routes/orders');
const split_pdf = require('./routes/splitPdf');
require('dotenv').config()

const app = express();
const port = process.env.PORT;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use('/', routes);
app.use('/woo', ordersRouter);
app.use('/split', split_pdf);

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
