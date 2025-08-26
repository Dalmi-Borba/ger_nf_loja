const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');

/** ------------------ util ------------------ **/

// 1) Captura chaves de acesso em um texto de página (tolerante a separadores).
// Aceita "9999 9999 9999 ..." ou "9999999999..." (com ou sem separadores).
function findAccessKeysInText(text) {
  if (!text) return [];
  const keys = [];

  // a) 11 grupos de 4 dígitos com separador opcional (espaço . - ou quebra de linha)
  const grouped = text.matchAll(/(?:\d{4}[\s.\-]*){11}/g);
  for (const m of grouped) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length === 44) keys.push(digits);
  }

  // b) fallback: 44 dígitos colados
  const plain = text.matchAll(/\b\d{44}\b/g);
  for (const m of plain) keys.push(m[0]);

  // remove duplicatas mantendo ordem
  return [...new Set(keys)];
}

// 2) A partir da chave (44 dígitos), extrai nNF (posições 26–34, 1-based).
function nNFfromAccessKey(key44) {
  const k = String(key44 || '').replace(/\D/g, '');
  if (k.length !== 44) return null;
  const nnf = k.slice(25, 34); // 0-based: 25..33  =>  26..34 (1-based)
  return String(parseInt(nnf, 10)); // remove zeros à esquerda
}

/** ------------------ extração de texto por página ------------------ **/

async function extractTextPages(inputPath) {
  const data = fs.readFileSync(inputPath);
  const pages = [];

  await pdfParse(data, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent();
      // preserva espaçamento para facilitar o regex de 44 dígitos
      const text = content.items.map(it => it.str).join(' ');
      pages.push(text);
      return text;
    }
  });

  return pages;
}

/** ------------------ split principal ------------------ **/

async function splitPdf(inputPath, outputDir) {
  // 1) texto por página
  const pageTexts = await extractTextPages(inputPath);

  // 2) descobre a primeira chave por página e converte para nNF
  const pageNF = pageTexts.map(t => {
    const keys = findAccessKeysInText(t);
    if (!keys.length) return null;
    return nNFfromAccessKey(keys[0]) || null;
  });

  // 3) agrupar páginas por mudança de nNF
  const blocks = [];
  let currentNF = null;
  let buffer = [];

  for (let i = 0; i < pageNF.length; i++) {
    const nf = pageNF[i];

    // nova NF encontrada nesta página
    if (nf) {
      if (currentNF) blocks.push({ nf: currentNF, pages: buffer });
      currentNF = nf;
      buffer = [i]; // índice zero-based da página
    } else if (currentNF) {
      // segue pertencendo ao bloco atual
      buffer.push(i);
    }
  }
  if (currentNF && buffer.length) blocks.push({ nf: currentNF, pages: buffer });

  if (!blocks.length) {
    // Dump de debug (primeiras páginas) para ajustar regex se necessário
    try {
      const dbg = pageTexts.slice(0, 3).map((t, i) =>
        `--- PÁGINA ${i + 1} ---\n${t}\n`).join('\n');
      fs.writeFileSync(path.join(outputDir, 'DEBUG_primeiras_paginas.txt'), dbg, 'utf8');
    } catch {}
    throw new Error('Não encontrei nenhuma Chave de Acesso. Veja DEBUG_primeiras_paginas.txt e mande um trecho pra ajustarmos.');
  }

  // 4) copiar páginas com pdf-lib
  const srcBytes = fs.readFileSync(inputPath);
  const srcDoc = await PDFDocument.load(srcBytes);
  await fs.promises.mkdir(outputDir, { recursive: true });

  const written = [];
  for (const { nf, pages } of blocks) {
    const outDoc = await PDFDocument.create();
    const copied = await outDoc.copyPages(srcDoc, pages);
    copied.forEach(p => outDoc.addPage(p));
    const outBytes = await outDoc.save();
    const outPath = path.join(outputDir, `NF_${nf}.pdf`);
    fs.writeFileSync(outPath, outBytes);
    written.push(path.basename(outPath));
  }

  return written;
}

module.exports = { splitPdf };
