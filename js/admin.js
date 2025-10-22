// === SISTEMA DE ADMINISTRACIÓN CHAMOS BARBER ===

let currentEditingBarber = null;
let currentEditingService = null;

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', function() {
    initAdminPanel();
    loadBarberos();
    loadServicios();
    setupEventListeners();
});

function initAdminPanel() {
    // Configurar tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Character counter para bio corta
    const bioCorta = document.getElementById('barber-bio-corta');
    if (bioCorta) {
        bioCorta.addEventListener('input', updateCharCounter);
    }
}

function setupEventListeners() {
    // Formulario de barbero
    const barberForm = document.getElementById('barber-form');
    if (barberForm) {
        barberForm.addEventListener('submit', handleBarberSubmit);
    }

    // Formulario de servicio
    const serviceForm = document.getElementById('service-form');
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleServiceSubmit);
    }

    // Cerrar modales con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Cerrar modales clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });
}

// === GESTIÓN DE TABS ===
function switchTab(tabName) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Cargar datos según tab
    switch(tabName) {
        case 'barberos':
            loadBarberos();
            break;
        case 'servicios':
            loadServicios();
            break;
        case 'portfolio':
            loadAdvancedPortfolio();
            break;
        case 'usuarios':
            loadUsuarios();
            break;
        case 'mi-perfil':
            loadMyBarberProfile();
            break;
        case 'mi-portfolio':
            loadMyPortfolio();
            break;
        case 'security':
            updateSecurityInfo();
            break;
    }
}

// === GESTIÓN DE BARBEROS ===
async function loadBarberos() {
    const grid = document.getElementById('barberos-grid');
    const loading = document.getElementById('barberos-loading');
    
    showLoading('barberos-loading');
    
    try {
        const response = await fetch('tables/barberos?sort=orden');
        const data = await response.json();
        
        grid.innerHTML = '';
        
        if (data.data && data.data.length > 0) {
            data.data.forEach(barber => {
                grid.appendChild(createBarberCard(barber));
            });
        } else {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--admin-secondary);">
                    <i class="fas fa-users fa-3x" style="opacity: 0.3; margin-bottom: 1rem;"></i>
                    <h3>No hay barberos registrados</h3>
                    <p>Agrega el primer barbero para comenzar</p>
                    <button class="btn btn-primary" onclick="openBarberModal()">
                        <i class="fas fa-plus"></i> Agregar Barbero
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading barberos:', error);
        showToast('Error al cargar barberos', 'error');
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--admin-danger);">Error al cargar los datos</div>';
    }
    
    hideLoading('barberos-loading');
}

function createBarberCard(barber) {
    const card = document.createElement('div');
    card.className = 'barber-admin-card';
    card.innerHTML = `
        <div class="barber-card-header">
            <div class="barber-avatar" style="background-image: url('${barber.foto_perfil}')"></div>
            <div class="barber-info">
                <h3>${barber.nombre}</h3>
                ${barber.apodo ? `<div class="barber-apodo">"${barber.apodo}"</div>` : ''}
                <div class="barber-stats">
                    <span><i class="fas fa-clock"></i> ${barber.años_experiencia} años</span>
                    <span class="status-badge ${barber.activo ? 'status-active' : 'status-inactive'}">
                        ${barber.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
            </div>
        </div>
        <div class="barber-especialidades">
            <strong>Especialidades:</strong> ${barber.especialidades || 'No especificadas'}
        </div>
        <div class="barber-actions">
            <button class="btn btn-icon btn-edit" onclick="editBarber('${barber.id}')" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-icon btn-toggle ${barber.activo ? 'active' : ''}" 
                    onclick="toggleBarberStatus('${barber.id}', ${!barber.activo})" 
                    title="${barber.activo ? 'Desactivar' : 'Activar'}">
                <i class="fas fa-${barber.activo ? 'eye-slash' : 'eye'}"></i>
            </button>
            <button class="btn btn-icon btn-delete" onclick="deleteBarber('${barber.id}')" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return card;
}

async function editBarber(barberId) {
    try {
        const response = await fetch(`tables/barberos/${barberId}`);
        const barber = await response.json();
        
        currentEditingBarber = barberId;
        
        // Llenar formulario
        document.getElementById('barber-nombre').value = barber.nombre || '';
        document.getElementById('barber-apodo').value = barber.apodo || '';
        document.getElementById('barber-experiencia').value = barber.años_experiencia || '';
        document.getElementById('barber-orden').value = barber.orden || '';
        document.getElementById('barber-especialidades').value = barber.especialidades || '';
        document.getElementById('barber-bio-corta').value = barber.bio_corta || '';
        document.getElementById('barber-bio-completa').value = barber.bio_completa || '';
        document.getElementById('barber-foto').value = barber.foto_perfil || '';
        document.getElementById('barber-activo').checked = barber.activo !== false;
        
        // Actualizar contador de caracteres
        updateCharCounter();
        
        // Cambiar título del modal
        document.getElementById('barber-modal-title').textContent = 'Editar Barbero';
        
        openBarberModal();
    } catch (error) {
        console.error('Error loading barber:', error);
        showToast('Error al cargar los datos del barbero', 'error');
    }
}

async function deleteBarber(barberId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este barbero? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await fetch(`tables/barberos/${barberId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Barbero eliminado correctamente', 'success');
            loadBarberos();
        } else {
            throw new Error('Error al eliminar');
        }
    } catch (error) {
        console.error('Error deleting barber:', error);
        showToast('Error al eliminar el barbero', 'error');
    }
}

async function toggleBarberStatus(barberId, newStatus) {
    try {
        const response = await fetch(`tables/barberos/${barberId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                activo: newStatus
            })
        });

        if (response.ok) {
            showToast(`Barbero ${newStatus ? 'activado' : 'desactivado'} correctamente`, 'success');
            loadBarberos();
        } else {
            throw new Error('Error al actualizar estado');
        }
    } catch (error) {
        console.error('Error toggling barber status:', error);
        showToast('Error al actualizar el estado', 'error');
    }
}

// === GESTIÓN DE SERVICIOS ===
async function loadServicios() {
    const list = document.getElementById('servicios-list');
    const loading = document.getElementById('servicios-loading');
    
    showLoading('servicios-loading');
    
    try {
        const response = await fetch('tables/servicios?sort=orden');
        const data = await response.json();
        
        list.innerHTML = '';
        
        if (data.data && data.data.length > 0) {
            data.data.forEach(service => {
                list.appendChild(createServiceItem(service));
            });
        } else {
            list.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--admin-secondary);">
                    <i class="fas fa-cut fa-3x" style="opacity: 0.3; margin-bottom: 1rem;"></i>
                    <h3>No hay servicios registrados</h3>
                    <p>Agrega el primer servicio para comenzar</p>
                    <button class="btn btn-primary" onclick="openServiceModal()">
                        <i class="fas fa-plus"></i> Agregar Servicio
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading servicios:', error);
        showToast('Error al cargar servicios', 'error');
    }
    
    hideLoading('servicios-loading');
}

function createServiceItem(service) {
    const item = document.createElement('div');
    item.className = 'service-admin-item';
    item.innerHTML = `
        <div class="service-info">
            <h4>${service.nombre}</h4>
            <div class="service-description">${service.descripcion || ''}</div>
            <span class="status-badge ${service.activo ? 'status-active' : 'status-inactive'}">
                ${service.activo ? 'Activo' : 'Inactivo'}
            </span>
        </div>
        <div class="service-price">${service.precio}</div>
        <div class="service-actions" style="display: flex; gap: 0.5rem;">
            <button class="btn btn-icon btn-edit" onclick="editService('${service.id}')" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-icon btn-toggle ${service.activo ? 'active' : ''}" 
                    onclick="toggleServiceStatus('${service.id}', ${!service.activo})" 
                    title="${service.activo ? 'Desactivar' : 'Activar'}">
                <i class="fas fa-${service.activo ? 'eye-slash' : 'eye'}"></i>
            </button>
            <button class="btn btn-icon btn-delete" onclick="deleteService('${service.id}')" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return item;
}

async function editService(serviceId) {
    try {
        const response = await fetch(`tables/servicios/${serviceId}`);
        const service = await response.json();
        
        currentEditingService = serviceId;
        
        // Llenar formulario
        document.getElementById('service-nombre').value = service.nombre || '';
        document.getElementById('service-precio-num').value = service.precio_numerico || '';
        document.getElementById('service-descripcion').value = service.descripcion || '';
        document.getElementById('service-orden').value = service.orden || '';
        document.getElementById('service-activo').checked = service.activo !== false;
        
        // Cambiar título del modal
        document.getElementById('service-modal-title').textContent = 'Editar Servicio';
        
        openServiceModal();
    } catch (error) {
        console.error('Error loading service:', error);
        showToast('Error al cargar los datos del servicio', 'error');
    }
}

async function deleteService(serviceId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este servicio? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await fetch(`tables/servicios/${serviceId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Servicio eliminado correctamente', 'success');
            loadServicios();
        } else {
            throw new Error('Error al eliminar');
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        showToast('Error al eliminar el servicio', 'error');
    }
}

async function toggleServiceStatus(serviceId, newStatus) {
    try {
        const response = await fetch(`tables/servicios/${serviceId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                activo: newStatus
            })
        });

        if (response.ok) {
            showToast(`Servicio ${newStatus ? 'activado' : 'desactivado'} correctamente`, 'success');
            loadServicios();
        } else {
            throw new Error('Error al actualizar estado');
        }
    } catch (error) {
        console.error('Error toggling service status:', error);
        showToast('Error al actualizar el estado', 'error');
    }
}

// === GESTIÓN DE MODALES ===
function openBarberModal() {
    document.getElementById('barber-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBarberModal() {
    document.getElementById('barber-modal').classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset form
    document.getElementById('barber-form').reset();
    document.getElementById('barber-modal-title').textContent = 'Agregar Barbero';
    currentEditingBarber = null;
    updateCharCounter();
}

function openServiceModal() {
    document.getElementById('service-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeServiceModal() {
    document.getElementById('service-modal').classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset form
    document.getElementById('service-form').reset();
    document.getElementById('service-modal-title').textContent = 'Agregar Servicio';
    currentEditingService = null;
}

function closeAllModals() {
    closeBarberModal();
    closeServiceModal();
}

// === MANEJO DE FORMULARIOS ===
async function handleBarberSubmit(e) {
    e.preventDefault();
    
    const formData = {
        nombre: document.getElementById('barber-nombre').value.trim(),
        apodo: document.getElementById('barber-apodo').value.trim(),
        años_experiencia: parseInt(document.getElementById('barber-experiencia').value),
        orden: parseInt(document.getElementById('barber-orden').value) || 1,
        especialidades: document.getElementById('barber-especialidades').value.trim(),
        bio_corta: document.getElementById('barber-bio-corta').value.trim(),
        bio_completa: document.getElementById('barber-bio-completa').value.trim(),
        foto_perfil: document.getElementById('barber-foto').value.trim(),
        activo: document.getElementById('barber-activo').checked
    };

    // Validaciones
    if (!formData.nombre || !formData.bio_corta || !formData.bio_completa || !formData.foto_perfil) {
        showToast('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    if (formData.bio_corta.length > 120) {
        showToast('La biografía corta no puede exceder 120 caracteres', 'error');
        return;
    }

    try {
        const url = currentEditingBarber ? 
            `tables/barberos/${currentEditingBarber}` : 
            'tables/barberos';
        
        const method = currentEditingBarber ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const action = currentEditingBarber ? 'actualizado' : 'creado';
            showToast(`Barbero ${action} correctamente`, 'success');
            closeBarberModal();
            loadBarberos();
        } else {
            const error = await response.text();
            throw new Error(error);
        }
    } catch (error) {
        console.error('Error saving barber:', error);
        showToast('Error al guardar el barbero', 'error');
    }
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    
    const precioNumerico = parseInt(document.getElementById('service-precio-num').value);
    const formData = {
        nombre: document.getElementById('service-nombre').value.trim(),
        descripcion: document.getElementById('service-descripcion').value.trim(),
        precio: formatPrice(precioNumerico),
        precio_numerico: precioNumerico,
        orden: parseInt(document.getElementById('service-orden').value) || 1,
        activo: document.getElementById('service-activo').checked
    };

    // Validaciones
    if (!formData.nombre || !precioNumerico) {
        showToast('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    if (precioNumerico < 1000) {
        showToast('El precio debe ser mayor a $1.000', 'error');
        return;
    }

    try {
        const url = currentEditingService ? 
            `tables/servicios/${currentEditingService}` : 
            'tables/servicios';
        
        const method = currentEditingService ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const action = currentEditingService ? 'actualizado' : 'creado';
            showToast(`Servicio ${action} correctamente`, 'success');
            closeServiceModal();
            loadServicios();
        } else {
            const error = await response.text();
            throw new Error(error);
        }
    } catch (error) {
        console.error('Error saving service:', error);
        showToast('Error al guardar el servicio', 'error');
    }
}

// === UTILIDADES ===
function updateCharCounter() {
    const bioCorta = document.getElementById('barber-bio-corta');
    const counter = document.querySelector('.char-counter');
    
    if (bioCorta && counter) {
        const length = bioCorta.value.length;
        counter.textContent = `${length}/120 caracteres`;
        counter.style.color = length > 120 ? 'var(--admin-danger)' : 'var(--admin-secondary)';
    }
}

function formatPrice(price) {
    return `$${price.toLocaleString('es-CL')}`;
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'flex';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                 type === 'error' ? 'fas fa-exclamation-circle' : 
                 'fas fa-exclamation-triangle';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${icon}"></i>
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// === CONFIGURACIÓN ===
function saveContactInfo() {
    const whatsapp = document.getElementById('whatsapp-number').value;
    const address = document.getElementById('address').value;
    
    // Aquí podrías guardar en localStorage o enviar a una API
    localStorage.setItem('chamos_whatsapp', whatsapp);
    localStorage.setItem('chamos_address', address);
    
    showToast('Información de contacto actualizada', 'success');
}

// === Portfolio (funcionalidad básica) ===
async function loadPortfolio() {
    // Por ahora solo mostrar mensaje de funcionalidad futura
    const grid = document.getElementById('portfolio-grid');
    grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--admin-secondary);">
            <i class="fas fa-images fa-3x" style="opacity: 0.3; margin-bottom: 1rem;"></i>
            <h3>Gestión de Portfolio</h3>
            <p>Funcionalidad próximamente disponible</p>
        </div>
    `;
}

function openPortfolioModal() {
    showToast('Funcionalidad de portfolio próximamente', 'warning');
}

//=== GESTIÓN DE SEGURIDAD ===
function updateSecurityInfo() {
    if (!authManager.currentUser) return;
    
    const currentUsername = document.getElementById('current-username');
    const currentRole = document.getElementById('current-role');
    const lastLogin = document.getElementById('last-login');
    const sessionExpiry = document.getElementById('session-expiry');
    
    if (currentUsername) {
        currentUsername.textContent = authManager.currentUser.username;
    }
    
    if (currentRole) {
        currentRole.textContent = authManager.currentUser.role || 'Administrador';
    }
    
    if (lastLogin) {
        const loginTime = authManager.currentUser.lastLogin 
            ? new Date(authManager.currentUser.lastLogin).toLocaleString('es-VE')
            : 'Esta sesión';
        lastLogin.textContent = loginTime;
    }
    
    if (sessionExpiry) {
        const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
        if (sessionData.expiresAt) {
            const expiryTime = new Date(sessionData.expiresAt).toLocaleString('es-VE');
            sessionExpiry.textContent = expiryTime;
        }
    }
}

function confirmLogoutAllSessions() {
    if (confirm('¿Estás seguro de que deseas cerrar todas las sesiones? Esto te desconectará inmediatamente.')) {
        authManager.logout();
        showToast('Todas las sesiones han sido cerradas', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }
}

//=== GESTIÓN DE USUARIOS ===
let editingUserId = null;

async function loadUsuarios() {
    const grid = document.getElementById('usuarios-grid');
    const loading = document.getElementById('usuarios-loading');
    
    showLoading('usuarios-loading');
    
    try {
        const response = await fetch('tables/admin_users?sort=created_at&limit=100');
        const data = await response.json();
        
        displayUsuarios(data.data || []);
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showToast('Error al cargar usuarios', 'error');
        
        // Mostrar datos de ejemplo si falla la API
        displayUsuarios([
            {
                id: '1',
                username: 'admin',
                full_name: 'Administrador Principal',
                email: 'admin@chamosbarber.com',
                role: 'Super Admin',
                status: 'activo',
                last_login: new Date().toISOString(),
                created_at: Date.now() - 86400000
            }
        ]);
    }
    
    hideLoading('usuarios-loading');
}

function displayUsuarios(usuarios) {
    const grid = document.getElementById('usuarios-grid');
    
    if (!usuarios || usuarios.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--admin-secondary);">
                <i class="fas fa-users fa-3x" style="opacity: 0.3; margin-bottom: 1rem;"></i>
                <h3>No hay usuarios registrados</h3>
                <p>Crea el primer usuario administrador</p>
                <button class="btn btn-primary" onclick="AdminPanel.openUserModal()">
                    <i class="fas fa-user-plus"></i>
                    Crear Primer Usuario
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = usuarios.map(usuario => `
        <div class="admin-card user-card" data-user-id="${usuario.id}">
            <div class="card-header">
                <div class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-details">
                        <h3 class="user-name">${usuario.full_name || usuario.username}</h3>
                        <p class="user-username">@${usuario.username}</p>
                        <span class="user-role ${usuario.role?.toLowerCase().replace(' ', '-') || 'editor'}">${usuario.role || 'Editor'}</span>
                        ${usuario.role === 'Barbero' && usuario.barbero_id ? `<p class="barbero-association"><i class="fas fa-link"></i> Barbero ID: ${usuario.barbero_id}</p>` : ''}
                    </div>
                </div>
                <div class="card-actions">
                    <span class="status-badge ${usuario.status}" title="Estado: ${usuario.status}">
                        <i class="fas ${usuario.status === 'activo' ? 'fa-check-circle' : usuario.status === 'suspendido' ? 'fa-ban' : 'fa-pause-circle'}"></i>
                    </span>
                </div>
            </div>
            
            <div class="card-content">
                <div class="user-meta">
                    <div class="meta-item">
                        <i class="fas fa-envelope"></i>
                        <span>${usuario.email || 'Sin email'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>Último acceso: ${usuario.last_login ? new Date(usuario.last_login).toLocaleDateString('es-VE') : 'Nunca'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar-plus"></i>
                        <span>Creado: ${new Date(usuario.created_at || Date.now()).toLocaleDateString('es-VE')}</span>
                    </div>
                </div>
                
                ${usuario.notes ? `
                    <div class="user-notes">
                        <i class="fas fa-sticky-note"></i>
                        <span>${usuario.notes}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="card-footer">
                <button class="btn btn-sm btn-outline" onclick="AdminPanel.editUser('${usuario.id}')" 
                        title="Editar Usuario">
                    <i class="fas fa-edit"></i>
                    Editar
                </button>
                <button class="btn btn-sm btn-outline" onclick="AdminPanel.toggleUserStatus('${usuario.id}')" 
                        title="${usuario.status === 'activo' ? 'Desactivar' : 'Activar'} Usuario">
                    <i class="fas ${usuario.status === 'activo' ? 'fa-pause' : 'fa-play'}"></i>
                    ${usuario.status === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
                <button class="btn btn-sm btn-danger" onclick="AdminPanel.deleteUser('${usuario.id}')" 
                        title="Eliminar Usuario">
                    <i class="fas fa-trash"></i>
                    Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

function openUserModal(userId = null) {
    editingUserId = userId;
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const saveBtn = document.getElementById('user-save-btn-text');
    const passwordSection = document.getElementById('password-section');
    
    // Limpiar formulario
    document.getElementById('user-form').reset();
    clearPasswordValidation();
    
    if (userId) {
        title.textContent = 'Editar Usuario';
        saveBtn.textContent = 'Actualizar Usuario';
        passwordSection.style.display = 'none'; // No mostrar contraseña al editar
        loadUserData(userId);
    } else {
        title.textContent = 'Agregar Usuario';
        saveBtn.textContent = 'Crear Usuario';
        passwordSection.style.display = 'block';
        // Hacer la contraseña requerida para nuevos usuarios
        document.getElementById('user-password').required = true;
        document.getElementById('user-password-confirm').required = true;
    }
    
    modal.style.display = 'block';
    document.getElementById('user-username').focus();
}

function closeUserModal() {
    const modal = document.getElementById('user-modal');
    modal.style.display = 'none';
    editingUserId = null;
    clearPasswordValidation();
}

async function loadUserData(userId) {
    try {
        const response = await fetch(`tables/admin_users/${userId}`);
        const user = await response.json();
        
        // Llenar el formulario con los datos del usuario
        document.getElementById('user-username').value = user.username || '';
        document.getElementById('user-full-name').value = user.full_name || '';
        document.getElementById('user-email').value = user.email || '';
        document.getElementById('user-role').value = user.role || '';
        document.getElementById('user-status').value = user.status || 'activo';
        document.getElementById('user-notes').value = user.notes || '';
        
        // Si es barbero, mostrar y llenar el campo barbero_id
        if (user.role === 'Barbero') {
            const barberoSection = document.getElementById('barbero-selection');
            barberoSection.style.display = 'block';
            await loadBarberOptions();
            if (user.barbero_id) {
                document.getElementById('user-barbero-id').value = user.barbero_id;
            }
        }
        
        // Deshabilitar la edición del username para usuarios existentes
        document.getElementById('user-username').disabled = true;
    } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        showToast('Error al cargar datos del usuario', 'error');
    }
}

async function saveUser(event) {
    event.preventDefault();
    
    const formData = {
        username: document.getElementById('user-username').value.trim(),
        full_name: document.getElementById('user-full-name').value.trim(),
        email: document.getElementById('user-email').value.trim(),
        role: document.getElementById('user-role').value,
        status: document.getElementById('user-status').value,
        notes: document.getElementById('user-notes').value.trim()
    };
    
    // Si el rol es Barbero, incluir barbero_id
    if (formData.role === 'Barbero') {
        const barberoId = document.getElementById('user-barbero-id').value;
        if (!barberoId) {
            showToast('Debes seleccionar un barbero para este rol', 'error');
            return;
        }
        formData.barbero_id = barberoId;
    }
    
    // Validaciones básicas
    if (!formData.username || !formData.full_name || !formData.email || !formData.role) {
        showToast('Por favor completa todos los campos obligatorios', 'error');
        return;
    }
    
    // Validar formato de username
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        showToast('El nombre de usuario solo puede contener letras, números y guiones bajos', 'error');
        return;
    }
    
    // Si es un usuario nuevo, validar contraseña
    if (!editingUserId) {
        const password = document.getElementById('user-password').value;
        const confirmPassword = document.getElementById('user-password-confirm').value;
        
        if (!password) {
            showToast('La contraseña es obligatoria para nuevos usuarios', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (password.length < 8) {
            showToast('La contraseña debe tener al menos 8 caracteres', 'error');
            return;
        }
        
        // Hash simple de la contraseña (en producción usar bcrypt)
        formData.password = `${password}_hash`;
        formData.created_by = authManager.currentUser?.username || 'admin';
        formData.failed_attempts = 0;
    }
    
    try {
        const url = editingUserId ? `tables/admin_users/${editingUserId}` : 'tables/admin_users';
        const method = editingUserId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const savedUser = await response.json();
            showToast(`Usuario ${editingUserId ? 'actualizado' : 'creado'} exitosamente`, 'success');
            closeUserModal();
            loadUsuarios(); // Recargar la lista
        } else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error guardando usuario:', error);
        showToast('Error al guardar el usuario', 'error');
    }
}

async function editUser(userId) {
    openUserModal(userId);
}

async function toggleUserStatus(userId) {
    // No permitir desactivar el propio usuario
    if (authManager.currentUser && authManager.currentUser.id === userId) {
        showToast('No puedes desactivar tu propia cuenta', 'warning');
        return;
    }
    
    try {
        // Primero obtener el usuario actual
        const response = await fetch(`tables/admin_users/${userId}`);
        const user = await response.json();
        
        const newStatus = user.status === 'activo' ? 'inactivo' : 'activo';
        
        const updateResponse = await fetch(`tables/admin_users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (updateResponse.ok) {
            showToast(`Usuario ${newStatus === 'activo' ? 'activado' : 'desactivado'} exitosamente`, 'success');
            loadUsuarios();
        } else {
            throw new Error(`Error ${updateResponse.status}`);
        }
    } catch (error) {
        console.error('Error cambiando estado del usuario:', error);
        showToast('Error al cambiar estado del usuario', 'error');
    }
}

async function deleteUser(userId) {
    // No permitir eliminar el propio usuario
    if (authManager.currentUser && authManager.currentUser.id === userId) {
        showToast('No puedes eliminar tu propia cuenta', 'warning');
        return;
    }
    
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`tables/admin_users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            showToast('Usuario eliminado exitosamente', 'success');
            loadUsuarios();
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showToast('Error al eliminar usuario', 'error');
    }
}

// Validación de contraseña en tiempo real
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('user-password');
    const confirmInput = document.getElementById('user-password-confirm');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', validatePasswordStrength);
    }
    
    if (confirmInput) {
        confirmInput.addEventListener('input', validatePasswordMatch);
    }
});

function validatePasswordStrength() {
    const password = document.getElementById('user-password').value;
    const indicator = document.getElementById('password-strength-indicator');
    const fill = indicator.querySelector('.strength-fill');
    const text = indicator.querySelector('.strength-text');
    
    let strength = 0;
    let message = '';
    
    if (password.length >= 8) strength += 1;
    if (password.match(/[a-z]/)) strength += 1;
    if (password.match(/[A-Z]/)) strength += 1;
    if (password.match(/[0-9]/)) strength += 1;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 1;
    
    const percentage = (strength / 5) * 100;
    fill.style.width = percentage + '%';
    
    if (password.length === 0) {
        message = 'Ingresa una contraseña';
        fill.className = 'strength-fill';
    } else if (strength <= 2) {
        message = 'Débil';
        fill.className = 'strength-fill weak';
    } else if (strength <= 3) {
        message = 'Regular';
        fill.className = 'strength-fill medium';
    } else if (strength <= 4) {
        message = 'Fuerte';
        fill.className = 'strength-fill strong';
    } else {
        message = 'Muy fuerte';
        fill.className = 'strength-fill very-strong';
    }
    
    text.textContent = message;
    validatePasswordMatch(); // También validar coincidencia
}

function validatePasswordMatch() {
    const password = document.getElementById('user-password').value;
    const confirm = document.getElementById('user-password-confirm').value;
    const indicator = document.getElementById('password-match-indicator');
    const text = indicator.querySelector('.match-text');
    
    if (confirm.length === 0) {
        text.textContent = '';
        indicator.className = 'password-match-indicator';
        return;
    }
    
    if (password === confirm) {
        text.textContent = 'Las contraseñas coinciden';
        indicator.className = 'password-match-indicator match';
    } else {
        text.textContent = 'Las contraseñas no coinciden';
        indicator.className = 'password-match-indicator no-match';
    }
}

function clearPasswordValidation() {
    const strengthIndicator = document.getElementById('password-strength-indicator');
    const matchIndicator = document.getElementById('password-match-indicator');
    
    if (strengthIndicator) {
        const fill = strengthIndicator.querySelector('.strength-fill');
        const text = strengthIndicator.querySelector('.strength-text');
        fill.style.width = '0%';
        fill.className = 'strength-fill';
        text.textContent = 'Ingresa una contraseña';
    }
    
    if (matchIndicator) {
        const text = matchIndicator.querySelector('.match-text');
        text.textContent = '';
        matchIndicator.className = 'password-match-indicator';
    }
}

// Función auxiliar para cargar opciones de barberos
async function loadBarberOptions() {
    const select = document.getElementById('user-barbero-id');
    if (!select) return;
    
    try {
        const response = await fetch('tables/barberos?limit=50');
        const data = await response.json();
        const barberos = data.data || [];
        
        select.innerHTML = '<option value="">Seleccionar barbero</option>';
        barberos.forEach(barbero => {
            const option = document.createElement('option');
            option.value = barbero.id;
            option.textContent = barbero.nombre;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando barberos:', error);
    }
}

//=== FUNCIONES ESPECÍFICAS PARA BARBEROS ===
let editingPortfolioImageId = null;

async function loadMyBarberProfile() {
    if (!authManager.currentUser || authManager.currentUser.role !== 'Barbero') {
        showToast('Acceso denegado. Solo disponible para barberos.', 'error');
        return;
    }

    const barberoId = authManager.currentUser.barbero_id;
    if (!barberoId) {
        showToast('Error: No tienes un perfil de barbero asociado.', 'error');
        return;
    }

    try {
        const response = await fetch(`tables/barberos/${barberoId}`);
        if (response.ok) {
            const barbero = await response.json();
            fillBarberProfileForm(barbero);
        } else {
            throw new Error('No se pudo cargar el perfil');
        }
    } catch (error) {
        console.error('Error cargando perfil del barbero:', error);
        showToast('Error al cargar tu perfil', 'error');
    }
}

function fillBarberProfileForm(barbero) {
    document.getElementById('profile-nombre').value = barbero.nombre || '';
    document.getElementById('profile-experiencia').value = barbero.experiencia || '';
    document.getElementById('profile-especialidades').value = barbero.especialidades || '';
    document.getElementById('profile-telefono').value = barbero.telefono || '';
    document.getElementById('profile-biografia').value = barbero.biografia || '';
    document.getElementById('profile-instagram').value = barbero.instagram || '';
    document.getElementById('profile-activo').checked = barbero.activo !== false;
}

async function saveBarberProfile(event) {
    event.preventDefault();
    
    if (!authManager.currentUser || authManager.currentUser.role !== 'Barbero') {
        showToast('Acceso denegado.', 'error');
        return;
    }

    const barberoId = authManager.currentUser.barbero_id;
    if (!barberoId) {
        showToast('Error: No tienes un perfil de barbero asociado.', 'error');
        return;
    }

    const formData = {
        nombre: document.getElementById('profile-nombre').value.trim(),
        experiencia: parseInt(document.getElementById('profile-experiencia').value) || 0,
        especialidades: document.getElementById('profile-especialidades').value.trim(),
        telefono: document.getElementById('profile-telefono').value.trim(),
        biografia: document.getElementById('profile-biografia').value.trim(),
        instagram: document.getElementById('profile-instagram').value.trim(),
        activo: document.getElementById('profile-activo').checked
    };

    // Validaciones básicas
    if (!formData.nombre || !formData.biografia) {
        showToast('Por favor completa al menos el nombre y la biografía', 'error');
        return;
    }

    try {
        const response = await fetch(`tables/barberos/${barberoId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showToast('Perfil actualizado exitosamente', 'success');
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error('Error guardando perfil:', error);
        showToast('Error al actualizar el perfil', 'error');
    }
}

async function loadMyPortfolio() {
    if (!authManager.currentUser || authManager.currentUser.role !== 'Barbero') {
        showToast('Acceso denegado. Solo disponible para barberos.', 'error');
        return;
    }

    const barberoId = authManager.currentUser.barbero_id;
    if (!barberoId) {
        showToast('Error: No tienes un perfil de barbero asociado.', 'error');
        return;
    }

    const grid = document.getElementById('mi-portfolio-grid');
    showLoading('mi-portfolio-loading');

    try {
        const response = await fetch(`tables/barbero_portfolio?search=${barberoId}&limit=50`);
        const data = await response.json();
        
        const portfolioItems = (data.data || []).filter(item => item.barbero_id === barberoId);
        displayMyPortfolio(portfolioItems);
    } catch (error) {
        console.error('Error cargando portfolio:', error);
        showToast('Error al cargar tu portfolio', 'error');
        
        // Mostrar mensaje de portfolio vacío
        displayMyPortfolio([]);
    }
    
    hideLoading('mi-portfolio-loading');
}

function displayMyPortfolio(portfolioItems) {
    const grid = document.getElementById('mi-portfolio-grid');
    
    if (!portfolioItems || portfolioItems.length === 0) {
        grid.innerHTML = `
            <div class="empty-portfolio">
                <i class="fas fa-camera fa-3x"></i>
                <h3>Tu Portfolio Está Vacío</h3>
                <p>Comienza subiendo fotos de tus mejores trabajos</p>
                <button class="btn btn-primary" onclick="AdminPanel.openPortfolioImageModal()">
                    <i class="fas fa-plus"></i>
                    Subir Primera Foto
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = portfolioItems.map(item => `
        <div class="portfolio-item" data-id="${item.id}">
            <div class="portfolio-image">
                <img src="${item.imagen_url}" alt="${item.titulo}" 
                     onerror="this.src='https://via.placeholder.com/300x300?text=Error+Imagen'">
                <div class="portfolio-overlay">
                    <div class="portfolio-actions">
                        <button class="btn-icon" onclick="AdminPanel.editPortfolioImage('${item.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="AdminPanel.deletePortfolioImage('${item.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="portfolio-info">
                <h4>${item.titulo}</h4>
                <p class="portfolio-type">${item.tipo_corte || 'Sin categoría'}</p>
                <p class="portfolio-description">${item.descripcion || 'Sin descripción'}</p>
                <div class="portfolio-meta">
                    <span class="portfolio-date">
                        <i class="fas fa-calendar"></i>
                        ${item.fecha_trabajo ? new Date(item.fecha_trabajo).toLocaleDateString('es-VE') : 'Sin fecha'}
                    </span>
                    <span class="portfolio-status status-${item.estado}">
                        <i class="fas ${item.estado === 'publico' ? 'fa-eye' : item.estado === 'privado' ? 'fa-eye-slash' : 'fa-clock'}"></i>
                        ${item.estado || 'público'}
                    </span>
                </div>
                ${item.tags && item.tags.length > 0 ? `
                    <div class="portfolio-tags">
                        ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function openPortfolioImageModal(imageId = null) {
    editingPortfolioImageId = imageId;
    const modal = document.getElementById('portfolio-image-modal');
    const title = document.getElementById('portfolio-image-modal-title');
    const saveBtn = document.getElementById('portfolio-save-btn-text');
    
    // Limpiar formulario
    document.getElementById('portfolio-image-form').reset();
    // Establecer fecha actual por defecto
    document.getElementById('portfolio-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('portfolio-estado').value = 'publico';
    
    if (imageId) {
        title.textContent = 'Editar Trabajo';
        saveBtn.textContent = 'Actualizar Trabajo';
        loadPortfolioImageData(imageId);
    } else {
        title.textContent = 'Agregar Trabajo al Portfolio';
        saveBtn.textContent = 'Agregar al Portfolio';
    }
    
    modal.style.display = 'block';
    document.getElementById('portfolio-imagen-url').focus();
}

function closePortfolioImageModal() {
    const modal = document.getElementById('portfolio-image-modal');
    modal.style.display = 'none';
    editingPortfolioImageId = null;
}

async function savePortfolioImage(event) {
    event.preventDefault();
    
    if (!authManager.currentUser || authManager.currentUser.role !== 'Barbero') {
        showToast('Acceso denegado.', 'error');
        return;
    }

    const barberoId = authManager.currentUser.barbero_id;
    if (!barberoId) {
        showToast('Error: No tienes un perfil de barbero asociado.', 'error');
        return;
    }

    const formData = {
        barbero_id: barberoId,
        imagen_url: document.getElementById('portfolio-imagen-url').value.trim(),
        titulo: document.getElementById('portfolio-titulo').value.trim(),
        tipo_corte: document.getElementById('portfolio-tipo-corte').value,
        descripcion: document.getElementById('portfolio-descripcion').value.trim(),
        fecha_trabajo: document.getElementById('portfolio-fecha').value,
        estado: document.getElementById('portfolio-estado').value,
        uploaded_by: authManager.currentUser.username,
        orden: Date.now()
    };

    // Procesar tags
    const tagsInput = document.getElementById('portfolio-tags').value.trim();
    if (tagsInput) {
        formData.tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Validaciones
    if (!formData.imagen_url || !formData.titulo) {
        showToast('Por favor completa la URL de la imagen y el título', 'error');
        return;
    }

    try {
        const url = editingPortfolioImageId ? `tables/barbero_portfolio/${editingPortfolioImageId}` : 'tables/barbero_portfolio';
        const method = editingPortfolioImageId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showToast(`Trabajo ${editingPortfolioImageId ? 'actualizado' : 'agregado'} exitosamente`, 'success');
            closePortfolioImageModal();
            loadMyPortfolio();
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error('Error guardando imagen del portfolio:', error);
        showToast('Error al guardar el trabajo', 'error');
    }
}

async function editPortfolioImage(imageId) {
    openPortfolioImageModal(imageId);
}

async function deletePortfolioImage(imageId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este trabajo de tu portfolio?')) {
        return;
    }

    try {
        const response = await fetch(`tables/barbero_portfolio/${imageId}`, {
            method: 'DELETE'
        });

        if (response.ok || response.status === 204) {
            showToast('Trabajo eliminado exitosamente', 'success');
            loadMyPortfolio();
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error('Error eliminando imagen:', error);
        showToast('Error al eliminar el trabajo', 'error');
    }
}

// Función para configurar la interfaz según el rol del usuario
function setupRoleBasedInterface() {
    if (!authManager.currentUser) return;

    const userRole = authManager.currentUser.role;
    
    // Elementos que solo ven administradores
    const adminOnlyTabs = ['barberos', 'servicios', 'configuracion', 'usuarios'];
    // Elementos que solo ven barberos
    const barberOnlyTabs = ['mi-perfil', 'mi-portfolio'];
    
    adminOnlyTabs.forEach(tabName => {
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        if (tab) {
            if (userRole === 'Super Admin' || userRole === 'Administrador') {
                tab.style.display = 'block';
            } else {
                tab.style.display = 'none';
            }
        }
    });
    
    barberOnlyTabs.forEach(tabName => {
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        if (tab) {
            if (userRole === 'Barbero') {
                tab.style.display = 'block';
            } else {
                tab.style.display = 'none';
            }
        }
    });
    
    // Configurar pestaña activa por defecto según el rol
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    let defaultTab;
    if (userRole === 'Barbero') {
        defaultTab = 'mi-perfil';
    } else {
        defaultTab = 'barberos';
    }
    
    const defaultTabBtn = document.querySelector(`[data-tab="${defaultTab}"]`);
    if (defaultTabBtn && defaultTabBtn.style.display !== 'none') {
        defaultTabBtn.classList.add('active');
        switchTab(defaultTab);
    }
}

//=== PORTFOLIO AVANZADO ===
let editingGalleryId = null;
let editingAdvancedImageId = null;
let currentTags = [];
let imageFilters = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    filter: 'none'
};

async function loadAdvancedPortfolio() {
    // Configurar pestañas del portfolio
    setupPortfolioTabs();
    
    // Cargar primera pestaña (galerías)
    switchPortfolioTab('galerias');
}

function setupPortfolioTabs() {
    const tabButtons = document.querySelectorAll('.portfolio-tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('data-portfolio-tab');
            switchPortfolioTab(tab);
        });
    });
}

function switchPortfolioTab(tab) {
    // Actualizar botones activos
    document.querySelectorAll('.portfolio-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-portfolio-tab="${tab}"]`).classList.add('active');
    
    // Ocultar todos los contenidos
    document.querySelectorAll('.portfolio-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Mostrar contenido activo
    document.getElementById(`${tab}-content`).classList.add('active');
    
    // Cargar datos según la pestaña
    switch(tab) {
        case 'galerias':
            loadGalerias();
            break;
        case 'todas-imagenes':
            loadAllImages();
            break;
        case 'pendientes':
            loadPendingImages();
            break;
        case 'estadisticas':
            loadPortfolioStats();
            break;
    }
}

// === GESTIÓN DE GALERÍAS ===
async function loadGalerias() {
    const grid = document.getElementById('galleries-grid');
    showLoading('galerias-loading');
    
    try {
        const response = await fetch('tables/portfolio_galerias?sort=orden&limit=50');
        const data = await response.json();
        
        displayGalerias(data.data || []);
    } catch (error) {
        console.error('Error cargando galerías:', error);
        showToast('Error al cargar galerías', 'error');
        
        // Mostrar mensaje de error
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h3>Error al cargar galerías</h3>
                <p>Intenta recargar la página</p>
            </div>
        `;
    }
    
    hideLoading('galerias-loading');
}

function displayGalerias(galerias) {
    const grid = document.getElementById('galleries-grid');
    
    if (!galerias || galerias.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open fa-3x"></i>
                <h3>No hay galerías creadas</h3>
                <p>Crea tu primera galería para organizar el portfolio</p>
                <button class="btn btn-primary" onclick="AdminPanel.openGalleryModal()">
                    <i class="fas fa-plus"></i>
                    Crear Primera Galería
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = galerias.map(galeria => `
        <div class="gallery-card" data-gallery-id="${galeria.id}">
            <div class="gallery-header" style="background: linear-gradient(135deg, ${galeria.color_tema || '#2563eb'}, ${adjustColor(galeria.color_tema || '#2563eb', -20)});">
                <div class="gallery-info">
                    <h3>${galeria.nombre}</h3>
                    <p class="gallery-description">${galeria.descripcion || ''}</p>
                    <div class="gallery-meta">
                        <span class="gallery-style">${galeria.estilo}</span>
                        <span class="gallery-category">${galeria.categoria_principal}</span>
                        <span class="gallery-layout">${getLayoutName(galeria.layout)}</span>
                    </div>
                </div>
                <div class="gallery-cover">
                    ${galeria.imagen_portada ? `<img src="${galeria.imagen_portada}" alt="${galeria.nombre}">` : `<i class="fas fa-images fa-2x"></i>`}
                </div>
            </div>
            
            <div class="gallery-body">
                <div class="gallery-stats">
                    <div class="stat">
                        <i class="fas fa-images"></i>
                        <span id="images-count-${galeria.id}">0 imágenes</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-eye"></i>
                        <span id="views-count-${galeria.id}">0 vistas</span>
                    </div>
                </div>
                
                <div class="gallery-status">
                    <span class="status-badge ${galeria.activa ? 'activa' : 'inactiva'}">
                        <i class="fas ${galeria.activa ? 'fa-eye' : 'fa-eye-slash'}"></i>
                        ${galeria.activa ? 'Pública' : 'Oculta'}
                    </span>
                </div>
            </div>
            
            <div class="gallery-actions">
                <button class="btn btn-sm btn-outline" onclick="AdminPanel.viewGalleryImages('${galeria.id}')" title="Ver Imágenes">
                    <i class="fas fa-images"></i>
                    Ver Imágenes
                </button>
                <button class="btn btn-sm btn-outline" onclick="AdminPanel.editGallery('${galeria.id}')" title="Editar Galería">
                    <i class="fas fa-edit"></i>
                    Editar
                </button>
                <button class="btn btn-sm btn-outline" onclick="AdminPanel.toggleGalleryStatus('${galeria.id}')" title="Cambiar Estado">
                    <i class="fas ${galeria.activa ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    ${galeria.activa ? 'Ocultar' : 'Mostrar'}
                </button>
                <button class="btn btn-sm btn-danger" onclick="AdminPanel.deleteGallery('${galeria.id}')" title="Eliminar Galería">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Cargar estadísticas de cada galería
    galerias.forEach(galeria => loadGalleryStats(galeria.id));
}

function adjustColor(hex, percent) {
    // Función para oscurecer/aclarar color
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function getLayoutName(layout) {
    const names = {
        'grid': 'Cuadrícula',
        'masonry': 'Pinterest',
        'carousel': 'Deslizante',
        'timeline': 'Línea de tiempo'
    };
    return names[layout] || layout;
}

async function loadGalleryStats(galleryId) {
    try {
        const response = await fetch(`tables/barbero_portfolio?search=${galleryId}&limit=100`);
        const data = await response.json();
        const images = (data.data || []).filter(img => img.galeria_id === galleryId);
        
        const imagesCount = images.length;
        const viewsCount = images.reduce((sum, img) => sum + (img.vistas || 0), 0);
        
        const imagesElement = document.getElementById(`images-count-${galleryId}`);
        const viewsElement = document.getElementById(`views-count-${galleryId}`);
        
        if (imagesElement) imagesElement.textContent = `${imagesCount} imágenes`;
        if (viewsElement) viewsElement.textContent = `${viewsCount} vistas`;
    } catch (error) {
        console.error(`Error cargando estadísticas de galería ${galleryId}:`, error);
    }
}

// === MODAL DE GALERÍA ===
function openGalleryModal(galleryId = null) {
    editingGalleryId = galleryId;
    const modal = document.getElementById('gallery-modal');
    const title = document.getElementById('gallery-modal-title');
    const saveBtn = document.getElementById('gallery-save-btn-text');
    
    // Limpiar formulario
    document.getElementById('gallery-form').reset();
    document.getElementById('gallery-color').value = '#2563eb';
    document.getElementById('gallery-activa').checked = true;
    
    if (galleryId) {
        title.textContent = 'Editar Galería';
        saveBtn.textContent = 'Actualizar Galería';
        loadGalleryData(galleryId);
    } else {
        title.textContent = 'Nueva Galería';
        saveBtn.textContent = 'Crear Galería';
    }
    
    modal.style.display = 'block';
    document.getElementById('gallery-nombre').focus();
    
    // Configurar listener para layout
    document.getElementById('gallery-layout').addEventListener('change', updateLayoutConfig);
}

function closeGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    modal.style.display = 'none';
    editingGalleryId = null;
}

function updateLayoutConfig() {
    const layout = document.getElementById('gallery-layout').value;
    const configDiv = document.getElementById('layout-config');
    
    let configHTML = '';
    
    switch(layout) {
        case 'grid':
            configHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Columnas</label>
                        <select class="form-select" data-config="columnas">
                            <option value="2">2 columnas</option>
                            <option value="3" selected>3 columnas</option>
                            <option value="4">4 columnas</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Espaciado</label>
                        <select class="form-select" data-config="espaciado">
                            <option value="compacto">Compacto</option>
                            <option value="normal" selected>Normal</option>
                            <option value="amplio">Amplio</option>
                        </select>
                    </div>
                </div>
            `;
            break;
            
        case 'masonry':
            configHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Columnas</label>
                        <select class="form-select" data-config="columnas">
                            <option value="2" selected>2 columnas</option>
                            <option value="3">3 columnas</option>
                            <option value="4">4 columnas</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" data-config="animaciones" checked>
                            <span class="toggle-slider"></span>
                            Animaciones al cargar
                        </label>
                    </div>
                </div>
            `;
            break;
            
        case 'carousel':
            configHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" data-config="autoplay" checked>
                            <span class="toggle-slider"></span>
                            Reproducción automática
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Velocidad (ms)</label>
                        <input type="number" class="form-input" data-config="velocidad" value="3000" min="1000" max="10000" step="500">
                    </div>
                </div>
            `;
            break;
            
        case 'timeline':
            configHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" data-config="mostrar_fechas" checked>
                            <span class="toggle-slider"></span>
                            Mostrar fechas
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" data-config="animaciones" checked>
                            <span class="toggle-slider"></span>
                            Animaciones de entrada
                        </label>
                    </div>
                </div>
            `;
            break;
    }
    
    configDiv.innerHTML = configHTML;
}

async function saveGallery(event) {
    event.preventDefault();
    
    const formData = {
        nombre: document.getElementById('gallery-nombre').value.trim(),
        descripcion: document.getElementById('gallery-descripcion').value.trim(),
        estilo: document.getElementById('gallery-estilo').value,
        categoria_principal: document.getElementById('gallery-categoria').value,
        layout: document.getElementById('gallery-layout').value,
        color_tema: document.getElementById('gallery-color').value,
        imagen_portada: document.getElementById('gallery-imagen-portada').value.trim(),
        activa: document.getElementById('gallery-activa').checked,
        creado_por: authManager.currentUser?.username || 'admin'
    };
    
    // Recoger configuración del layout
    const configElements = document.querySelectorAll('#layout-config [data-config]');
    const configuracion = {};
    
    configElements.forEach(element => {
        const key = element.getAttribute('data-config');
        if (element.type === 'checkbox') {
            configuracion[key] = element.checked;
        } else {
            configuracion[key] = element.value;
        }
    });
    
    formData.configuracion = JSON.stringify(configuracion);
    
    // Validaciones
    if (!formData.nombre || !formData.estilo || !formData.categoria_principal || !formData.layout) {
        showToast('Por favor completa todos los campos obligatorios', 'error');
        return;
    }
    
    try {
        const url = editingGalleryId ? `tables/portfolio_galerias/${editingGalleryId}` : 'tables/portfolio_galerias';
        const method = editingGalleryId ? 'PUT' : 'POST';
        
        // Si es nueva galería, establecer orden
        if (!editingGalleryId) {
            formData.orden = Date.now();
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showToast(`Galería ${editingGalleryId ? 'actualizada' : 'creada'} exitosamente`, 'success');
            closeGalleryModal();
            loadGalerias();
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error('Error guardando galería:', error);
        showToast('Error al guardar la galería', 'error');
    }
}

//=== CONFIGURACIÓN DEL SITIO ===
async function loadConfiguration() {
    // Cargar configuración de redes sociales
    await loadSocialNetworks();
}

async function loadSocialNetworks() {
    try {
        const response = await fetch('tables/sitio_configuracion?search=redes_sociales&limit=20');
        const data = await response.json();
        const configs = data.data || [];
        
        // Llenar los campos del formulario
        configs.forEach(config => {
            const fieldId = getFieldIdFromKey(config.clave);
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = config.valor || '';
            }
        });
        
        // Actualizar vista previa
        updateSocialPreview();
        
    } catch (error) {
        console.error('Error cargando configuración de redes sociales:', error);
        // Cargar valores por defecto en caso de error
        loadDefaultSocialValues();
    }
}

function getFieldIdFromKey(key) {
    const mapping = {
        'facebook_url': 'facebook-url',
        'instagram_url': 'instagram-url',
        'whatsapp_numero': 'whatsapp-social',
        'tiktok_url': 'tiktok-url',
        'youtube_url': 'youtube-url',
        'email_contacto': 'contact-email'
    };
    return mapping[key] || key;
}

function loadDefaultSocialValues() {
    // Valores por defecto si no hay configuración
    const defaults = {
        'facebook-url': 'https://facebook.com/chamosbarber',
        'instagram-url': 'https://instagram.com/chamosbarber',
        'whatsapp-social': '+56912345678',
        'tiktok-url': 'https://tiktok.com/@chamosbarber',
        'youtube-url': '',
        'contact-email': 'contacto@chamosbarber.com'
    };
    
    Object.entries(defaults).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
        }
    });
    
    updateSocialPreview();
}

async function saveSocialNetworks(event) {
    event.preventDefault();
    
    const formData = {
        facebook_url: document.getElementById('facebook-url').value.trim(),
        instagram_url: document.getElementById('instagram-url').value.trim(),
        whatsapp_numero: document.getElementById('whatsapp-social').value.trim(),
        tiktok_url: document.getElementById('tiktok-url').value.trim(),
        youtube_url: document.getElementById('youtube-url').value.trim(),
        email_contacto: document.getElementById('contact-email').value.trim()
    };
    
    // Validaciones
    const validationErrors = validateSocialNetworks(formData);
    if (validationErrors.length > 0) {
        showToast('Errores de validación: ' + validationErrors.join(', '), 'error');
        return;
    }
    
    try {
        let savedCount = 0;
        const totalFields = Object.keys(formData).length;
        
        for (const [key, value] of Object.entries(formData)) {
            // Buscar si ya existe la configuración
            const searchResponse = await fetch(`tables/sitio_configuracion?search=${key}&limit=1`);
            const searchData = await searchResponse.json();
            const existingConfig = searchData.data?.find(config => config.clave === key);
            
            const configData = {
                clave: key,
                valor: value,
                categoria: key === 'email_contacto' ? 'contacto' : 'redes_sociales',
                descripcion: getFieldDescription(key),
                tipo_dato: getFieldType(key),
                validacion: getFieldValidation(key),
                activo: true,
                orden: getFieldOrder(key),
                modificado_por: authManager.currentUser?.username || 'admin',
                fecha_modificacion: new Date().toISOString()
            };
            
            let response;
            if (existingConfig) {
                // Actualizar existente
                response = await fetch(`tables/sitio_configuracion/${existingConfig.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ valor: value, modificado_por: configData.modificado_por, fecha_modificacion: configData.fecha_modificacion })
                });
            } else {
                // Crear nuevo
                response = await fetch('tables/sitio_configuracion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(configData)
                });
            }
            
            if (response.ok) {
                savedCount++;
            }
        }
        
        if (savedCount === totalFields) {
            showToast('Configuración de redes sociales guardada exitosamente', 'success');
            updateSocialPreview();
            
            // Actualizar las páginas públicas
            await updatePublicPages();
        } else {
            showToast(`Guardado parcial: ${savedCount}/${totalFields} campos actualizados`, 'warning');
        }
        
    } catch (error) {
        console.error('Error guardando configuración:', error);
        showToast('Error al guardar la configuración', 'error');
    }
}

function validateSocialNetworks(data) {
    const errors = [];
    
    // Validar URLs de redes sociales
    if (data.facebook_url && !isValidUrl(data.facebook_url)) {
        errors.push('URL de Facebook inválida');
    }
    
    if (data.instagram_url && !isValidUrl(data.instagram_url)) {
        errors.push('URL de Instagram inválida');
    }
    
    if (data.tiktok_url && !isValidUrl(data.tiktok_url)) {
        errors.push('URL de TikTok inválida');
    }
    
    if (data.youtube_url && !isValidUrl(data.youtube_url)) {
        errors.push('URL de YouTube inválida');
    }
    
    // Validar WhatsApp (requerido)
    if (!data.whatsapp_numero) {
        errors.push('Número de WhatsApp es requerido');
    } else if (!/^\+56[0-9]{9}$/.test(data.whatsapp_numero)) {
        errors.push('Formato de WhatsApp inválido (usar +56xxxxxxxxx)');
    }
    
    // Validar email
    if (data.email_contacto && !isValidEmail(data.email_contacto)) {
        errors.push('Email de contacto inválido');
    }
    
    return errors;
}

function isValidUrl(url) {
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}

function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function getFieldDescription(key) {
    const descriptions = {
        'facebook_url': 'URL de la página de Facebook de Chamos Barber',
        'instagram_url': 'URL de la cuenta de Instagram de Chamos Barber',
        'whatsapp_numero': 'Número de WhatsApp para contacto (incluir código de país)',
        'tiktok_url': 'URL de TikTok de Chamos Barber',
        'youtube_url': 'URL de YouTube de Chamos Barber',
        'email_contacto': 'Email principal de contacto'
    };
    return descriptions[key] || '';
}

function getFieldType(key) {
    const types = {
        'facebook_url': 'url',
        'instagram_url': 'url',
        'whatsapp_numero': 'telefono',
        'tiktok_url': 'url',
        'youtube_url': 'url',
        'email_contacto': 'email'
    };
    return types[key] || 'texto';
}

function getFieldValidation(key) {
    const validations = {
        'facebook_url': '{"required": false, "pattern": "^https?:\\/\\/(www\\.)?facebook\\.com\\/.+"}',
        'instagram_url': '{"required": false, "pattern": "^https?:\\/\\/(www\\.)?instagram\\.com\\/.+"}',
        'whatsapp_numero': '{"required": true, "pattern": "^\\\\+56[0-9]{9}$"}',
        'tiktok_url': '{"required": false, "pattern": "^https?:\\/\\/(www\\.)?tiktok\\.com\\/.+"}',
        'youtube_url': '{"required": false, "pattern": "^https?:\\/\\/(www\\.)?youtube\\.com\\/.+"}',
        'email_contacto': '{"required": false, "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$"}'
    };
    return validations[key] || '{}';
}

function getFieldOrder(key) {
    const orders = {
        'facebook_url': 1,
        'instagram_url': 2,
        'whatsapp_numero': 3,
        'tiktok_url': 4,
        'youtube_url': 5,
        'email_contacto': 6
    };
    return orders[key] || 10;
}

function updateSocialPreview() {
    const preview = document.getElementById('social-links-preview');
    if (!preview) return;
    
    const facebook = document.getElementById('facebook-url').value.trim();
    const instagram = document.getElementById('instagram-url').value.trim();
    const whatsapp = document.getElementById('whatsapp-social').value.trim();
    const tiktok = document.getElementById('tiktok-url').value.trim();
    const youtube = document.getElementById('youtube-url').value.trim();
    
    let html = '<div class="social-links">';
    
    if (facebook) {
        html += `<a href="${facebook}" target="_blank" class="social-link facebook"><i class="fab fa-facebook-f"></i></a>`;
    }
    
    if (instagram) {
        html += `<a href="${instagram}" target="_blank" class="social-link instagram"><i class="fab fa-instagram"></i></a>`;
    }
    
    if (whatsapp) {
        const whatsappUrl = `https://wa.me/${whatsapp.replace('+', '')}`;
        html += `<a href="${whatsappUrl}" target="_blank" class="social-link whatsapp"><i class="fab fa-whatsapp"></i></a>`;
    }
    
    if (tiktok) {
        html += `<a href="${tiktok}" target="_blank" class="social-link tiktok"><i class="fab fa-tiktok"></i></a>`;
    }
    
    if (youtube) {
        html += `<a href="${youtube}" target="_blank" class="social-link youtube"><i class="fab fa-youtube"></i></a>`;
    }
    
    html += '</div>';
    
    if (html === '<div class="social-links"></div>') {
        html = '<p class="no-social">No hay enlaces de redes sociales configurados</p>';
    }
    
    preview.innerHTML = html;
}

async function updatePublicPages() {
    // Esta función se podría expandir para actualizar dinámicamente las páginas públicas
    // Por ahora solo mostramos un mensaje
    showToast('Las páginas públicas se actualizarán automáticamente', 'info');
}

// Event listeners para actualizar vista previa en tiempo real
document.addEventListener('DOMContentLoaded', function() {
    const socialFields = ['facebook-url', 'instagram-url', 'whatsapp-social', 'tiktok-url', 'youtube-url'];
    
    socialFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateSocialPreview);
        }
    });
});

// === EXPORTAR FUNCIONES GLOBALES ===
window.AdminPanel = {
    openBarberModal,
    closeBarberModal,
    openServiceModal,
    closeServiceModal,
    openPortfolioModal,
    editBarber,
    deleteBarber,
    toggleBarberStatus,
    editService,
    deleteService,
    toggleServiceStatus,
    saveContactInfo,
    updateSecurityInfo,
    confirmLogoutAllSessions,
    // Funciones de gestión de usuarios
    openUserModal,
    closeUserModal,
    saveUser,
    editUser,
    deleteUser,
    toggleUserStatus,
    loadUsuarios,
    // Funciones específicas para barberos
    loadMyBarberProfile,
    saveBarberProfile,
    loadMyPortfolio,
    openPortfolioImageModal,
    closePortfolioImageModal,
    savePortfolioImage,
    editPortfolioImage,
    deletePortfolioImage,
    setupRoleBasedInterface,
    // Funciones del portfolio avanzado
    loadAdvancedPortfolio,
    openGalleryModal,
    closeGalleryModal,
    saveGallery,
    openAdvancedPortfolioModal,
    closeAdvancedPortfolioModal,
    saveAdvancedPortfolioImage,
    // Funciones de configuración
    loadConfiguration,
    loadSocialNetworks,
    saveSocialNetworks
};