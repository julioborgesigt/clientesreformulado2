const clientsList = document.getElementById('clients-list');
// Interações com os formulários de login e cadastro, bem como a lista de clientes
document.addEventListener('DOMContentLoaded', function () {
    const addClientForm = document.getElementById('add-client-form');
    
    const sortClientsButton = document.getElementById('sort-clients');

    function displayClients(clients) {
        clientsList.innerHTML = ''; // Limpa a lista de clientes
    
        clients.forEach(client => {
            const clientItem = document.createElement('div');
            clientItem.classList.add('client-item');
    
            // Formata a data de vencimento
            const formattedDate = client.vencimento.split('-').reverse().join('-');
    
            // Define uma classe CSS com base no status
            const statusClass = client.status === 'pendente' ? 'status-pendente' :
                                client.status === 'cobrança feita' ? 'status-cobrança-feita' :
                                client.status === 'em dias' ? 'status-em-dias' : '';
    
            // Cria os botões de ação
            clientItem.innerHTML = `
                <div class="client-info">
                    <p><strong>Nome:</strong> <span>${client.name}</span></p>
                    <p><strong>Vencimento:</strong> <span>${formattedDate}</span></p>
                    <p><strong>Serviço:</strong> <span>${client.servico}</span></p>
                    <p><strong>WhatsApp:</strong> <a href="https://wa.me/${client.whatsapp}" target="_blank">${client.whatsapp}</a></p>
                    <p><strong>Observações:</strong> <span>${client.observacoes}</span></p>
                    <p class="status ${statusClass}" style="width: 100%; text-align: center;"><strong>Status:</strong> ${client.status || 'N/A'}</p>
                </div>
                <div class="client-actions">
                    <!-- Primeira fileira: Status -->
                    <div class="button-row">
                        <button class="pendente" onclick="markAsPending(${client.id})">Pag. pendente</button>
                        <button class="cobranca" onclick="markAsPaid(${client.id})">Cobrança feita</button>
                        <button class="em-dias" onclick="markAsInDay(${client.id})">Pag. em dias</button>
                    </div>
                    <!-- Segunda fileira: Ajustes de Data -->
                    <div class="button-row">
                        <button class="add-30" onclick="adjustDate(${client.id}, 30)">+30 dias</button>
                        <button class="sub-30" onclick="adjustDate(${client.id}, -30)">-30 dias</button>
                        <button class="add-1" onclick="adjustDate(${client.id}, 1)">+1 dia</button>
                        <button class="sub-1" onclick="adjustDate(${client.id}, -1)">-1 dia</button>
                    </div>
                    <!-- Terceira fileira: Excluir e WhatsApp -->
                    <div class="button-row">
                        <button class="excluir" onclick="deleteClient(${client.id})">Excluir</button>
                         <button class="editar" onclick="showEditForm(${client.id}, '${client.name}', '${client.vencimento}', '${client.servico}', '${client.whatsapp}', '${client.observacoes}')">Editar</button>
                         <button class="whatsapp" onclick="sendWhatsAppMessage('${client.whatsapp}', '${client.id}')">WhatsApp</button>
                    </div>
                    <div class="button-row">
                   
                    </div>
                    <!-- Formulário de edição oculto -->
                    <div class="edit-form" id="edit-form-${client.id}" style="display: none;">
                        <form onsubmit="editClient(event, ${client.id})">
                            <input type="text" id="edit-name-${client.id}" value="${client.name}" placeholder="Nome">
                            <input type="date" id="edit-vencimento-${client.id}" value="${client.vencimento}" placeholder="Vencimento">
                            <input type="text" id="edit-servico-${client.id}" value="${client.servico}" placeholder="Serviço">
                            <input type="text" id="edit-whatsapp-${client.id}" value="${client.whatsapp}" placeholder="WhatsApp">
                            <textarea id="edit-observacoes-${client.id}" placeholder="Observações">${client.observacoes}</textarea>
                            <button type="submit">Salvar</button>
                            <button type="button" onclick="hideEditForm(${client.id})">Cancelar</button>
                        </form>
                    </div>

                </div>
                <button class="toggle-options" onclick="toggleOptions(this)" style="width: 100%;">Mostrar opções</button>
            `;
            clientsList.appendChild(clientItem);
        });
    }
    

       
    
    
    // Função para buscar a lista de clientes
    async function getClients() {
        try {
            const response = await fetch('/clientes/list');
            const data = await response.json();
            displayClients(data);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        }
    }

    // Enviar novo cliente
    addClientForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('client-name').value;
        const vencimento = document.getElementById('client-vencimento').value;
        const servico = document.getElementById('client-servico').value;
        const whatsapp = '+55' + document.getElementById('client-whatsapp').value; // Adiciona o prefixo
        const observacoes = document.getElementById('client-observacoes').value;
        
        // Validação de formato (11 dígitos após o prefixo)
        if (!/^\d{11}$/.test(document.getElementById('client-whatsapp').value)) {
        alert('O número de WhatsApp deve conter exatamente 11 dígitos.');
        return;
        }

        const client = { name, vencimento, servico, whatsapp, observacoes };

        try {
            const response = await fetch('/clientes/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(client)
            });
            const data = await response.json();
            alert(data.message);
            getClients(); // Atualiza a lista de clientes
        } catch (error) {
            alert('Erro ao adicionar cliente:', error);
        }
    });

    // Ordenar clientes por vencimento
    sortClientsButton.addEventListener('click', async function () {
        try {
            const response = await fetch('/clientes/list');
            const data = await response.json();
            data.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
            displayClients(data);
        } catch (error) {
            alert('Erro ao ordenar clientes:', error);
        }
    });

    // Carregar a lista de clientes ao carregar a página
    getClients();

});


// Função para buscar a lista de clientes
async function getClients() {
    try {
        const response = await fetch('/clientes/list');
        const data = await response.json();
        displayClients(data);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
    }
}


    // Carregar a mensagem padrão ao abrir o dashboard
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const response = await fetch('/clientes/get-message');
            const data = await response.json();

            if (data.message) {
                document.getElementById('default-message').value = data.message;
            }
        } catch (error) {
            console.error('Erro ao carregar mensagem padrão:', error);
        }
    });



    document.getElementById('save-message').addEventListener('click', async (e) => {
        e.preventDefault(); // Impede o comportamento padrão do botão (evitar reload da página)
        
        const message = document.getElementById('default-message').value;
    
        if (!message.trim()) {
            alert('A mensagem padrão não pode estar vazia.');
            return;
        }
    
        alert('Mensagem padrão detectada: ' + message); // Verificando o valor da mensagem
    
        try {
            // Verifica se o fetch está sendo chamado corretamente
            alert('Enviando mensagem para o servidor...');
    
            const response = await fetch('/clientes/save-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });
    
            // Verifica a resposta do servidor
            alert('Resposta do servidor recebida: ' + response.status);
    
            if (!response.ok) {
                alert('Erro ao salvar mensagem padrão.');
                throw new Error('Erro ao salvar mensagem padrão.');
            }
    
            const data = await response.json();
            alert('Mensagem salva com sucesso: ' + data.message); // Mensagem de sucesso
        } catch (error) {
            console.error('Erro ao salvar mensagem:', error);
            alert('Erro ao salvar mensagem.');
        }
    });




async function checkAlerts() {
    try {
        const response = await fetch('/clientes/alerts');
        const data = await response.json();

        if (data.length > 0) {
            alert(`Existem ${data.length} clientes com vencimento próximo!`);
        }
    } catch (error) {
        alert('Erro ao buscar alertas:', error);
    }
}

// Verificar alertas ao carregar o dashboard
document.addEventListener('DOMContentLoaded', checkAlerts);

/*
async function sendMessage(whatsapp, message) {
    try {
        const response = await fetch('/clientes/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whatsapp, message }),
        });

        const data = await response.json();
        alert(data.message);
    } catch (error) {
        alert('Erro ao enviar mensagem:', error);
    }
}
*/

function displayClients(clients) {
    clientsList.innerHTML = ''; // Limpa a lista de clientes

    clients.forEach(client => {
        const clientItem = document.createElement('div');
            clientItem.classList.add('client-item');
    
            // Formata a data de vencimento
            const formattedDate = client.vencimento.split('-').reverse().join('-');
    
            // Define uma classe CSS com base no status
            const statusClass = client.status === 'pendente' ? 'status-pendente' :
                                client.status === 'cobrança feita' ? 'status-cobrança-feita' :
                                client.status === 'em dias' ? 'status-em-dias' : '';
    
            // Cria os botões de ação
            clientItem.innerHTML = `
                <div class="client-info">
                    <p><strong>Nome:</strong> <span>${client.name}</span></p>
                    <p><strong>Vencimento:</strong> <span>${formattedDate}</span></p>
                    <p><strong>Serviço:</strong> <span>${client.servico}</span></p>
                    <p><strong>WhatsApp:</strong> <a href="https://wa.me/${client.whatsapp}" target="_blank">${client.whatsapp}</a></p>
                    <p><strong>Observações:</strong> <span>${client.observacoes}</span></p>
                    <p class="status ${statusClass}" style="width: 100%; text-align: center;"><strong>Status:</strong> ${client.status || 'N/A'}</p>
                </div>
                <div class="client-actions">
                    <!-- Primeira fileira: Status -->
                    <div class="button-row">
                        <button class="pendente" onclick="markAsPending(${client.id})">Pag. pendente</button>
                        <button class="cobranca" onclick="markAsPaid(${client.id})">Cobrança feita</button>
                        <button class="em-dias" onclick="markAsInDay(${client.id})">Pag. em dias</button>
                    </div>
                    <!-- Segunda fileira: Ajustes de Data -->
                    <div class="button-row">
                        <button class="add-30" onclick="adjustDate(${client.id}, 30)">+30 dias</button>
                        <button class="sub-30" onclick="adjustDate(${client.id}, -30)">-30 dias</button>
                        <button class="add-1" onclick="adjustDate(${client.id}, 1)">+1 dia</button>
                        <button class="sub-1" onclick="adjustDate(${client.id}, -1)">-1 dia</button>
                    </div>
                    <!-- Terceira fileira: Excluir e WhatsApp -->
                    <div class="button-row">
                        <button class="excluir" onclick="deleteClient(${client.id})">Excluir</button>
                         <button class="editar" onclick="showEditForm(${client.id}, '${client.name}', '${client.vencimento}', '${client.servico}', '${client.whatsapp}', '${client.observacoes}')">Editar</button>
                         <button class="whatsapp" onclick="sendWhatsAppMessage('${client.whatsapp}', '${client.id}')">WhatsApp</button>
                    </div>
                    <div class="button-row">
                   
                    </div>
                    <!-- Formulário de edição oculto -->
                    <div class="edit-form" id="edit-form-${client.id}" style="display: none;">
                        <form onsubmit="editClient(event, ${client.id})">
                            <input type="text" id="edit-name-${client.id}" value="${client.name}" placeholder="Nome">
                            <input type="date" id="edit-vencimento-${client.id}" value="${client.vencimento}" placeholder="Vencimento">
                            <input type="text" id="edit-servico-${client.id}" value="${client.servico}" placeholder="Serviço">
                            <input type="text" id="edit-whatsapp-${client.id}" value="${client.whatsapp}" placeholder="WhatsApp">
                            <textarea id="edit-observacoes-${client.id}" placeholder="Observações">${client.observacoes}</textarea>
                            <button type="submit">Salvar</button>
                            <button type="button" onclick="hideEditForm(${client.id})">Cancelar</button>
                        </form>
                    </div>

                </div>
                <button class="toggle-options" onclick="toggleOptions(this)" style="width: 100%;">Mostrar opções</button>
            `;
            clientsList.appendChild(clientItem);
    });
}



function toggleOptions(button) {
    const actions = button.previousElementSibling; // Seleciona o elemento de ações
    if (actions.style.display === 'none' || actions.style.display === '') {
        actions.style.display = 'flex'; // Mostra as opções
        button.textContent = 'Ocultar opções'; // Altera o texto do botão
    } else {
        actions.style.display = 'none'; // Oculta as opções
        button.textContent = 'Mostrar opções'; // Altera o texto do botão
    }
}

function toggleForm() {
    const form = document.getElementById('add-client-form');
    const isFormVisible = form.style.display === 'block'; // Verifica se o formulário está visível

    if (isFormVisible) {
        form.style.display = 'none'; // Se estiver visível, oculta
    } else {
        form.style.display = 'block'; // Se estiver oculto, exibe
    }
}
function toggleMessageForm() {
    const messageForm = document.getElementById('message-form');
    const isFormVisible = messageForm.style.display === 'block'; // Verifica se o campo está visível

    if (isFormVisible) {
        messageForm.style.display = 'none'; // Se estiver visível, oculta
    } else {
        messageForm.style.display = 'block'; // Se estiver oculto, exibe
    }
}


async function markAsInDay(id) {
    try {
        const response = await fetch(`/clientes/mark-in-day/${id}`, {
            method: 'PUT',
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.error || 'Erro ao marcar como em dias.');
            return;
        }

        const data = await response.json();
        alert(data.message);
        getClients(); // Atualiza a lista de clientes
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Erro ao atualizar status.');
    }
}



async function adjustDate(clientId, days) {
    try {
        const response = await fetch(`/clientes/adjust-date/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.error || 'Erro ao ajustar a data.');
            return;
        }

        const data = await response.json();
        alert(data.message);
        getClients(); // Atualiza a lista de clientes
    } catch (error) {
        console.error('Erro ao ajustar a data:', error);
        alert('Erro ao ajustar a data.');
    }
}

async function sendWhatsAppMessage(whatsapp, clientId) {
    try {
        // Busca a mensagem padrão do backend
        const response = await fetch('/clientes/get-message');
        const data = await response.json();

        if (!response.ok) {
            alert('Nenhuma mensagem padrão foi configurada.');
            return;
        }

        // Obtém a data de vencimento do cliente usando o clientId
        const vencimento = await getClientVencimento(clientId); // Chama a nova função que busca a data de vencimento

        if (!vencimento) {
            alert('Data de vencimento não encontrada.');
            return;
        }

        // Converte e formata a data de vencimento
        const vencimentoDate = new Date(vencimento);
        const formattedDate = vencimentoDate.toLocaleDateString('pt-BR');

        // Mensagem com a data de vencimento incluída
        const message = `${data.message} Vencimento: ${formattedDate}`;

        // Envia o link para o WhatsApp
        const whatsappLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, '_blank');
    } catch (error) {
        console.error('Erro ao enviar mensagem pelo WhatsApp:', error);
        alert('Erro ao enviar mensagem pelo WhatsApp.');
    }
}

// Função para obter a data de vencimento de um cliente usando o clientId
async function getClientVencimento(clientId) {
    try {
        const response = await fetch(`/clientes/get-vencimento/${clientId}`);
        const data = await response.json();

        if (!response.ok) {
            console.error('Erro ao buscar data de vencimento');
            return null;
        }

        return data.vencimento; // Retorna a data de vencimento
    } catch (error) {
        console.error('Erro ao obter data de vencimento:', error);
        return null;
    }
}

function showEditForm(clientId, name, vencimento, servico, whatsapp, observacoes) {
    const form = document.getElementById(`edit-form-${clientId}`);
    form.style.display = 'block';
}

function hideEditForm(clientId) {
    const form = document.getElementById(`edit-form-${clientId}`);
    form.style.display = 'none';
}


async function editClient(event, clientId) {
    event.preventDefault(); // Impede o envio do formulário padrão

    // Obtém os valores dos campos de edição
    const name = document.getElementById(`edit-name-${clientId}`).value;
    const vencimento = document.getElementById(`edit-vencimento-${clientId}`).value;
    const servico = document.getElementById(`edit-servico-${clientId}`).value;
    const whatsapp = document.getElementById(`edit-whatsapp-${clientId}`).value;
    const observacoes = document.getElementById(`edit-observacoes-${clientId}`).value;

    try {
        const response = await fetch(`/clientes/update/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, vencimento, servico, whatsapp, observacoes }),
        });

        const data = await response.json();

        if (response.ok) {
            alert('Cliente atualizado com sucesso!');
            hideEditForm(clientId);
            getClients(); // Atualiza a lista de clientes
        } else {
            alert(`Erro ao atualizar cliente: ${data.error}`);
        }
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        alert('Erro ao atualizar cliente.');
    }
}


// Função para excluir um cliente
async function deleteClient(id) {
    try {
        const response = await fetch(`/clientes/delete/${id}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        alert(data.message);
        getClients(); // Atualiza a lista de clientes
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        alert('Erro ao excluir cliente.');
    }
}

// Função para marcar cliente como "Pagamento Pendente"
async function markAsPending(id) {
    try {
        const response = await fetch(`/clientes/mark-pending/${id}`, {
            method: 'PUT',
        });
        const data = await response.json();
        alert(data.message);
        getClients(); // Atualiza a lista de clientes
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Erro ao marcar como pagamento pendente.');
    }
}

// Função para marcar cliente como "Cobrança Feita"
async function markAsPaid(id) {
    try {
        const response = await fetch(`/clientes/mark-paid/${id}`, {
            method: 'PUT',
        });
        const data = await response.json();
        alert(data.message);
        getClients(); // Atualiza a lista de clientes
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Erro ao marcar como cobrança feita.');
    }
}
