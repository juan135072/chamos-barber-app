// Configuración de Supabase (lee desde las variables de entorno)
const SUPABASE_URL = 'http://supabase.chamosbarber.com';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA';

// Inicializar Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentTable = null;
let currentData = [];

// Configurar event listeners
document.addEventListener('DOMContentLoaded', () => {
  const tableItems = document.querySelectorAll('.table-item');
  tableItems.forEach(item => {
    item.addEventListener('click', () => {
      const tableName = item.dataset.table;
      loadTable(tableName);
    });
  });
  
  // Buscar en tiempo real
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterTable(e.target.value);
  });
});

async function loadTable(tableName) {
  currentTable = tableName;
  
  // Actualizar UI
  document.querySelectorAll('.table-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-table="${tableName}"]`).classList.add('active');
  
  document.getElementById('tableName').textContent = `📊 Tabla: ${tableName}`;
  document.getElementById('actions').style.display = 'flex';
  document.getElementById('searchBox').style.display = 'block';
  document.getElementById('tableContent').innerHTML = '<div class="loading">⏳ Cargando datos...</div>';
  
  try {
    const { data, error, count } = await supabaseClient
      .from(tableName)
      .select('*', { count: 'exact' });
    
    if (error) throw error;
    
    currentData = data;
    renderTable(data, count);
    
  } catch (error) {
    document.getElementById('tableContent').innerHTML = `
      <div class="error">
        ❌ Error al cargar la tabla: ${error.message}
      </div>
    `;
  }
}

function renderTable(data, totalCount) {
  const content = document.getElementById('tableContent');
  
  if (!data || data.length === 0) {
    content.innerHTML = '<div class="loading">⚠️ Esta tabla está vacía (0 registros)</div>';
    return;
  }
  
  const columns = Object.keys(data[0]);
  
  let html = `
    <div class="table-info">
      <div class="info-item">
        <label>Total Registros</label>
        <span>${totalCount}</span>
      </div>
      <div class="info-item">
        <label>Mostrando</label>
        <span>${data.length}</span>
      </div>
      <div class="info-item">
        <label>Columnas</label>
        <span>${columns.length}</span>
      </div>
    </div>
    
    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            ${columns.map(col => `<th>${col}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${columns.map(col => {
                let value = row[col];
                if (value === null) value = '<em style="color: #cbd5e0;">NULL</em>';
                else if (typeof value === 'object') value = JSON.stringify(value);
                else if (typeof value === 'boolean') value = value ? '✅ true' : '❌ false';
                return `<td>${value}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  content.innerHTML = html;
}

function filterTable(searchTerm) {
  if (!currentData || currentData.length === 0) return;
  
  const filtered = currentData.filter(row => {
    return Object.values(row).some(value => {
      if (value === null) return false;
      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });
  
  renderTable(filtered, currentData.length);
}

function refreshTable() {
  if (currentTable) {
    loadTable(currentTable);
  }
}

function exportTable() {
  if (!currentData || currentData.length === 0) {
    alert('No hay datos para exportar');
    return;
  }
  
  const dataStr = JSON.stringify(currentData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentTable}_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function openStudio() {
  window.open(SUPABASE_URL, '_blank');
}

// Verificar conexión al cargar
supabaseClient
  .from('admin_users')
  .select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    const status = document.getElementById('status');
    if (error) {
      status.textContent = '● Desconectado';
      status.classList.remove('connected');
      status.classList.add('disconnected');
    }
  });
