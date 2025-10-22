// === INTEGRACIÓN BASE DE DATOS CON SITIO PÚBLICO ===
// Este archivo complementa main.js con funciones que usan la base de datos

// Sobrescribir funciones principales para usar datos de BD
document.addEventListener('DOMContentLoaded', function() {
    // Reemplazar funciones principales con versiones que usan BD
    if (window.renderTeam) {
        window.renderTeam = renderTeamFromDB;
    }
    
    if (window.renderBarberProfile) {
        window.renderBarberProfile = renderBarberProfileFromDB;
    }
    
    if (window.renderServices) {
        window.renderServices = renderServicesFromDB;
    }
    
    if (window.renderBarbers) {
        window.renderBarbers = renderBarbersFromDB;
    }
    
    if (window.getBarbersName) {
        window.getBarbersName = getBarbersNameFromDB;
    }
    
    // Actualizar datos de contacto desde localStorage si existen
    updateContactInfo();
    
    // Cargar y actualizar redes sociales
    loadSocialNetworks();
});

// === FUNCIONES ACTUALIZADAS ===

async function renderTeamFromDB() {
    const teamGrid = document.querySelector('.team-grid');
    if (!teamGrid) return;

    try {
        const response = await fetch('tables/barberos?sort=orden');
        const data = await response.json();
        
        teamGrid.innerHTML = '';
        
        if (data.data && data.data.length > 0) {
            // Filtrar solo barberos activos
            const activeBarbers = data.data.filter(barber => barber.activo);
            
            activeBarbers.forEach(barber => {
                const barberCard = document.createElement('a');
                barberCard.href = `barbero.html?id=${barber.id}`;
                barberCard.className = 'barber-card';
                barberCard.innerHTML = `
                    <div class="barber-image" style="background-image: url('${barber.foto_perfil}')">
                        <div class="barber-overlay">
                            <div class="barber-name">${barber.nombre}${barber.apodo ? ` "${barber.apodo}"` : ''}</div>
                        </div>
                    </div>
                    <div class="barber-info">
                        <h3 class="barber-name">${barber.nombre}${barber.apodo ? ` "${barber.apodo}"` : ''}</h3>
                        <p class="barber-bio">${barber.bio_corta}</p>
                    </div>
                `;
                teamGrid.appendChild(barberCard);
            });
        } else {
            teamGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">No hay barberos disponibles</div>';
        }
    } catch (error) {
        console.error('Error loading team:', error);
        // Fallback a función original
        if (window.BarberShop && window.BarberShop.barbersData) {
            teamGrid.innerHTML = '';
            window.BarberShop.barbersData.forEach(barber => {
                const barberCard = document.createElement('a');
                barberCard.href = `barbero.html?id=${barber.id}`;
                barberCard.className = 'barber-card';
                barberCard.innerHTML = `
                    <div class="barber-image" style="background-image: url('${barber.image}')">
                        <div class="barber-overlay">
                            <div class="barber-name">${barber.name}</div>
                        </div>
                    </div>
                    <div class="barber-info">
                        <h3 class="barber-name">${barber.name}</h3>
                        <p class="barber-bio">${barber.bio}</p>
                    </div>
                `;
                teamGrid.appendChild(barberCard);
            });
        }
    }
}

async function renderBarberProfileFromDB() {
    const urlParams = new URLSearchParams(window.location.search);
    const barberId = urlParams.get('id');
    
    if (!barberId) {
        showBarberNotFound();
        return;
    }

    try {
        const response = await fetch(`tables/barberos/${barberId}`);
        
        if (!response.ok) {
            showBarberNotFound();
            return;
        }
        
        const barber = await response.json();
        
        if (!barber.activo) {
            showBarberNotFound();
            return;
        }

        // Actualizar título de la página
        const fullName = barber.nombre + (barber.apodo ? ` "${barber.apodo}"` : '');
        document.title = `${fullName} - Chamos Barber`;

        // Renderizar perfil
        const profileContainer = document.querySelector('.barber-profile');
        if (profileContainer) {
            profileContainer.innerHTML = `
                <div class="profile-header">
                    <div class="profile-image" style="background-image: url('${barber.foto_perfil}')"></div>
                    <div class="profile-details">
                        <h1>${fullName}</h1>
                        <div style="margin-bottom: 1rem; color: var(--accent-color); font-weight: 600;">
                            <i class="fas fa-clock"></i> ${barber.años_experiencia} años de experiencia
                        </div>
                        ${barber.especialidades ? `
                            <div style="margin-bottom: 1rem; color: var(--text-primary); opacity: 0.9;">
                                <strong>Especialidades:</strong> ${barber.especialidades}
                            </div>
                        ` : ''}
                        <p class="profile-bio">${barber.bio_completa}</p>
                        <div style="margin-top: 2rem;">
                            <a href="reservar.html?barber=${barber.id}" class="btn btn-primary">
                                <i class="fab fa-whatsapp"></i>
                                Reservar Cita con ${barber.apodo || barber.nombre}
                            </a>
                        </div>
                    </div>
                </div>
                <div class="portfolio-section">
                    <h2>Portafolio de Trabajos</h2>
                    <div id="portfolio-grid-${barber.id}" class="portfolio-grid">
                        <!-- Portfolio se carga dinámicamente -->
                    </div>
                </div>
            `;
            
            // Cargar portfolio
            loadBarberPortfolio(barber.id);
        }
    } catch (error) {
        console.error('Error loading barber profile:', error);
        showBarberNotFound();
    }
}

function showBarberNotFound() {
    document.querySelector('.container').innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Barbero no encontrado</h1>
            <p class="page-subtitle">El barbero solicitado no existe o no está disponible.</p>
            <a href="equipo.html" class="btn btn-primary">Volver al Equipo</a>
        </div>
    `;
}

async function loadBarberPortfolio(barberId) {
    const portfolioGrid = document.getElementById(`portfolio-grid-${barberId}`);
    if (!portfolioGrid) return;
    
    try {
        const response = await fetch(`tables/portfolio?barbero_id=${barberId}&sort=orden`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            portfolioGrid.innerHTML = data.data.map(item => `
                <div class="portfolio-item" style="background-image: url('${item.imagen_url}')" 
                     onclick="openImageModal('${item.imagen_url}')" title="${item.descripcion || ''}"></div>
            `).join('');
        } else {
            // Fallback a imágenes de ejemplo por barbero
            const fallbackImages = {
                '1': [
                    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?ixlib=rb-4.0.3&w=300&h=300&fit=crop"
                ],
                '2': [
                    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1605497788044-5a32c7078486?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?ixlib=rb-4.0.3&w=300&h=300&fit=crop"
                ],
                '3': [
                    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1621274790572-7c32596bc67f?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1633681926035-ec1ac984418a?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1594897469514-e5cf96cdbb8c?ixlib=rb-4.0.3&w=300&h=300&fit=crop"
                ]
            };
            
            const images = fallbackImages[barberId] || fallbackImages['1'];
            portfolioGrid.innerHTML = images.map(image => `
                <div class="portfolio-item" style="background-image: url('${image}')" onclick="openImageModal('${image}')"></div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading portfolio:', error);
        portfolioGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; opacity: 0.7;">Portfolio no disponible</div>';
    }
}

async function renderServicesFromDB() {
    const servicesContainer = document.querySelector('.services-container');
    if (!servicesContainer) return;
    
    try {
        const response = await fetch('tables/servicios?sort=orden');
        const data = await response.json();
        
        let services = [];
        if (data.data && data.data.length > 0) {
            services = data.data.filter(service => service.activo);
        } else {
            // Fallback a servicios mock
            services = window.BarberShop?.servicesData || [];
        }
        
        servicesContainer.innerHTML = `
            <select class="form-select" id="service-select">
                <option value="">Selecciona un servicio</option>
                ${services.map(service => `
                    <option value="${service.nombre || service.name}" data-price="${service.precio || service.price}">
                        ${service.nombre || service.name} - ${service.precio || service.price}
                    </option>
                `).join('')}
            </select>
        `;
        
        document.getElementById('service-select').addEventListener('change', function() {
            if (window.bookingData) {
                window.bookingData.service = this.value;
            }
            if (window.validateStep) {
                window.validateStep(1);
            }
        });
    } catch (error) {
        console.error('Error loading services:', error);
        // Usar servicios mock como fallback
        const services = window.BarberShop?.servicesData || [];
        servicesContainer.innerHTML = `
            <select class="form-select" id="service-select">
                <option value="">Selecciona un servicio</option>
                ${services.map(service => `
                    <option value="${service.name}" data-price="${service.price}">
                        ${service.name} - ${service.price}
                    </option>
                `).join('')}
            </select>
        `;
        
        document.getElementById('service-select').addEventListener('change', function() {
            if (window.bookingData) {
                window.bookingData.service = this.value;
            }
            if (window.validateStep) {
                window.validateStep(1);
            }
        });
    }
}

async function renderBarbersFromDB() {
    const barbersContainer = document.querySelector('.barbers-grid');
    if (!barbersContainer) return;
    
    try {
        const response = await fetch('tables/barberos?sort=orden');
        const data = await response.json();
        
        let barbers = [];
        if (data.data && data.data.length > 0) {
            barbers = data.data.filter(barber => barber.activo);
        } else {
            // Fallback a barberos mock
            barbers = window.BarberShop?.barbersData || [];
        }
        
        barbersContainer.innerHTML = '';
        
        barbers.forEach(barber => {
            const barberDiv = document.createElement('div');
            barberDiv.className = 'barber-option';
            barberDiv.dataset.barberId = barber.id;
            
            if (window.bookingData && window.bookingData.barber == barber.id) {
                barberDiv.classList.add('selected');
            }
            
            const name = barber.nombre || barber.name;
            const bio = barber.bio_corta || barber.bio;
            const image = barber.foto_perfil || barber.image;
            const apodo = barber.apodo ? ` "${barber.apodo}"` : '';
            
            barberDiv.innerHTML = `
                <img src="${image}" alt="${name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem;">
                <h4>${name}${apodo}</h4>
                <p style="font-size: 0.9rem; opacity: 0.8;">${bio.substring(0, 60)}...</p>
            `;
            
            barberDiv.addEventListener('click', function() {
                // Remover selección previa
                barbersContainer.querySelectorAll('.barber-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Seleccionar nuevo barbero
                this.classList.add('selected');
                if (window.bookingData) {
                    window.bookingData.barber = this.dataset.barberId;
                }
                if (window.validateStep) {
                    window.validateStep(2);
                }
            });
            
            barbersContainer.appendChild(barberDiv);
        });
    } catch (error) {
        console.error('Error loading barbers for booking:', error);
        // Usar barberos mock como fallback
        const barbers = window.BarberShop?.barbersData || [];
        barbersContainer.innerHTML = '';
        
        barbers.forEach(barber => {
            const barberDiv = document.createElement('div');
            barberDiv.className = 'barber-option';
            barberDiv.dataset.barberId = barber.id;
            
            if (window.bookingData && window.bookingData.barber == barber.id) {
                barberDiv.classList.add('selected');
            }
            
            barberDiv.innerHTML = `
                <img src="${barber.image}" alt="${barber.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem;">
                <h4>${barber.name}</h4>
                <p style="font-size: 0.9rem; opacity: 0.8;">${barber.bio.substring(0, 60)}...</p>
            `;
            
            barberDiv.addEventListener('click', function() {
                barbersContainer.querySelectorAll('.barber-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
                if (window.bookingData) {
                    window.bookingData.barber = parseInt(this.dataset.barberId);
                }
                if (window.validateStep) {
                    window.validateStep(2);
                }
            });
            
            barbersContainer.appendChild(barberDiv);
        });
    }
}

async function getBarbersNameFromDB(barberId) {
    try {
        const response = await fetch(`tables/barberos/${barberId}`);
        if (response.ok) {
            const barber = await response.json();
            return barber.nombre + (barber.apodo ? ` "${barber.apodo}"` : '');
        }
    } catch (error) {
        console.error('Error getting barber name:', error);
    }
    
    // Fallback a datos mock
    const barber = window.BarberShop?.barbersData?.find(b => b.id == barberId);
    return barber ? barber.name : 'Barbero';
}

// === ACTUALIZAR INFORMACIÓN DE CONTACTO ===
function updateContactInfo() {
    const savedWhatsapp = localStorage.getItem('chamos_whatsapp');
    const savedAddress = localStorage.getItem('chamos_address');
    
    if (savedWhatsapp) {
        // Actualizar todos los números de WhatsApp en la página
        document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
            const currentHref = link.getAttribute('href');
            const newHref = currentHref.replace(/wa\.me\/\d+/, `wa.me/${savedWhatsapp.replace('+', '')}`);
            link.setAttribute('href', newHref);
        });
        
        document.querySelectorAll('a[href*="tel:"]').forEach(link => {
            link.setAttribute('href', `tel:${savedWhatsapp}`);
        });
        
        document.querySelectorAll('[data-whatsapp]').forEach(element => {
            element.textContent = savedWhatsapp;
        });
    }
    
    if (savedAddress) {
        document.querySelectorAll('[data-address]').forEach(element => {
            element.textContent = savedAddress;
        });
    }
}

//=== CARGAR REDES SOCIALES ===
async function loadSocialNetworks() {
    try {
        const response = await fetch('tables/sitio_configuracion?search=redes_sociales&limit=20');
        const data = await response.json();
        const configs = data.data || [];
        
        // Crear objeto con las configuraciones
        const socialConfig = {};
        configs.forEach(config => {
            if (config.categoria === 'redes_sociales' || config.categoria === 'contacto') {
                socialConfig[config.clave] = config.valor;
            }
        });
        
        // Actualizar enlaces de redes sociales
        updateSocialLinks(socialConfig);
        
        // Actualizar información de contacto
        updateContactFromConfig(socialConfig);
        
    } catch (error) {
        console.error('Error cargando configuración de redes sociales:', error);
        // Usar valores por defecto si falla
        loadDefaultSocialLinks();
    }
}

function updateSocialLinks(config) {
    // Actualizar enlaces en el footer y otras secciones
    const socialLinksContainers = document.querySelectorAll('.social-links');
    
    socialLinksContainers.forEach(container => {
        let html = '';
        
        if (config.facebook_url) {
            html += `<a href="${config.facebook_url}" target="_blank" rel="noopener" aria-label="Facebook">
                        <i class="fab fa-facebook"></i>
                     </a>`;
        }
        
        if (config.instagram_url) {
            html += `<a href="${config.instagram_url}" target="_blank" rel="noopener" aria-label="Instagram">
                        <i class="fab fa-instagram"></i>
                     </a>`;
        }
        
        if (config.whatsapp_numero) {
            const whatsappUrl = `https://wa.me/${config.whatsapp_numero.replace('+', '')}`;
            html += `<a href="${whatsappUrl}" target="_blank" rel="noopener" aria-label="WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                     </a>`;
        }
        
        if (config.tiktok_url) {
            html += `<a href="${config.tiktok_url}" target="_blank" rel="noopener" aria-label="TikTok">
                        <i class="fab fa-tiktok"></i>
                     </a>`;
        }
        
        if (config.youtube_url) {
            html += `<a href="${config.youtube_url}" target="_blank" rel="noopener" aria-label="YouTube">
                        <i class="fab fa-youtube"></i>
                     </a>`;
        }
        
        container.innerHTML = html;
    });
}

function updateContactFromConfig(config) {
    // Actualizar números de teléfono
    if (config.whatsapp_numero || config.telefono_principal) {
        const phone = config.telefono_principal || config.whatsapp_numero;
        
        document.querySelectorAll('a[href*="tel:"]').forEach(link => {
            link.setAttribute('href', `tel:${phone}`);
        });
        
        document.querySelectorAll('[data-whatsapp]').forEach(element => {
            element.textContent = phone;
        });
        
        // Actualizar enlaces de WhatsApp
        if (config.whatsapp_numero) {
            document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
                const currentHref = link.getAttribute('href');
                const newNumber = config.whatsapp_numero.replace('+', '');
                const newHref = currentHref.replace(/wa\.me\/\d+/, `wa.me/${newNumber}`);
                link.setAttribute('href', newHref);
            });
        }
    }
    
    // Actualizar direcciones
    if (config.direccion_fisica) {
        document.querySelectorAll('[data-address]').forEach(element => {
            element.textContent = config.direccion_fisica;
        });
    }
    
    // Actualizar emails
    if (config.email_contacto) {
        document.querySelectorAll('a[href*="mailto:"]').forEach(link => {
            link.setAttribute('href', `mailto:${config.email_contacto}`);
        });
        
        document.querySelectorAll('[data-email]').forEach(element => {
            element.textContent = config.email_contacto;
        });
    }
}

function loadDefaultSocialLinks() {
    // Valores por defecto si no hay configuración
    const defaultConfig = {
        facebook_url: 'https://facebook.com/chamosbarber',
        instagram_url: 'https://instagram.com/chamosbarber',
        whatsapp_numero: '+56912345678',
        tiktok_url: 'https://tiktok.com/@chamosbarber',
        direccion_fisica: 'Santiago, Región Metropolitana',
        email_contacto: 'contacto@chamosbarber.com'
    };
    
    updateSocialLinks(defaultConfig);
    updateContactFromConfig(defaultConfig);
}

// Exponer funciones globalmente
window.DBIntegration = {
    renderTeamFromDB,
    renderBarberProfileFromDB,
    renderServicesFromDB,
    renderBarbersFromDB,
    getBarbersNameFromDB,
    updateContactInfo,
    loadSocialNetworks,
    updateSocialLinks,
    updateContactFromConfig
};