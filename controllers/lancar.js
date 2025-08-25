const { db } = require('../db');
const { fetchResults, fetchXml } = require('../helpers/dbQueries');

module.exports = async function lanctos(req, res) {
    const { id, historico, dateInput, cpfInput, valueInput } = req.body;

    try {
        // Atualiza o histórico
        await new Promise((resolve, reject) => {
            db.run("UPDATE notas SET historico = ? WHERE id = ?", [historico, id], (err) => {
                if (err) return reject(err);
                console.log('Nota atualizada com sucesso');
                resolve();
            });
        });

        // Busca os dados atualizados
        const xml = await fetchXml(id);
        const results = await fetchResults(dateInput, cpfInput, valueInput);

        res.render('conciliacao', { results, xml });
    } catch (error) {
        console.error('Erro ao atualizar nota:', error);
        res.status(500).send('Erro ao atualizar');
    }
};