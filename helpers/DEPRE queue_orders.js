const sqlite3 = require('sqlite3').verbose();
const puppeteer = require('puppeteer');

// Função para gerar o PDF
async function generatePDFOrder(orderId) {
  let browser;
  try {
    browser = await puppeteer.launch({
      timeout: 60000, // 60 segundos para abrir o browser
      headless: true, // Garante que rode sem interface gráfica
    });
    const page = await browser.newPage();

    if (!orderId) {
      throw new Error('Nenhum ID informado');
    }

    console.log(`Gerando PDF para orderId: ${orderId}`);
    await page.goto(`http://localhost:4444/id/${orderId}`, { waitUntil: 'networkidle2' });

    // Gera o PDF
    await page.pdf({
      path: `C:/Users/dalmi.borba/Documents/projetos/denario_acs/public/${orderId}.pdf`,
      format: 'A4',
      printBackground: true,
    });

    console.log(`PDF gerado com sucesso para ${orderId}`);
  } catch (error) {
    throw new Error(`Erro ao gerar PDF: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

// Conecta ao banco SQLite
const db = new sqlite3.Database('./database/tasks.db', (err) => {
  if (err) console.error('Erro ao conectar ao banco no filho:', err);
  else console.log('Conectado ao banco no filho');
});

// Processa mensagens do pai
process.on('message', async (msg) => {
  const task = msg.task;
  console.log(`Processando tarefa ID ${task.id}: ${task.description}`);

  try {
    // Gera o PDF (tarefa custosa)
    await generatePDFOrder(task.description);

    // Atualiza o banco
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tasks SET completed = 1 WHERE id = ?',
        [task.id],
        (err) => {
          if (err) {
            console.error('Erro ao atualizar tarefa:', err);
            reject(err);
          } else {
            console.log(`Tarefa ${task.id} marcada como concluída`);
            resolve();
          }
        }
      );
    });

    // Envia sucesso ao pai
    process.send({ sucesso: `Tarefa ${task.id} concluída` });
    process.exit(0); // Termina com sucesso
  } catch (error) {
    console.error('Erro no processo filho:', error.message);
    process.send({ erro: `Falha ao processar tarefa ${task.id}: ${error.message}` });
    process.exit(1); // Termina com erro
  } finally {
    db.close((err) => {
      if (err) console.error('Erro ao fechar o banco:', err);
    });
  }
});