// Variáveis globais
let clients = [];
let modal, modalBody;
let chart;  // Variável para o gráfico
let bsModal; // Caso use modal customizado
// NOVO: Adicionar estado de paginação e filtro
let currentPage = 1;
let currentStatusFilter = 'vence3'; // O filtro ativo (default)
let currentSearch = '';
// (Fim da adição)

// NOVO: Funções para controlar o Dropdown de Ações
// ATUALIZADA: Agora também limpa a classe .row-is-active das linhas <tr>
let activeDropdownMenu = null;
function closeAllDropdowns() {
  if (activeDropdownMenu) {
    // Remove o menu do body
    if (activeDropdownMenu.parentNode === document.body) {
      document.body.removeChild(activeDropdownMenu);
    }
    // Opcional: Adiciona classe hidden caso ainda não tenha sido removido
    activeDropdownMenu.classList.add('hidden');
    activeDropdownMenu.classList.remove('show-down', 'show-up');
    activeDropdownMenu = null;
  }
  // Remove a classe de highlight da linha (se existir)
  document.querySelectorAll('tr.row-is-active').forEach(row => {
    row.classList.remove('row-is-active');
  });
}

// ATUALIZADA: Agora adiciona a classe .row-is-active na linha-pai <tr>
window.toggleDropdown = function(event, clientId) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  const menuElement = document.getElementById(`dropdown-${clientId}`); // Pega o TEMPLATE do menu

  // Se este menu já está ativo, fecha-o
  if (menuElement === activeDropdownMenu) {
    closeAllDropdowns();
    return;
  }

  // Fecha qualquer outro menu que possa estar aberto
  closeAllDropdowns();

  // --- Mover e Posicionar ---

  // 1. Clona o menu para não remover o original da tabela
  const menuClone = menuElement.cloneNode(true);
  menuClone.id = `active-dropdown-${clientId}`; // Dá um ID único ao clone ativo
  menuClone.classList.remove('hidden'); // Garante que não está escondido por padrão

  // 2. Adiciona o clone ao body
  document.body.appendChild(menuClone);
  activeDropdownMenu = menuClone; // Rastreia o menu ativo

  // 3. Obtém posições e dimensões
  const buttonRect = button.getBoundingClientRect();
  const menuRect = menuClone.getBoundingClientRect(); // Mede o clone já no body
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth; // Adicionado para cálculo horizontal

  // 4. Calcula o espaço e decide a direção vertical
  const spaceBelow = viewportHeight - buttonRect.bottom;
  let opensUp = false;
  if (spaceBelow < menuRect.height && buttonRect.top > menuRect.height) {
    opensUp = true;
  }

  // 5. Calcula a posição
  let menuTop, menuLeft;

  if (opensUp) {
    menuClone.classList.add('show-up');
    menuTop = buttonRect.top + window.scrollY - menuRect.height + buttonRect.height; // Alinha rodapé do menu com rodapé do botão
  } else {
    menuClone.classList.add('show-down');
    menuTop = buttonRect.top + window.scrollY; // Alinha topo do menu com topo do botão
  }

  // Calcula posição horizontal (prioriza abrir à esquerda)
  menuLeft = buttonRect.left + window.scrollX - menuRect.width;
  // Se não couber à esquerda, tenta abrir à direita
  if (menuLeft < 0) {
      menuLeft = buttonRect.right + window.scrollX;
      // Se ainda assim sair da tela à direita (tela muito estreita), ajusta
      if (menuLeft + menuRect.width > viewportWidth) {
          menuLeft = viewportWidth - menuRect.width - 10; // Deixa uma margem
      }
  }


  // 6. Aplica os estilos de posicionamento
  menuClone.style.position = 'absolute';
  menuClone.style.top = `${menuTop}px`;
  menuClone.style.left = `${menuLeft}px`;
  menuClone.style.right = 'auto'; // Garante que 'right' não interfira
  menuClone.style.bottom = 'auto'; // Garante que 'bottom' não interfira


  // 7. (Opcional) Adiciona highlight na linha original
  const row = button.closest('tr');
  if (row) {
    row.classList.add('row-is-active'); // Reutiliza a classe para highlight visual
  }
}
// Fim das novas funções

// NOVO: Helper para obter os cabeçalhos de autenticação
function getAuthHeaders(contentType = 'application/json') {
    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': 'Bearer ' + token
    };
    // Adiciona Content-Type apenas se for necessário (para POST/PUT com JSON)
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    return headers;
}

// Função para buscar clientes do backend (AGORA PAGINADA)
async function fetchClients() {
  // Constrói a URL com os parâmetros de estado
  const params = new URLSearchParams();
  params.append('page', currentPage);
  params.append('limit', 20); // Define um limite (ex: 20 por página)

  if (currentStatusFilter && currentStatusFilter !== 'totalClientes') {
      params.append('status', currentStatusFilter);
  }
  if (currentSearch) {
      params.append('search', currentSearch);
  }

  try {
    // Envia a requisição com os parâmetros
    const response = await fetch(`/clientes/list?${params.toString()}`, {
        headers: getAuthHeaders(null) // CORRIGIDO: Envia o token
    });

    if (!response.ok) {
        if (response.status === 401) window.location.href = '/'; // Redireciona se não autorizado
        throw new Error('Falha ao buscar clientes');
    }

    const result = await response.json();

    // A resposta agora é um objeto { total, page, data }
    clients = result.data; // Atualiza a lista global APENAS com os clientes da página
    
    // Armazena o total para usar na paginação
    window.totalClients = result.total || 0;
    window.totalPages = Math.ceil(window.totalClients / 20);


  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
  }
}

// Função para exibir a tabela de clientes (REFORMULADA)
function displayClientsTable(clientList, title) {
  let tableHtml = `<h2>${title}</h2>`;
  tableHtml += `<table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Nome</th>
        <th>Vencimento</th>
        <th>Serviço</th>
        <th>WhatsApp</th>
        <th>Observações</th>
        <th>Valor Cobrado</th>
        <th>Custo</th>
        <th>Status</th>
        <th>Ações</th> </tr>
    </thead>
    <tbody>`;

  if (!clientList || clientList.length === 0) {
    tableHtml += `<tr><td colspan="10">Nenhum cliente encontrado.</td></tr>`; // Colspan agora é 10
  } else {
    clientList.forEach(client => {
      const statusClass =
        client.status === 'Não pagou' ? 'status-pendente' :
        client.status === 'cobrança feita' ? 'status-cobrança-feita' :
        client.status === 'Pag. em dias' ? 'status-em-dias' : '';

      // Prepara strings para serem usadas com segurança dentro do onclick no HTML
      const safeName = client.name ? client.name.replace(/'/g, "\\'") : '';
      const safeServico = client.servico ? client.servico.replace(/'/g, "\\'") : '';
      const safeObservacoes = client.observacoes ? client.observacoes.replace(/'/g, "\\'") : '';
      const safeWhatsapp = client.whatsapp ? client.whatsapp.replace(/'/g, "\\'") : '';


      // Linha única da tabela
      tableHtml += `<tr>
        <td>${client.id}</td>
        <td style="width: 200px;">${client.name}</td>
        <td>${client.vencimento.split('-').reverse().join('-')}</td>
        <td>${client.servico}</td>
        <td>${client.whatsapp}</td>
        <td>${client.observacoes}</td>
        <td>R$${parseFloat(client.valor_cobrado).toFixed(2)}</td>
        <td>R$${parseFloat(client.custo).toFixed(2)}</td>
        <td class="status ${statusClass}" style="width: 150px; text-align: center;">
          <strong> ${client.status || 'N/A'} </strong>
        </td>
        
        <td class="actions-cell">
          <div class="dropdown">
            <button class="dropdown-toggle" onclick="toggleDropdown(event, ${client.id})">Ações</button>
            <div class="dropdown-menu hidden" id="dropdown-${client.id}">
              <a href="#" onclick="showEditForm(event, ${client.id}, '${safeName}', '${client.vencimento}', '${safeServico}', '${safeWhatsapp}', '${safeObservacoes}', ${client.valor_cobrado}, ${client.custo})">Editar</a>
              <a href="#" onclick="sendWhatsAppMessage(event, '${safeWhatsapp}', ${client.id})">WhatsApp</a>
              <a href="#" onclick="sendWhatsAppMessageVencido(event, '${safeWhatsapp}', ${client.id})">WhatsApp (Vencido)</a>
              <div class="dropdown-divider"></div>
              <a href="#" onclick="markAsPending(event, ${client.id})">Status: Não pagou</a>
              <a href="#" onclick="markAsPaid(event, ${client.id})">Status: Cobrança feita</a>
              <a href="#" onclick="markAsInDay(event, ${client.id})">Status: Pag. em dias</a>
              <div class="dropdown-divider"></div>
              <a href="#" onclick="adjustDate(event, ${client.id}, 1, 'MONTH')">Ajustar: +1 mês</a>
              <a href="#" onclick="adjustDate(event, ${client.id}, -1, 'MONTH')">Ajustar: -1 mês</a>
              <a href="#" onclick="adjustDate(event, ${client.id}, 1, 'DAY')">Ajustar: +1 dia</a>
              <a href="#" onclick="adjustDate(event, ${client.id}, -1, 'DAY')">Ajustar: -1 dia</a>
              <div class="dropdown-divider"></div>
              <a href="#" class="dropdown-delete" onclick="showDeleteConfirmation(event, ${client.id}, '${safeName}')">Excluir</a>
            </div>
          </div>
        </td>
      </tr>`;
      
      // A SEGUNDA LINHA (<tr>) FOI TOTALMENTE REMOVIDA
    });
  }
  
  tableHtml += `</tbody></table>`;
  document.getElementById('table-container').innerHTML = tableHtml;
}


// NOVO: Renderiza os controles de paginação
function renderPaginationControls() {
  const prevButton = document.getElementById('prevPageButton');
  const nextButton = document.getElementById('nextPageButton');
  const pageInfo = document.getElementById('pageInfo');
  
  // Pega o total de páginas calculado na função fetchClients()
  const totalPages = window.totalPages || 1; 

  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

  // Desabilita/Habilita botão "Anterior"
  if (currentPage === 1) {
    prevButton.disabled = true;
  } else {
    prevButton.disabled = false;
  }

  // Desabilita/Habilita botão "Próxima"
  if (currentPage >= totalPages) {
    nextButton.disabled = true;
  } else {
    nextButton.disabled = false;
  }
}

// NOVO: Funções de clique dos botões
async function goToNextPage() {
  if (currentPage < window.totalPages) {
    currentPage++;
    await updateData();
  }
}

async function goToPreviousPage() {
  if (currentPage > 1) {
    currentPage--;
    await updateData();
  }
}

// Função para atualizar os dados (cards e tabela)
async function updateData() {
  // 1. Atualiza os cards (chamada separada e otimizada)
  await updateDashboardCounts(); 

  // 2. Busca a lista paginada de clientes (usando as variáveis globais de estado)
  await fetchClients();

  // 3. Define o título da tabela
  let title = "Clientes";
  currentStatusFilter = sessionStorage.getItem('currentCategory') || 'vence3';

  if (currentStatusFilter === 'vencidos') {
    title = "Clientes Vencidos";
  } else if (currentStatusFilter === 'vence3') {
    title = "Clientes que Vão Vencer em 3 dias";
  } else if (currentStatusFilter === 'emdias') {
    title = "Clientes em Dias";
  } else if (currentStatusFilter === 'totalClientes') {
    title = "Total de Clientes";
  }

  if (currentSearch) {
      title = `Resultado da Pesquisa por "${currentSearch}"`;
  }

  // 4. Exibe a tabela (que agora contém apenas os dados da página)
  displayClientsTable(clients, title);

  // 5. ATUALIZAÇÃO: Renderiza os botões de paginação
    renderPaginationControls();
}

// Função para atualizar os contadores (cards) - AGORA OTIMIZADA
async function updateDashboardCounts() {
  try {
      const response = await fetch('/clientes/dashboard-stats', {
          headers: getAuthHeaders(null) // Envia o token
      });
    
    if (!response.ok) {
        if (response.status === 401) window.location.href = '/'; // Redireciona se não autorizado
        throw new Error('Falha ao buscar estatísticas');
    }
    
      const stats = await response.json();

      // CORREÇÃO: Usando parseFloat() para garantir que são números antes de .toFixed()
      document.querySelector('.card[data-category="vencidos"] .count').textContent = stats.vencidos || 0;
      document.querySelector('.card[data-category="vence3"] .count').textContent = stats.vence3 || 0;
      document.querySelector('.card[data-category="emdias"] .count').textContent = stats.emdias || 0;
      document.querySelector('.card[data-category="custoTotal"] .count').textContent = `R$${parseFloat(stats.custoTotal || 0).toFixed(2)}`;
      document.querySelector('.card[data-category="valorApurado"] .count').textContent = `R$${parseFloat(stats.valorApurado || 0).toFixed(2)}`;
      document.querySelector('.card[data-category="lucro"] .count').textContent = `R$${parseFloat(stats.lucro || 0).toFixed(2)}`;
      document.querySelector('.card[data-category="totalClientes"] .count').textContent = stats.totalClientes || 0;
      document.querySelector('.card[data-category="previsto"] .count').textContent = `R$${parseFloat(stats.previsto || 0).toFixed(2)}`;

  } catch (error) {
      console.error('Erro ao buscar stats do dashboard:', error);
  }
}

// Funções de ações
window.adjustDate = async function(event, clientId, value, unit) {
  event.preventDefault(); // <-- ADICIONADO
  try {
    const response = await fetch(`/clientes/adjust-date/${clientId}`, {
      method: 'PUT',
      headers: getAuthHeaders('application/json'), // CORRIGIDO: Envia o token
      body: JSON.stringify({ value, unit })
    });
    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error || 'Erro ao ajustar a data.');
      return;
    }
    const data = await response.json();
    alert(data.message);

    // ✅ Se adicionou 1 mês, já marca como "Pag. em dias"
    if (unit === 'MONTH' && value > 0) {
      await fetch(`/clientes/mark-in-day/${clientId}`, { 
            method: 'PUT', 
            headers: getAuthHeaders(null) // CORRIGIDO: Envia o token
        });
    }

    await updateData();
  } catch (error) {
    console.error('Erro ao ajustar a data:', error);
    alert('Erro ao ajustar a data.');
  }
};


window.markAsPending = async function(event, id) {
  event.preventDefault(); // <-- ADICIONADO
  try {
    const response = await fetch(`/clientes/mark-pending/${id}`, { 
        method: 'PUT',
        headers: getAuthHeaders(null) // CORRIGIDO: Envia o token
    });
    const data = await response.json();
    
    await updateData();
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    alert('Erro ao marcar como pagamento pendente.');
  }
};

window.markAsPaid = async function(event, id) {
  event.preventDefault(); // <-- ADICIONADO
  try {
    const response = await fetch(`/clientes/mark-paid/${id}`, { 
        method: 'PUT',
        headers: getAuthHeaders(null) // CORRIGIDO: Envia o token
    });
    const data = await response.json();
    
    await updateData();
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    alert('Erro ao marcar como cobrança feita.');
  }
};


window.markAsInDay = async function(event, id) {
  event.preventDefault(); // <-- ADICIONADO
  try {
    const response = await fetch(`/clientes/mark-in-day/${id}`, { 
        method: 'PUT',
        headers: getAuthHeaders(null) // CORRIGIDO: Envia o token
    });
    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error || 'Erro ao marcar como em dias.');
      return;
    }
    const data = await response.json();
  
    await updateData();
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    alert('Erro ao atualizar status.');
  }
};

// NOVA FUNÇÃO: Mostra o modal de confirmação para exclusão
window.showDeleteConfirmation = function(event, clientId, clientName) {
    event.preventDefault();
    
    modalBody.innerHTML = `
        <h2>Confirmar Exclusão</h2>
        <p>Você tem certeza que deseja excluir o cliente <strong>${clientName}</strong>?</p>
        <p>Esta ação não pode ser desfeita.</p>
        <br>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="hideEditForm()">Cancelar</button>
            <button type="button" class="btn btn-danger" id="confirm-delete-btn">Confirmar Exclusão</button>
        </div>
    `;
    
    modal.style.display = 'block';

    // Adiciona o listener ao botão de confirmação
    document.getElementById('confirm-delete-btn').onclick = function() {
        executeDelete(clientId);
    };
}

// NOVA FUNÇÃO: A lógica que realmente deleta (antes era "deleteClient")
async function executeDelete(id) {
  try {
    const response = await fetch(`/clientes/delete/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders(null)
    });
    const data = await response.json();
    alert(data.message);
    modal.style.display = 'none'; // Fecha o modal após deletar
    await updateData();
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    alert('Erro ao excluir cliente.');
  }
}

window.getClientVencimento = async function(clientId) {
  try {
    const response = await fetch(`/clientes/get-vencimento/${clientId}`, {
        headers: getAuthHeaders(null) // CORRIGIDO: Envia o token
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Erro ao buscar data de vencimento');
      return null;
    }
    return data.vencimento;
  } catch (error) {
    console.error('Erro ao obter data de vencimento:', error);
    return null;
  }
};

window.editClient = async function(clientId) {
  const name = document.getElementById(`edit-name-${clientId}`).value;
  const vencimento = document.getElementById(`edit-vencimento-${clientId}`).value;
  const servico = document.getElementById(`edit-servico-${clientId}`).value;
  const whatsapp = document.getElementById(`edit-whatsapp-${clientId}`).value;
  const observacoes = document.getElementById(`edit-observacoes-${clientId}`).value;
  let valor_cobrado = parseFloat(document.getElementById(`edit-valor-cobrado-${clientId}`).value);
  let custo = parseFloat(document.getElementById(`edit-custo-${clientId}`).value);

  if (isNaN(valor_cobrado)) valor_cobrado = 15.00;
  if (isNaN(custo)) custo = 6.00;

  try {
    const response = await fetch(`/clientes/update/${clientId}`, {
      method: 'PUT',
      headers: getAuthHeaders('application/json'), // CORRIGIDO: Envia o token
      body: JSON.stringify({ name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo })
    });
    const data = await response.json();
    if (response.ok) {
      alert('Cliente atualizado com sucesso!');
      modal.style.display = 'none';
      await updateData();
    } else {
      alert(`Erro ao atualizar cliente: ${data.error}`);
    }
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    alert('Erro ao atualizar cliente.');
  }
};


// Eventos de formulários e da navbar

window.displayRegistrationForm = function() {
  modalBody.innerHTML = `
    <h2>Cadastro de Cliente</h2>
    <form id="registration-form">
        <div class="form-group">
          <label class="form-label">Nome do Cliente</label>
          <input type="text" class="form-control my-2" id="reg-name" placeholder="Nome do Cliente" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Data de Vencimento</label>
          <input type="date" class="form-control my-2" id="reg-vencimento" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Serviço</label>
          <input type="text" class="form-control my-2" id="reg-servico" placeholder="Serviço" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">WhatsApp (apenas números)</label>
          <div class="input-group my-2">
            <span class="input-group-text">+55</span>
            <input type="text" class="form-control" id="reg-whatsapp" placeholder="xx912345678" maxlength="11" required>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Observações</label>
          <textarea class="form-control my-2" id="reg-observacoes" placeholder="Observações"></textarea>
        </div>
        
        <div class="form-group">
          <label for="reg-valor-cobrado" class="form-label">Valor Cobrado (R$)</label>
          <input type="number" step="0.01" class="form-control my-2" id="reg-valor-cobrado" placeholder="15.00" value="15.00" required>
        </div>
        
        <div class="form-group">
          <label for="reg-custo" class="form-label">Custo (R$)</label>
          <input type="number" step="0.01" class="form-control my-2" id="reg-custo" placeholder="6.00" value="6.00" required>
        </div>
        
        <div class="form-button-group">
          <button type="button" class="btn btn-secondary" onclick="hideEditForm()">Cancelar</button>
          <button type="submit" class="btn btn-success">Cadastrar Cliente</button>
        </div>
    </form>
  `;
  modal.style.display = 'block';
  
  // O listener de submit (o resto da função) permanece o mesmo...
  document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const vencimento = document.getElementById('reg-vencimento').value;
    const servico = document.getElementById('reg-servico').value;
    const whatsapp = '+55' + document.getElementById('reg-whatsapp').value;
    const observacoes = document.getElementById('reg-observacoes').value;
    const valor_cobrado = document.getElementById('reg-valor-cobrado').value;
    const custo = document.getElementById('reg-custo').value;
    
    if (!/^\d{11}$/.test(document.getElementById('reg-whatsapp').value)) {
      alert('O número de WhatsApp deve conter exatamente 11 dígitos.');
      return;
    }
    
    const client = { name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo };
    
    try {
      const response = await fetch('/clientes/add', {
        method: 'POST',
        headers: getAuthHeaders('application/json'), 
        body: JSON.stringify(client)
      });
      const data = await response.json();
      alert(data.message);
      await updateData(); 
      modal.style.display = 'none';
    } catch (error) {
      alert('Erro ao adicionar cliente');
    }
  });
};

window.displayEditMessageForm = async function() {
  try {
    const response = await fetch('/clientes/get-message', {
        headers: getAuthHeaders(null)
    });
    const data = await response.json();
    let currentMessage = data.message || '';
    
    modalBody.innerHTML = `
      <h2>Editar Mensagem Padrão</h2>
      <form id="edit-message-form">
          <div class="form-group">
            <label class="form-label">Mensagem para clientes a vencer:</label>
            <textarea class="form-control my-2" id="default-message" rows="5" placeholder="Digite a mensagem padrão">${currentMessage}</textarea>
          </div>
          <div class="form-button-group">
            <button type="button" class="btn btn-secondary" onclick="hideEditForm()">Cancelar</button>
            <button type="submit" class="btn btn-success">Salvar Mensagem</button>
          </div>
      </form>
    `;
    modal.style.display = 'block';
    
    // O listener de submit (o resto da função) permanece o mesmo...
    document.getElementById('edit-message-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      let newMessage = document.getElementById('default-message').value;
      if(newMessage.trim() === '') {
        alert('A mensagem não pode estar vazia.');
        return;
      }
      const saveResponse = await fetch('/clientes/save-message', {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ message: newMessage })
      });
      const saveData = await saveResponse.json();
      if(saveResponse.ok) {
        alert(saveData.message);
        modal.style.display = 'none';
      } else {
        alert('Erro ao salvar a mensagem padrão.');
      }
    });
  } catch (error) {
    console.error('Erro ao editar mensagem padrão:', error);
    alert('Erro ao editar mensagem padrão.');
  }
};

window.showEditForm = function(event, clientId, name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo) {
  event.preventDefault(); 

  const safeName = name || '';
  const safeVencimento = vencimento || '';
  const safeServico = servico || '';
  const safeWhatsapp = whatsapp || '';
  const safeObservacoes = observacoes || '';
  const safeValor = valor_cobrado || 0;
  const safeCusto = custo || 0;

  const editHtml = `
    <h2>Editar Cliente</h2>
    <form id="edit-form-${clientId}">
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input type="text" class="form-control my-2" id="edit-name-${clientId}" value="${safeName}" placeholder="Nome">
        </div>
        
        <div class="form-group">
          <label class="form-label">Vencimento</label>
          <input type="date" class="form-control my-2" id="edit-vencimento-${clientId}" value="${safeVencimento}" placeholder="Vencimento">
        </div>
        
        <div class="form-group">
          <label class="form-label">Serviço</label>
          <input type="text" class="form-control my-2" id="edit-servico-${clientId}" value="${safeServico}" placeholder="Serviço">
        </div>
        
        <div class="form-group">
          <label class="form-label">WhatsApp</label>
          <input type="text" class="form-control my-2" id="edit-whatsapp-${clientId}" value="${safeWhatsapp}" placeholder="WhatsApp">
        </div>
        
        <div class="form-group">
          <label class="form-label">Observações</label>
          <textarea class="form-control my-2" id="edit-observacoes-${clientId}" placeholder="Observações">${safeObservacoes}</textarea>
        </div>
        
        <div class="form-group">
          <label for="edit-valor-cobrado-${clientId}" class="form-label">Valor Cobrado (R$)</label>
          <input type="number" step="0.01" class="form-control my-2" id="edit-valor-cobrado-${clientId}" value="${safeValor}" placeholder="15.00" required>
        </div>
        
        <div class="form-group">
          <label for="edit-custo-${clientId}" class="form-label">Custo (R$)</label>
          <input type="number" step="0.01" class="form-control my-2" id="edit-custo-${clientId}" value="${safeCusto}" placeholder="6.00" required>
        </div>
        
        <div class="form-button-group">
          <button type="button" class="btn btn-secondary" onclick="hideEditForm()">Cancelar</button>
          <button type="submit" class="btn btn-success">Salvar</button>
        </div>
    </form>
  `;

  modalBody.innerHTML = editHtml;
  
  // O listener de submit (o resto da função) permanece o mesmo...
  document.getElementById(`edit-form-${clientId}`).addEventListener('submit', async (e) => {
    e.preventDefault();
    await editClient(clientId);
  });
  
  modal.style.display = 'block';
};

window.hideEditForm = function() {
  modal.style.display = 'none';
};

window.sendWhatsAppMessage = async function(event, whatsapp, clientId) {
  event.preventDefault(); // <-- ADICIONADO
  try {
    const response = await fetch('/clientes/get-message', {
        headers: getAuthHeaders(null) // CORRIGIDO: Envia o token
    });
    const data = await response.json();
    if (!response.ok || !data.message) {
      alert('Nenhuma mensagem padrão foi configurada.');
      return;
    }
    const vencimento = await getClientVencimento(clientId);
    if (!vencimento) {
      alert('Data de vencimento não encontrada.');
      return;
    }
    const vencimentoDate = new Date(vencimento);
    vencimentoDate.setDate(vencimentoDate.getDate() + 1);
    const formattedDate = vencimentoDate.toLocaleDateString('pt-BR');
    const message = `${data.message} Vencimento: ${formattedDate}`;
    const whatsappLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  } catch (error) {
    console.error('Erro ao enviar mensagem pelo WhatsApp:', error);
    alert('Erro ao enviar mensagem pelo WhatsApp.');
  }
};


window.displayEditMessageVencidoForm = async function() {
  try {
    const response = await fetch('/clientes/get-message-vencido', {
        headers: getAuthHeaders(null)
    });
    const data = await response.json();
    let currentMessage = data.message || '';

    modalBody.innerHTML = `
      <h2>Editar Mensagem Padrão (Vencido)</h2>
      <form id="edit-message-vencido-form">
        <div class="form-group">
          <label class="form-label">Mensagem para clientes vencidos:</label>
          <textarea class="form-control my-2" id="default-message-vencido" rows="5" placeholder="Digite a mensagem padrão para clientes VENCIDOS">${currentMessage}</textarea>
        </div>
        <div class="form-button-group">
          <button type="button" class="btn btn-secondary" onclick="hideEditForm()">Cancelar</button>
          <button type="submit" class="btn btn-success">Salvar Mensagem</button>
        </div>
      </form>
    `;
    modal.style.display = 'block';

    // O listener de submit (o resto da função) permanece o mesmo...
    document.getElementById('edit-message-vencido-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      let newMessage = document.getElementById('default-message-vencido').value;
      if(newMessage.trim() === '') {
        alert('A mensagem não pode estar vazia.');
        return;
      }
      const saveResponse = await fetch('/clientes/save-message-vencido', {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ message: newMessage })
      });
      const saveData = await saveResponse.json();
      if(saveResponse.ok) {
        alert(saveData.message);
        modal.style.display = 'none';
      } else {
        alert('Erro ao salvar a mensagem (Vencido).');
      }
    });
  } catch (error) {
    console.error('Erro ao editar mensagem (Vencido):', error);
    alert('Erro ao editar mensagem (Vencido).');
  }
};

window.sendWhatsAppMessageVencido = async function(event, whatsapp, clientId) {
  event.preventDefault(); // <-- ADICIONADO
  try {
    // Busca a mensagem (VENCIDO)
    const response = await fetch('/clientes/get-message-vencido', { 
        headers: getAuthHeaders(null)
    });
    const data = await response.json();
    if (!response.ok || !data.message) {
      alert('Nenhuma mensagem (Vencido) foi configurada.');
      return;
    }

    const vencimento = await getClientVencimento(clientId);
    if (!vencimento) {
      alert('Data de vencimento não encontrada.');
      return;
    }

    const vencimentoDate = new Date(vencimento);
    vencimentoDate.setDate(vencimentoDate.getDate() + 1);
    const formattedDate = vencimentoDate.toLocaleDateString('pt-BR');

    // Formata a mensagem
    const message = `${data.message} Vencimento: ${formattedDate}`;

    const whatsappLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  } catch (error) {
    console.error('Erro ao enviar mensagem (Vencido) pelo WhatsApp:', error);
    alert('Erro ao enviar mensagem (Vencido) pelo WhatsApp.');
  }
};

// Funções de filtragem (Não são mais usadas para a tabela principal)
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}
function getThreeDaysLaterString() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().split('T')[0];
}

// Função auxiliar para remover acentuação (para pesquisa)
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Funções para renderizar o gráfico
async function renderChart() {
  try {
    const response = await fetch('/clientes/pagamentos/dias', { // Rota /clientes/...
        headers: getAuthHeaders(null) // CORRIGIDO: Envia o token
    });
    
    if (!response.ok) {
        if (response.status === 401) window.location.href = '/'; // Redireciona se não autorizado
        throw new Error('Falha ao buscar dados do gráfico');
    }

    const result = await response.json();
    const labels = result.days;
    const data = result.payments;
    
    console.log("Dados do gráfico:", labels, data);
    
    if (chart) chart.destroy();
    const ctx = document.getElementById('myChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Previsão de Pagamentos',
          data: data,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  } catch (error) {
    console.error('Erro ao renderizar o gráfico:', error);
  }
}

// Carregamento Inicial e eventos
document.addEventListener('DOMContentLoaded', async () => {
  modal = document.getElementById('modal');
  modalBody = document.getElementById('modal-body');
  
  // ---- BLOCO NOVO CORRIGIDO ----
  // Define o filtro padrão se nenhum estiver salvo
  if (!sessionStorage.getItem('currentCategory')) {
      sessionStorage.setItem('currentCategory', 'vence3');
  }
  
  // Chama a nova função principal que carrega tudo (cards e tabela paginada)
  await updateData(); 
  
  // O gráfico pode ser chamado separadamente
  await renderChart(); 
  // ---- FIM DO BLOCO NOVO ----
  
  // Fechar modal com confirmação
  document.querySelector('.close-btn').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
 window.addEventListener('click', (e) => {
    // Fecha dropdowns se clicar fora deles
    // Verifica se o clique NÃO foi dentro do menu ativo ou no botão que o abriu
    const clickedButton = e.target.matches('.dropdown-toggle') || e.target.closest('.dropdown-toggle');
    const clickedInsideMenu = activeDropdownMenu && activeDropdownMenu.contains(e.target);

    if (!clickedButton && !clickedInsideMenu) {
        closeAllDropdowns();
    }

    // Fecha modal (lógica existente)
    if (modal && e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Eventos dos cards
  document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', async () => {
    const category = card.getAttribute('data-category');

    if (category === 'custoTotal' || category === 'valorApurado' || category === 'lucro' || category === 'previsto') {
      return; // Ignora cards não-clicáveis
    }

    sessionStorage.setItem('currentCategory', category);

    // ATUALIZA O ESTADO
    currentStatusFilter = category;
    currentSearch = ''; // Limpa a pesquisa ao trocar de categoria
    currentPage = 1; // Volta para a página 1

    // Atualiza o campo de busca (visual)
    document.getElementById('searchInput').value = '';

    await updateData(); // Recarrega os dados
  });
});
  
  // Evento para o campo de pesquisa
  const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', async function() {

    // ATUALIZA O ESTADO
    currentSearch = this.value.trim();
    currentPage = 1; // Volta para a página 1

    // Opcional: Se a pesquisa for limpa, volta para o filtro do card
    if (currentSearch === '') {
        currentStatusFilter = sessionStorage.getItem('currentCategory') || 'vence3';
    } else {
        // Se está pesquisando, remove o filtro de status (busca em todos)
        currentStatusFilter = 'totalClientes'; 
    }
    
    // Em uma implementação futura, adicione um "debounce" aqui
    await updateData(); // Recarrega os dados
  });
}
  

// ==== NOVO BLOCO ADICIONADO ====
  // Eventos para os botões de paginação
  document.getElementById('prevPageButton').addEventListener('click', goToPreviousPage);
  document.getElementById('nextPageButton').addEventListener('click', goToNextPage);
  // ==================================
  // Eventos para os links da Navbar


  document.getElementById('registerLink').addEventListener('click', (e) => {
    e.preventDefault();
    displayRegistrationForm();
  });
  
  document.getElementById('editMessageLink').addEventListener('click', (e) => {
    e.preventDefault();
    displayEditMessageForm();
  });
  
  // Listener para o novo link (Vencido)
  document.getElementById('editMessageVencidoLink').addEventListener('click', (e) => {
    e.preventDefault();
    displayEditMessageVencidoForm();
  });
});


// Função de Logout
document.getElementById('logoutButton').addEventListener('click', function() {
  if (confirm('Deseja realmente sair?')) {
    sessionStorage.clear();
    localStorage.clear(); // CORRIGIDO: Limpa o token salvo
    window.location.href = '/'; 
  }
});


document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.getElementById('menuToggle');
  const navbar = document.querySelector('.navbar');
  if (menuToggle && navbar) {
    menuToggle.addEventListener('click', () => {
      navbar.classList.toggle('show');
    });
  }
});


document.getElementById('registerLink').addEventListener('click', (e) => {
  e.preventDefault();
  // Remove a classe "show" para ocultar a sidebar
  document.querySelector('.navbar').classList.remove('show');
  displayRegistrationForm();
});

document.getElementById('editMessageLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelector('.navbar').classList.remove('show');
  displayEditMessageForm();
});

document.getElementById('editMessageVencidoLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelector('.navbar').classList.remove('show');
  displayEditMessageVencidoForm();
});

document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    const nonClickable = ['custoTotal', 'valorApurado', 'lucro', 'previsto'];
   const category = card.getAttribute('data-category');

    // Só adiciona o evento de clique se o card não estiver na lista de ignorados
    if (!nonClickable.includes(category)) {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    } else {
      // Opcional: muda o cursor para indicar que não é clicável
      card.style.cursor = 'default';
    }
  });
});