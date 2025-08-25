const fs = require('fs');
const { parseStringPromise } = require('xml2js');
const { formatarData } = require('../helpers/format_data');

async function processarXML(filePath) {
    try {
        const xmlData = fs.readFileSync(filePath, 'utf8');
        const result = await parseStringPromise(xmlData);

        // Verifica se o XML está bem estruturado
        if (!result?.nfeProc?.NFe?.[0]?.infNFe?.[0]) {
            throw new Error(`Estrutura inesperada no XML: ${filePath}`);
        }

        const nota = result.nfeProc.NFe[0].infNFe[0];

        return {
            natureza_operacao: nota.ide?.[0]?.natOp?.[0] || "Desconhecido",
            numero: nota.ide?.[0]?.nNF?.[0] || "000000",
            nome_destinatario: nota.dest?.[0]?.xNome?.[0] || "Nome não informado",
            data: nota.ide?.[0]?.dhEmi?.[0] ? formatarData(nota.ide[0].dhEmi[0]) : "Data inválida",
            valor: nota.total?.[0]?.ICMSTot?.[0]?.vNF?.[0] ? parseFloat(nota.total[0].ICMSTot[0].vNF[0]) : 0.0,
            cpf_cnpj: nota.dest?.[0]?.CNPJ?.[0] || nota.dest?.[0]?.CPF?.[0] || "Não informado",
            observacao: nota.infAdic?.[0]?.infCpl?.[0] || '',
            caminho_arquivo: filePath
        };
    } catch (error) {
        console.error(`Erro ao processar XML ${filePath}:`, error.message);
        return null;
    }
}

module.exports = processarXML;
