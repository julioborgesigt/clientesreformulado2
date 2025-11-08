// Aguarda o DOM ser carregado antes de executar o código
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa o sistema de autenticação (busca CSRF token)
    await window.auth.initAuth();

    const toggleForms = document.querySelectorAll('.toggle-form');
    const container = document.querySelector('.auth-container');

    toggleForms.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const target = toggle.dataset.target;
            if (target === 'register') {
                container.classList.add('active');
            } else if (target === 'login') {
                container.classList.remove('active');
            }
        });
    });
});


// Eventos de login e registro já existentes



// Evento de registro
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o comportamento padrão do formulário

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        // Usa authenticatedFetch que inclui CSRF token automaticamente
        const response = await window.auth.authenticatedFetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            // Limpa o formulário
            document.getElementById('register-form').reset();
        } else {
            alert(data.error || 'Erro ao registrar usuário.');
        }
    } catch (error) {
        console.error('Erro ao registrar:', error);
        alert('Erro ao registrar.');
    }
});


// Evento de login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        // Usa authenticatedFetch que inclui CSRF token automaticamente
        const response = await window.auth.authenticatedFetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            // Salva ambos os tokens no armazenamento local
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            // Mantém compatibilidade com código legado que usa 'token'
            localStorage.setItem('token', data.accessToken);

            alert(data.message);
            window.location.href = '/dashboard.html';
        } else {
            alert(data.error || 'Erro ao fazer login.');
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert('Erro ao fazer login.');
    }
});

