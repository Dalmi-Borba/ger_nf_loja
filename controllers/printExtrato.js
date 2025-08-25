const { extratoDb } = require('../db');

module.exports = async function getRowsAroundId(req, res) {

    let rowId = parseInt(req.params.id, 10); // Converte para número
    
    try {
        const getRows = (query, params) => {
            return new Promise((resolve, reject) => {
                extratoDb.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        };

        const query = `
            SELECT *
            FROM extrato
            WHERE id BETWEEN ? - 5 AND ? + 5
            ORDER BY id ASC
        `;

        const rows = await getRows(query, [rowId, rowId]);
        
        res.render('extrato', { rows: rows, rowId });

    } catch (error) {
        console.error('Erro ao buscar linhas:', error);
        throw error;
    } 
};