const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
require('dotenv').config()

async function concatPDFs(pdfPaths, outputPath) {
  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, mergedPdfBytes);
  console.log(`PDFs concatenados com sucesso em ${outputPath}`);
}

exports.merge_pdf = async (req, res) => {
  try {
    const pasta = process.env.PATH_PUBLIC;
    const outputFilePath = path.join(`${pasta}combined.pdf`);

    const dirs = req.body.dirs;
    let cleanedDirs = dirs.trimEnd(); // Remove espaços no final
    if (cleanedDirs.endsWith(',')) {
      cleanedDirs = cleanedDirs.slice(0, -1); // Remove a última vírgula
    }
    const pdfPaths = cleanedDirs.split(/\s*,\s*/);

    // Verifica quais arquivos estão faltando
    const missingFiles = [];
    pdfPaths.forEach((pdfPath) => {
      if (!fs.existsSync(pdfPath)) {
        const fileName = path.basename(pdfPath);
        missingFiles.push(fileName);
      }
    });

    // Se houver arquivos faltando, retorna uma mensagem com cada arquivo em uma linha
    if (missingFiles.length > 0) {
      const fileList = missingFiles.join('\n'); // Cada arquivo em uma nova linha
      const errorMessage = `Os seguintes arquivos não foram encontrados:\n${fileList}\nPor favor, adicione-os à pasta e tente novamente.`;
      //console.error(errorMessage);
      return res.status(400).send(errorMessage.replace(/\n/g, '<br>'));
    }

    // Realiza o merge dos PDFs de forma assíncrona
    await concatPDFs(pdfPaths, outputFilePath);

    // Envia o arquivo como download
    res.download(outputFilePath, (err) => {
      if (err) {
        console.error('Erro ao enviar o arquivo:', err);
        res.status(500).send('Erro ao enviar o arquivo');
      } else {
        console.log('Arquivo enviado com sucesso:', outputFilePath);
      }
    });
  } catch (error) {
    console.error('Erro ao combinar PDFs:', error);
    res.status(500).send('Erro ao combinar PDFs: ' + error.message);
  }
};