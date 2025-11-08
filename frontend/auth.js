// frontend/auth.js
// Utilitário para gerenciamento de autenticação e tokens

let csrfToken = null;

/**
 * Obtém o CSRF token do servidor
 * @returns {Promise<string>} CSRF token
 */
async function fetchCsrfToken() {
    try {
        const response = await fetch('/api/csrf-token', {
            credentials: 'include' // Importante para cookies
        });

        if (!response.ok) {
            throw new Error('Falha ao obter CSRF token');
        }

        const data = await response.json();
        csrfToken = data.csrfToken;
        return csrfToken;
    } catch (error) {
        console.error('Erro ao obter CSRF token:', error);
        throw error;
    }
}

/**
 * Renova o access token usando o refresh token
 * @returns {Promise<boolean>} true se renovado com sucesso, false caso contrário
 */
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
        console.error('Refresh token não encontrado');
        return false;
    }

    try {
        // Garante que temos o CSRF token
        if (!csrfToken) {
            await fetchCsrfToken();
        }

        const response = await fetch('/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
            console.error('Falha ao renovar token');
            // Se o refresh token também expirou, redireciona para login
            if (response.status === 401) {
                logout();
            }
            return false;
        }

        const data = await response.json();

        // Atualiza os tokens no localStorage
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        console.log('Token renovado com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao renovar token:', error);
        return false;
    }
}

/**
 * Faz uma requisição autenticada com retry automático se o token expirar
 * @param {string} url - URL da requisição
 * @param {object} options - Opções do fetch
 * @returns {Promise<Response>} Resposta da requisição
 */
async function authenticatedFetch(url, options = {}) {
    // Garante que temos o CSRF token para requisições que precisam
    const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
        (options.method || 'GET').toUpperCase()
    );

    if (needsCsrf && !csrfToken) {
        await fetchCsrfToken();
    }

    // Prepara os headers
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    // Adiciona CSRF token se necessário
    if (needsCsrf && csrfToken) {
        headers['x-csrf-token'] = csrfToken;
    }

    // Faz a requisição inicial
    let response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
    });

    // Se recebeu 401, tenta renovar o token e refaz a requisição
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
            // Atualiza o token nos headers e tenta novamente
            const newToken = localStorage.getItem('accessToken');
            headers['Authorization'] = `Bearer ${newToken}`;

            response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include'
            });
        } else {
            // Se não conseguiu renovar, redireciona para login
            logout();
        }
    }

    return response;
}

/**
 * Retorna headers de autenticação incluindo CSRF token
 * @param {string} contentType - Content-Type header (opcional)
 * @returns {object} Headers object
 */
function getAuthHeaders(contentType = 'application/json') {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`
    };

    // Adiciona Content-Type se especificado
    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    // Adiciona CSRF token se disponível
    if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
    }

    return headers;
}

/**
 * Faz logout revogando o refresh token
 */
async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken && csrfToken) {
        try {
            await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({ refreshToken })
            });
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }

    // Limpa o localStorage e redireciona
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/';
}

/**
 * Inicializa o sistema de autenticação
 * Deve ser chamado quando a página carrega
 */
async function initAuth() {
    // Busca o CSRF token
    try {
        await fetchCsrfToken();
    } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
    }
}

// Exporta as funções para uso global
window.auth = {
    initAuth,
    fetchCsrfToken,
    refreshAccessToken,
    authenticatedFetch,
    getAuthHeaders,
    logout
};
