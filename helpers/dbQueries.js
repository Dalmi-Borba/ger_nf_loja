const { db, extratoDb } = require('../db');

async function fetchResults(dateInput, cpfInput, valueInput) {
    const value = parseFloat(valueInput);
    if (isNaN(value)) {
        throw new Error('Valor inválido fornecido');
    }

    return new Promise((resolve, reject) => {
        extratoDb.all('SELECT * FROM extrato', (err, rows) => {
            if (err) return reject(err);

            const filtered = rows
                .map(row => {
                    let points = 0;
                    if (row.data && dateInput && row.data === dateInput) points += 1;
                    if (row.cpf_cnpj && cpfInput && row.cpf_cnpj === cpfInput) points += 2;
                    if (row.valor && !isNaN(row.valor) && Math.abs(row.valor - value) < 0.01) points += 2;

                    return { ...row, accuracy: points };
                })
                .filter(row => row.accuracy >= 2)
                .sort((a, b) => b.accuracy - a.accuracy);

            resolve(filtered);
        });
    });
}

async function fetchXml(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM notas WHERE id = ?', [id], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

module.exports = { fetchResults, fetchXml };