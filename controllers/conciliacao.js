const { fetchResults, fetchXml } = require('../helpers/dbQueries');

module.exports = async function conciliacao(req, res) {
    const { dateInput, cpfInput, valueInput, idXml } = req.body;

    try {
        const results = await fetchResults(dateInput, cpfInput, valueInput);
        const xml = await fetchXml(idXml);

        res.render('conciliacao', { results, xml });
    } catch (error) {
        console.error('Erro na busca:', error);
        res.status(500).json({ error: 'Erro ao realizar a pesquisa' });
    }
};