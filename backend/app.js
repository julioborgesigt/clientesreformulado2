const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // Importação do módulo path

dotenv.config();



const app = express();

app.use(cors());
app.use(bodyParser.json());



  


const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const authMiddleware = require('./middleware/authMiddleware');

 // Rotas
app.use('/auth', authRoutes);
app.use('/clientes', authMiddleware, clientesRoutes);

  

// Configura o uso de arquivos estáticos (CSS, JS, etc.) a partir da pasta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota para a página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html')); // Caminho para o index.html
});

// Rota para a página principal
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'dashboard.html')); // Caminho para o dashboard.html
  });
  

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
