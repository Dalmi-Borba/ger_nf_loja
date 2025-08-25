const sqlite3 = require("sqlite3").verbose();

// Conexão com o banco de dados SQLite
const db = new sqlite3.Database("./database/database.db", (err) => {
  if (err) console.error(err.message);
});

const extratoDb = new sqlite3.Database("./database/extratoDb.db", (err) => {
  if (err) console.error("Erro na conexão com o banco:", err.message);
});

const taskDb = new sqlite3.Database("./database/tasks.db", (err) => {
  if (err) console.error("Erro ao conectar ao banco:", err);
  else console.log("Conectado ao SQLite");
});

// cria a tabela notas se não existir
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS notas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        natureza_operacao TEXT,
        numero_nota TEXT,
        nome_destinatario TEXT,
        data TEXT,
        valor REAL,
        cpf_cnpj TEXT,
        observacao TEXT,
        order_id TEXT,
        caminho_arquivo TEXT,
        nota_informativa TEXT,
        metodo_pagamento TEXT,
        data_criacao_pedido TEXT,
        aut_card TEXT,
        historico TEXT,
        id_extrato_alocado INTEGER
    )`);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS lancamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        valor REAL,
        data_pagamento TEXT,
        numero_nota TEXT,
        numero_pedido TEXT,
        hitorico TEXT,
        metodo_pagamento TEXT,
        id_extrato_alocado INTEGER
    )`);
});

extratoDb.run(`
    CREATE TABLE IF NOT EXISTS extrato (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT,
    descricao TEXT,
    cpf_cnpj TEXT,
    valor REAL,
    alocado INTEGER,
    numero_nota_alocada TEXT
    )
`);

taskDb.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    completed INTEGER
)`);

module.exports = { db, extratoDb, taskDb };
