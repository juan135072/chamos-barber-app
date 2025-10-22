// === SISTEMA DE AUTENTICACIÓN CHAMOS BARBER ===

// Configuración de seguridad
const AUTH_CONFIG = {
    SESSION_KEY: 'chamos_auth_session',
    MAX_LOGIN_ATTEMPTS: 3,
    LOCKOUT_DURATION: 5 * 60 * 1000, // 5 minutos en millisegundos
    SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 horas
    REMEMBER_DURATION: 30 * 24 * 60 * 60 * 1000 // 30 días
};

// Credenciales por defecto (en producción usar hash real)
const DEFAULT_CREDENTIALS = {
    'admin': {
        username: 'admin',
        password: 'chamos2024', // En producción: hash bcrypt
        full_name: 'Administrador Principal',
        role: 'owner',
        email: 'admin@chamosbarber.com'
    }
};

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.lockoutTimers = new Map();
        this.init();
    }

    init() {
        // Verificar sesión existente al cargar
        this.checkExistingSession();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Verificar si estamos en página de login
        if (window.location.pathname.includes('login.html')) {
            this.initLoginPage();
        } else if (window.location.pathname.includes('admin.html')) {
            this.protectAdminPage();
        }
    }

    setupEventListeners() {
        // Escuchar cambios en localStorage (para múltiples tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === AUTH_CONFIG.SESSION_KEY) {
                this.handleSessionChange();
            }
        });

        // Verificar expiración de sesión periódicamente
        setInterval(() => {
            this.checkSessionExpiry();
        }, 60000); // Cada minuto
    }

    initLoginPage() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Auto-logout si ya está autenticado
        if (this.isAuthenticated()) {
            this.redirectToAdmin();
        }
    }

    protectAdminPage() {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }

        // Mostrar información del usuario
        this.updateAdminInterface();
        return true;
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const credentials = {
            username: formData.get('username').trim(),
            password: formData.get('password').trim(),
            rememberMe: formData.get('rememberMe') === 'on'
        };

        // Validaciones básicas
        if (!credentials.username || !credentials.password) {
            this.showError('Por favor completa todos los campos');
            return;
        }

        // Verificar si está bloqueado
        if (this.isUserLocked(credentials.username)) {
            this.showLockoutMessage(credentials.username);
            return;
        }

        // Mostrar loading
        this.showLoading(true);

        try {
            // Simular delay de red
            await this.delay(800);

            // Verificar credenciales
            const user = await this.validateCredentials(credentials);
            
            if (user) {
                // Login exitoso
                this.handleSuccessfulLogin(user, credentials.rememberMe);
            } else {
                // Login fallido
                this.handleFailedLogin(credentials.username);
            }
        } catch (error) {
            console.error('Error during login:', error);
            this.showError('Error del servidor. Intenta de nuevo.');
        } finally {
            this.showLoading(false);
        }
    }

    async validateCredentials(credentials) {
        try {
            // Primero intentar con base de datos
            const response = await fetch(`tables/admin_users?search=${credentials.username}&limit=10`);
            
            if (response.ok) {
                const data = await response.json();
                const users = data.data || [];
                const user = users.find(u => 
                    u.username === credentials.username && 
                    u.status === 'activo'
                );
                
                if (user) {
                    // Verificar si está bloqueado por intentos fallidos
                    if (user.locked_until && new Date(user.locked_until) > new Date()) {
                        throw new Error('Usuario bloqueado temporalmente');
                    }
                    
                    // Verificar contraseña (para demo, comparación simple con hash)
                    const isValidPassword = await this.verifyPassword(credentials.password, user.password);
                    
                    if (isValidPassword) {
                        // Limpiar intentos fallidos
                        await this.resetFailedAttempts(user.id);
                        
                        // Actualizar último login
                        await this.updateLastLogin(user.id);
                        
                        // Retornar datos del usuario para la sesión
                        return {
                            id: user.id,
                            username: user.username,
                            full_name: user.full_name,
                            email: user.email,
                            role: user.role,
                            lastLogin: new Date().toISOString()
                        };
                    } else {
                        // Incrementar intentos fallidos
                        await this.incrementFailedAttempts(user.id);
                    }
                }
            }
        } catch (error) {
            console.error('Database validation failed:', error);
            if (error.message === 'Usuario bloqueado temporalmente') {
                throw error;
            }
        }

        // Fallback a credenciales por defecto
        const defaultUser = DEFAULT_CREDENTIALS[credentials.username];
        if (defaultUser && defaultUser.password === credentials.password) {
            return {
                id: 'default_admin',
                username: defaultUser.username,
                full_name: 'Administrador Principal',
                email: 'admin@chamosbarber.com',
                role: 'Super Admin',
                lastLogin: new Date().toISOString()
            };
        }

        return null;
    }

    async verifyPassword(password, storedPassword) {
        // En producción usar bcrypt.compare(password, hash)
        // Para demo, comparación simple
        
        // Si es un hash (termina en _hash), comparar con contraseña base
        if (storedPassword && storedPassword.endsWith('_hash')) {
            const basePassword = storedPassword.replace('_hash', '');
            return password === basePassword;
        }
        
        // Comparación directa para backward compatibility
        return password === storedPassword;
    }

    async updateLastLogin(userId) {
        try {
            await fetch(`tables/admin_users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    last_login: new Date().toISOString(),
                    failed_attempts: 0,
                    locked_until: null
                })
            });
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    async incrementFailedAttempts(userId) {
        try {
            // Obtener usuario actual
            const response = await fetch(`tables/admin_users/${userId}`);
            if (response.ok) {
                const user = await response.json();
                const newAttempts = (user.failed_attempts || 0) + 1;
                
                // Bloquear después de 3 intentos
                const updateData = {
                    failed_attempts: newAttempts
                };
                
                if (newAttempts >= 3) {
                    const lockDuration = 5 * 60 * 1000; // 5 minutos
                    updateData.locked_until = new Date(Date.now() + lockDuration).toISOString();
                }
                
                await fetch(`tables/admin_users/${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
            }
        } catch (error) {
            console.error('Error incrementing failed attempts:', error);
        }
    }

    async resetFailedAttempts(userId) {
        try {
            await fetch(`tables/admin_users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    failed_attempts: 0,
                    locked_until: null
                })
            });
        } catch (error) {
            console.error('Error resetting failed attempts:', error);
        }
    }

    handleSuccessfulLogin(user, rememberMe) {
        // Limpiar intentos fallidos
        this.clearLoginAttempts(user.username);
        
        // Crear sesión
        const sessionData = {
            user: {
                id: user.id || Date.now().toString(),
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                email: user.email
            },
            loginTime: Date.now(),
            expiresAt: Date.now() + (rememberMe ? AUTH_CONFIG.REMEMBER_DURATION : AUTH_CONFIG.SESSION_DURATION),
            rememberMe: rememberMe
        };

        // Guardar sesión
        localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(sessionData));
        this.currentUser = sessionData.user;

        // Mostrar éxito
        this.showSuccess('¡Bienvenido! Redirigiendo...');

        // Redirigir después de un momento
        setTimeout(() => {
            this.redirectToAdmin();
        }, 1000);
    }

    handleFailedLogin(username) {
        const attempts = this.incrementLoginAttempts(username);
        
        if (attempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
            this.lockUser(username);
            this.showLockoutMessage(username);
        } else {
            const remaining = AUTH_CONFIG.MAX_LOGIN_ATTEMPTS - attempts;
            this.showError(`Credenciales incorrectas. ${remaining} intentos restantes.`);
        }
    }

    incrementLoginAttempts(username) {
        const key = `login_attempts_${username}`;
        const attempts = parseInt(localStorage.getItem(key) || '0') + 1;
        localStorage.setItem(key, attempts.toString());
        return attempts;
    }

    clearLoginAttempts(username) {
        const key = `login_attempts_${username}`;
        localStorage.removeItem(key);
        localStorage.removeItem(`lockout_${username}`);
    }

    lockUser(username) {
        const lockoutKey = `lockout_${username}`;
        const lockoutUntil = Date.now() + AUTH_CONFIG.LOCKOUT_DURATION;
        localStorage.setItem(lockoutKey, lockoutUntil.toString());
        
        // Configurar timer para desbloqueor automáticamente
        setTimeout(() => {
            this.unlockUser(username);
        }, AUTH_CONFIG.LOCKOUT_DURATION);
    }

    unlockUser(username) {
        this.clearLoginAttempts(username);
        this.hideLockoutMessage();
        this.showSuccess('Cuenta desbloqueada. Ya puedes intentar de nuevo.');
    }

    isUserLocked(username) {
        const lockoutKey = `lockout_${username}`;
        const lockoutUntil = parseInt(localStorage.getItem(lockoutKey) || '0');
        return Date.now() < lockoutUntil;
    }

    showLockoutMessage(username) {
        const lockoutMessage = document.getElementById('lockoutMessage');
        const lockoutTimer = document.getElementById('lockoutTimer');
        
        if (lockoutMessage && lockoutTimer) {
            const lockoutKey = `lockout_${username}`;
            const lockoutUntil = parseInt(localStorage.getItem(lockoutKey) || '0');
            const remainingTime = lockoutUntil - Date.now();
            
            lockoutMessage.style.display = 'flex';
            this.hideError();
            
            // Actualizar timer cada segundo
            const timerInterval = setInterval(() => {
                const remaining = lockoutUntil - Date.now();
                
                if (remaining <= 0) {
                    clearInterval(timerInterval);
                    this.unlockUser(username);
                    return;
                }
                
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                lockoutTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        }
    }

    hideLockoutMessage() {
        const lockoutMessage = document.getElementById('lockoutMessage');
        if (lockoutMessage) {
            lockoutMessage.style.display = 'none';
        }
    }

    isAuthenticated() {
        const sessionData = this.getStoredSession();
        
        if (!sessionData) {
            return false;
        }

        // Verificar expiración
        if (Date.now() > sessionData.expiresAt) {
            this.logout();
            return false;
        }

        this.currentUser = sessionData.user;
        return true;
    }

    getStoredSession() {
        try {
            const sessionString = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
            return sessionString ? JSON.parse(sessionString) : null;
        } catch (error) {
            console.error('Error parsing session:', error);
            localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
            return null;
        }
    }

    checkExistingSession() {
        if (this.isAuthenticated()) {
            // Extender sesión si está activa
            this.extendSession();
        }
    }

    checkSessionExpiry() {
        const sessionData = this.getStoredSession();
        
        if (sessionData) {
            const timeUntilExpiry = sessionData.expiresAt - Date.now();
            
            // Advertir 5 minutos antes de expirar
            if (timeUntilExpiry > 0 && timeUntilExpiry <= 5 * 60 * 1000) {
                this.showSessionWarning();
            } else if (timeUntilExpiry <= 0) {
                this.handleSessionExpiry();
            }
        }
    }

    extendSession() {
        const sessionData = this.getStoredSession();
        if (sessionData && !sessionData.rememberMe) {
            sessionData.expiresAt = Date.now() + AUTH_CONFIG.SESSION_DURATION;
            localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(sessionData));
        }
    }

    handleSessionExpiry() {
        this.showError('Tu sesión ha expirado. Serás redirigido al login.');
        setTimeout(() => {
            this.logout();
        }, 2000);
    }

    showSessionWarning() {
        if (document.getElementById('sessionWarning')) return;

        const warning = document.createElement('div');
        warning.id = 'sessionWarning';
        warning.className = 'session-warning';
        warning.innerHTML = `
            <div class="session-warning-content">
                <i class="fas fa-clock"></i>
                <span>Tu sesión expirará pronto</span>
                <button onclick="authManager.extendSession(); this.parentElement.parentElement.remove()">
                    Extender
                </button>
            </div>
        `;
        
        document.body.appendChild(warning);
        
        // Auto-remover después de 30 segundos
        setTimeout(() => {
            if (warning.parentElement) {
                warning.remove();
            }
        }, 30000);
    }

    logout() {
        // Limpiar sesión
        localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
        this.currentUser = null;
        
        // Redirigir a login si no estamos ya ahí
        if (!window.location.pathname.includes('login.html')) {
            this.redirectToLogin();
        }
    }

    updateAdminInterface() {
        if (!this.currentUser) return;

        // Actualizar información del usuario en el panel admin
        const userInfo = document.querySelector('.admin-user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-details">
                    <span class="user-name">${this.currentUser.full_name}</span>
                    <span class="user-role">${this.getRoleDisplayName(this.currentUser.role)}</span>
                </div>
                <button class="logout-btn" onclick="authManager.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;
        }

        // Agregar botón de logout al navbar si no existe
        this.addLogoutButton();
    }

    addLogoutButton() {
        const navActions = document.querySelector('.admin-actions');
        if (navActions && !navActions.querySelector('.logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'btn btn-secondary btn-sm logout-btn';
            logoutBtn.onclick = () => this.logout();
            logoutBtn.innerHTML = `
                <i class="fas fa-sign-out-alt"></i>
                Cerrar Sesión
            `;
            navActions.appendChild(logoutBtn);
        }
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'owner': 'Propietario',
            'admin': 'Administrador', 
            'barber': 'Barbero'
        };
        return roleNames[role] || 'Usuario';
    }

    handleSessionChange() {
        // Manejar cambios de sesión en otras pestañas
        if (!this.isAuthenticated() && window.location.pathname.includes('admin.html')) {
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }

    redirectToAdmin() {
        window.location.href = 'admin.html';
    }

    // Utilidades UI
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        const loginBtn = document.getElementById('loginBtn');
        
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
        
        if (loginBtn) {
            loginBtn.disabled = show;
            if (show) {
                loginBtn.classList.add('loading');
                loginBtn.innerHTML = '<div class="spinner"></div> Verificando...';
            } else {
                loginBtn.classList.remove('loading');
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            }
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.style.display = 'flex';
            this.hideLockoutMessage();
        }
    }

    hideError() {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.hideError();
        this.hideLockoutMessage();
        
        // Usar sistema de toast si está disponible
        if (typeof showToast !== 'undefined') {
            showToast(message, 'success');
        } else {
            // Crear toast simple
            const toast = document.createElement('div');
            toast.className = 'success-toast';
            toast.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 3000);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CSS adicional para elementos de autenticación
const authCSS = `
.session-warning {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 8px;
    padding: 1rem;
    z-index: 9999;
    animation: slideInRight 0.3s ease-out;
}

.session-warning-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #f59e0b;
}

.session-warning button {
    background: var(--accent-color);
    color: var(--bg-primary);
    border: none;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
}

.success-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    z-index: 9999;
    animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.logout-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
`;

// Inyectar CSS
const style = document.createElement('style');
style.textContent = authCSS;
document.head.appendChild(style);

// Inicializar sistema de autenticación
const authManager = new AuthManager();

// Exportar para uso global
window.authManager = authManager;
window.AUTH_CONFIG = AUTH_CONFIG;