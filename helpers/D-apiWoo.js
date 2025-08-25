async function fetchFromApi(url, options = {}) {
    try {
        // Verifica se fetch está disponível (Node.js 18+ tem fetch nativo)
        if (typeof fetch !== 'function') {
            throw new Error('Fetch não está disponível. Use Node.js 18+ ou instale node-fetch');
        }

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Erro ao fazer fetch:', error.message);
        throw error;
    }
}

module.exports = fetchFromApi;