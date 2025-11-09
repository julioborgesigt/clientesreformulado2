// src/api/axios.js
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { getEnv } from '@/utils/env';
import { logger } from '@/utils/logger';

// Contador de requisições pendentes para debugging
let pendingRequests = 0;

// CSRF Token management
let csrfToken = null;

/**
 * Busca o CSRF token do backend
 * @returns {Promise<string>} O token CSRF
 */
async function fetchCsrfToken() {
    try {
        // CORREÇÃO: Garante que sempre usa a URL do backend
        const baseURL = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev') || 'https://clientes.domcloud.dev';
        const csrfUrl = `${baseURL}/api/csrf-token`;

        logger.log('🔐 Buscando CSRF token de:', csrfUrl);

        const response = await axios.get(csrfUrl, {
            withCredentials: true  // Importante para cookies
        });

        logger.log('📥 Resposta completa:', response);
        logger.log('📊 Status:', response.status);
        logger.log('📦 Data:', response.data);
        logger.log('🍪 Headers:', response.headers);
        logger.log('🍪 Set-Cookie:', response.headers['set-cookie']);
        logger.log('🍪 Cookies atuais do documento:', document.cookie);

        // Verificar diferentes possíveis formatos de resposta
        const token = response.data?.csrfToken || response.data?.token || response.data;

        logger.log('🔑 Token extraído:', token);

        if (token && typeof token === 'string') {
            csrfToken = token;
            logger.log('✅ CSRF token obtido com sucesso!');
            return csrfToken;
        } else {
            logger.error('❌ Formato de resposta inesperado:', {
                data: response.data,
                type: typeof response.data,
                keys: response.data ? Object.keys(response.data) : 'n/a'
            });
            throw new Error('Token CSRF não encontrado na resposta');
        }
    } catch (error) {
        logger.error('💥 Erro ao buscar CSRF token:', error);
        logger.error('📋 Detalhes do erro:', error.response?.data);
        logger.error('📋 Status do erro:', error.response?.status);
        logger.error('📋 Headers do erro:', error.response?.headers);
        throw error;
    }
}

/**
 * Inicializa o CSRF token na aplicação
 * Deve ser chamado no startup da aplicação
 */
export async function initializeCsrf() {
    try {
        await fetchCsrfToken();
    } catch (error) {
        logger.warn('Falha ao inicializar CSRF token:', error);
        // Não bloqueia a aplicação, tentará novamente nas requisições
    }
}

// Configuração do axios client
// CORREÇÃO: Sempre usa a URL do backend, nunca vazio
const baseURLEnv = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev') || 'https://clientes.domcloud.dev';
const baseURL = baseURLEnv;

// Debug: mostrar configuração
logger.log('=== CONFIGURAÇÃO AXIOS ===');
logger.log('VITE_API_URL da env:', import.meta.env.VITE_API_URL);
logger.log('baseURL calculado:', baseURL);
logger.log('Modo:', import.meta.env.DEV ? 'DESENVOLVIMENTO' : 'PRODUÇÃO');

const apiClient = axios.create({
    baseURL: baseURL, // Sempre usa URL completa do backend
    timeout: parseInt(getEnv('VITE_API_TIMEOUT', '30000')), // 30 segundos padrão
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Necessário para cookies CSRF
});

// Log da configuração final
logger.log('apiClient.defaults.baseURL:', apiClient.defaults.baseURL);

// Interceptor: Adiciona o token a CADA requisição
apiClient.interceptors.request.use(
    async (config) => {
        pendingRequests++;

        // Adicionar CSRF token para requisições que precisam (POST, PUT, DELETE, PATCH)
        const needsCsrf = ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase());

        if (needsCsrf) {
            // Se não tiver token CSRF, tenta buscar
            if (!csrfToken) {
                try {
                    logger.log('Buscando CSRF token...');
                    await fetchCsrfToken();
                } catch (error) {
                    logger.error('Falha ao obter CSRF token:', error);
                }
            }

            // Adiciona o token CSRF no header
            if (csrfToken) {
                config.headers['x-csrf-token'] = csrfToken;
                logger.log('Token CSRF adicionado à requisição');
            } else {
                logger.warn('CSRF token não disponível para ' + config.method + ' ' + config.url);
            }
        }

        // Adicionar Authorization token se não for rota de autenticação
        if (!config.url.startsWith('/auth')) {
            const authStore = useAuthStore();
            const token = authStore.token;

            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            } else {
                // Bloquear requisição se não tiver token em rotas protegidas
                pendingRequests--;
                logger.warn('Tentativa de requisição sem token');
                return Promise.reject(new Error('Token não encontrado'));
            }
        }

        return config;
    },
    (error) => {
        pendingRequests--;
        return Promise.reject(error);
    }
);

// Interceptor: Lida com respostas e erros
apiClient.interceptors.response.use(
    (response) => {
        pendingRequests--;

        // Validar estrutura básica da resposta
        if (!response.data && response.status !== 204) {
            logger.warn('Resposta sem dados');
        }

        return response;
    },
    async (error) => {
        pendingRequests--;

        // Tratamento de erros melhorado
        if (error.response) {
            const status = error.response.status;

            switch (status) {
                case 401:
                    // Token inválido ou expirado
                    logger.warn('Não autorizado - redirecionando para login');
                    const authStore = useAuthStore();
                    authStore.logout();
                    break;

                case 403:
                    // Pode ser token CSRF inválido
                    const errorMessage = error.response.data?.message || '';
                    if (errorMessage.includes('CSRF') || errorMessage.includes('csrf')) {
                        logger.warn('Token CSRF inválido, tentando renovar');
                        // Tenta buscar novo token CSRF
                        try {
                            await fetchCsrfToken();
                            // Pode-se tentar reenviar a requisição aqui se necessário
                        } catch (csrfError) {
                            logger.error('Falha ao renovar token CSRF');
                        }
                    } else {
                        logger.error('Acesso negado');
                    }
                    break;

                case 404:
                    logger.error('Recurso não encontrado');
                    break;

                case 422:
                    logger.error('Dados inválidos');
                    break;

                case 429:
                    logger.error('Muitas requisições - aguarde antes de tentar novamente');
                    break;

                case 500:
                case 502:
                case 503:
                    logger.error('Erro no servidor - tente novamente mais tarde');
                    break;

                default:
                    logger.error(`Erro ${status}`);
            }
        } else if (error.code === 'ECONNABORTED') {
            logger.error('Requisição expirou - timeout');
        } else if (error.message === 'Network Error') {
            logger.error('Erro de conexão - verifique sua internet');
        } else if (error.message === 'Token não encontrado') {
            // Erro customizado do interceptor de request
            logger.error('Token ausente para rota protegida');
        }

        return Promise.reject(error);
    }
);

// Exportar função para verificar requisições pendentes
export const hasPendingRequests = () => pendingRequests > 0;

export default apiClient;
