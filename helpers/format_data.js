function formatarData(dataOriginal) {
    if (!dataOriginal) return null; // Caso a data seja nula

    // Converter para objeto Date (caso venha no formato YYYY-MM-DD ou timestamp)
    const data = new Date(dataOriginal);

    // Formatar para DD/MM/YYYY
    return new Intl.DateTimeFormat('pt-BR').format(data);
}

module.exports = { formatarData };