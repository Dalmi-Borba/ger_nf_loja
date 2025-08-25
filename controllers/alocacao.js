const generatePDFextrato = require('../helpers/generatePDFextrato');
const { db, extratoDb } = require('../db');

module.exports = async function alocar(req, res) {
    
    const { id_extrato, id_xml, numero_nota, cpf_cnpj, data_extrato} = req.body;

    try {
        // Promisify as operações do banco
        await new Promise((resolve, reject) => {
            extratoDb.run(
                "UPDATE extrato SET alocado = 1, numero_nota_alocada = ? WHERE id = ?",
                [numero_nota, id_extrato],
                function(err) {
                    if (err) return reject(err);
                    console.log('Extrato atualizado com sucesso');
                    resolve();
                }
            );
        });

        let hist_assi = `Transf. PIX ${data_extrato} - ${cpf_cnpj}`;

        await new Promise((resolve, reject) => {
            db.run("UPDATE notas SET historico = ?, id_extrato_alocado = ? WHERE id = ?", [hist_assi, id_extrato, id_xml], function(err) {
                if (err) return reject(err);
                console.log('Nota atualizada com sucesso');
                resolve();
            });
        });

        await generatePDFextrato(numero_nota, id_extrato);

        res.redirect('/');
    } catch (error) {
        console.error('Erro ao alocar:', error.message);
        res.status(500).send('Erro ao processar a alocação');
    }
};