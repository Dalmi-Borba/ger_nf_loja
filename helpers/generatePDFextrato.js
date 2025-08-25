const puppeteer = require('puppeteer');
require('dotenv').config()


module.exports = async function generatePDFOrder(numero_nota, id_extrato) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();


    if (!numero_nota || !id_extrato) {
        console.log('error no pdf extrato');
        return;
    }

    await page.goto(`http://localhost:${process.env.PORT}/print_extrato/${id_extrato}`, { waitUntil: 'networkidle2' });

    // Gere o PDF
    await page.pdf({
        path: `./public/ext_${numero_nota}.pdf`,
        format: 'A4',
        printBackground: true
    });

    await browser.close();
    console.log('PDF gerado com sucesso!');
}
