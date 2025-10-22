// === DATOS MOCK ===
const barbersData = [
    {
        id: 1,
        name: "José 'El Chamo' Ramírez",
        bio: "Fundador y maestro barbero venezolano con más de 18 años de experiencia. Especialista en cortes clásicos y fades perfectos.",
        fullBio: "José, conocido como 'El Chamo', es el corazón y alma de Chamos Barber. Llegó a Chile desde Venezuela hace más de 10 años, trayendo consigo la tradición barbera caribeña y técnicas refinadas a lo largo de 18 años de experiencia. Se especializa en cortes clásicos, fades impecables y el arte del afeitado tradicional con navaja. Su carisma venezolano y habilidad excepcional lo han convertido en el barbero de confianza de una clientela fiel que valora tanto su técnica como su trato cercano y profesional.",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=300&h=400&fit=crop",
        portfolio: [
            "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?ixlib=rb-4.0.3&w=300&h=300&fit=crop"
        ]
    },
    {
        id: 2,
        name: "Carlos 'Carlitos' Mendoza",
        bio: "Experto en estilos urbanos y tendencias actuales. Especialista en degradados y diseños creativos con máquina.",
        fullBio: "Carlos, apodado 'Carlitos' por su juventud y energía, es el especialista en tendencias modernas de Chamos Barber. Con 8 años de experiencia y formación continua en las últimas técnicas internacionales, domina a la perfección los degradados (fades), cortes urbanos y diseños creativos con máquina. Su pasión por estar siempre actualizado y su habilidad para interpretar las personalidades de sus clientes jóvenes lo convierte en el barbero preferido de estudiantes universitarios y profesionales que buscan un look fresco y a la moda.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=300&h=400&fit=crop",
        portfolio: [
            "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1605497788044-5a32c7078486?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?ixlib=rb-4.0.3&w=300&h=300&fit=crop"
        ]
    },
    {
        id: 3,
        name: "Miguel 'Don Miguel' Herrera",
        bio: "Veterano chileno con 25 años de experiencia. Maestro en barbería clásica, afeitado y cuidados faciales tradicionales.",
        fullBio: "Miguel, respetado como 'Don Miguel' por su experiencia y sabiduría, representa la escuela chilena tradicional en Chamos Barber. Con 25 años de trayectoria en Santiago, es un maestro de la barbería clásica, el afeitado con navaja y los tratamientos faciales tradicionales. Su técnica depurada, paciencia infinita y conocimiento profundo del oficio lo han convertido en mentor de las nuevas generaciones. Los clientes más maduros y ejecutivos buscan su experiencia para un servicio de lujo y la tranquilidad que solo da la experiencia de décadas.",
        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&w=300&h=400&fit=crop",
        portfolio: [
            "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1621274790572-7c32596bc67f?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1633681926035-ec1ac984418a?ixlib=rb-4.0.3&w=300&h=300&fit=crop",
            "https://images.unsplash.com/photo-1594897469514-e5cf96cdbb8c?ixlib=rb-4.0.3&w=300&h=300&fit=crop"
        ]
    }
];

const servicesData = [
    { id: 1, name: "Corte Clásico", price: "$12.000" },
    { id: 2, name: "Corte + Barba", price: "$18.000" },
    { id: 3, name: "Fade (Degradado)", price: "$15.000" },
    { id: 4, name: "Afeitado Tradicional", price: "$10.000" },
    { id: 5, name: "Tratamiento Facial", price: "$14.000" },
    { id: 6, name: "Paquete Completo", price: "$25.000" }
];

// Datos mock para citas (simulando base de datos)
let appointmentsData = [
    {
        id: 1,
        phone: "+56912345678", 
        service: "Corte + Barba",
        barber: "José 'El Chamo' Ramírez",
        date: "2024-10-20",
        time: "10:00",
        status: "confirmed"
    },
    {
        id: 2,
        phone: "+56912345678", 
        service: "Corte Clásico",
        barber: "Carlos 'Carlitos' Mendoza", 
        date: "2024-10-10",
        time: "15:30",
        status: "completed"
    },
    {
        id: 3,
        phone: "+56987654321",
        service: "Afeitado Premium",
        barber: "Miguel 'Don Miguel' Herrera",
        date: "2024-10-25",
        time: "12:00",
        status: "confirmed"
    }
];

// === UTILIDADES ===
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function formatTime(timeString) {
    return timeString;
}

function generateTimeSlots() {
    const slots = [];
    for (let hour = 9; hour <= 19; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push(timeString);
        }
    }
    return slots;
}

function isSlotAvailable(date, time, barberId) {
    // Simulamos disponibilidad - en producción vendría del backend
    const unavailableSlots = ['12:00', '12:30', '17:00', '17:30'];
    return !unavailableSlots.includes(time);
}

// === NAVEGACIÓN MÓVIL ===
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        // Cerrar menú al hacer click en un enlace
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });

        // Cerrar menú al hacer click fuera
        document.addEventListener('click', function(e) {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            }
        });
    }

    // Activar enlace de navegación actual
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
});

// === FUNCIONES PARA EQUIPO ===
function renderTeam() {
    const teamGrid = document.querySelector('.team-grid');
    if (!teamGrid) return;

    teamGrid.innerHTML = '';
    
    barbersData.forEach(barber => {
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

// === FUNCIONES PARA PERFIL DE BARBERO ===
function renderBarberProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const barberId = parseInt(urlParams.get('id'));
    const barber = barbersData.find(b => b.id === barberId);

    if (!barber) {
        document.querySelector('.container').innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Barbero no encontrado</h1>
                <p class="page-subtitle">El barbero solicitado no existe.</p>
                <a href="equipo.html" class="btn btn-primary">Volver al Equipo</a>
            </div>
        `;
        return;
    }

    // Actualizar título de la página
    document.title = `${barber.name} - Chamos Barber`;

    // Renderizar perfil
    const profileContainer = document.querySelector('.barber-profile');
    if (profileContainer) {
        profileContainer.innerHTML = `
            <div class="profile-header">
                <div class="profile-image" style="background-image: url('${barber.image}')"></div>
                <div class="profile-details">
                    <h1>${barber.name}</h1>
                    <p class="profile-bio">${barber.fullBio}</p>
                    <div style="margin-top: 2rem;">
                        <a href="reservar.html?barber=${barber.id}" class="btn btn-primary">
                            <i class="fab fa-whatsapp"></i>
                            Reservar Cita
                        </a>
                    </div>
                </div>
            </div>
            <div class="portfolio-section">
                <h2>Portafolio de Trabajos</h2>
                <div class="portfolio-grid">
                    ${barber.portfolio.map(image => `
                        <div class="portfolio-item" style="background-image: url('${image}')" onclick="openImageModal('${image}')"></div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

function openImageModal(imageSrc) {
    // Función para abrir imagen en modal (implementación básica)
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.9);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// === FUNCIONES PARA RESERVA DE CITAS ===
let currentStep = 1;
const totalSteps = 4;
let bookingData = {
    service: '',
    barber: null,
    date: '',
    time: '',
    name: '',
    phone: ''
};

function initBookingForm() {
    updateProgressBar();
    renderServices();
    
    // Si viene con barbero preseleccionado
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedBarber = urlParams.get('barber');
    if (preselectedBarber) {
        bookingData.barber = parseInt(preselectedBarber);
    }
}

function updateProgressBar() {
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        const progress = (currentStep / totalSteps) * 100;
        progressFill.style.width = `${progress}%`;
    }
}

function showStep(step) {
    // Ocultar todos los pasos
    document.querySelectorAll('.form-step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    
    // Mostrar el paso actual
    const currentStepEl = document.querySelector(`[data-step="${step}"]`);
    if (currentStepEl) {
        currentStepEl.classList.add('active');
    }
    
    currentStep = step;
    updateProgressBar();
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.btn-next');
    
    if (prevBtn) {
        prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
    }
    
    if (nextBtn) {
        if (currentStep === totalSteps) {
            nextBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Agendar por WhatsApp';
            nextBtn.className = 'btn btn-primary btn-book';
        } else {
            nextBtn.innerHTML = 'Siguiente <i class="fas fa-arrow-right"></i>';
            nextBtn.className = 'btn btn-primary btn-next';
        }
    }
}

function renderServices() {
    const servicesContainer = document.querySelector('.services-container');
    if (!servicesContainer) return;
    
    servicesContainer.innerHTML = `
        <select class="form-select" id="service-select">
            <option value="">Selecciona un servicio</option>
            ${servicesData.map(service => `
                <option value="${service.name}" data-price="${service.price}">
                    ${service.name} - ${service.price}
                </option>
            `).join('')}
        </select>
    `;
    
    document.getElementById('service-select').addEventListener('change', function() {
        bookingData.service = this.value;
        validateStep(1);
    });
}

function renderBarbers() {
    const barbersContainer = document.querySelector('.barbers-grid');
    if (!barbersContainer) return;
    
    barbersContainer.innerHTML = '';
    
    barbersData.forEach(barber => {
        const barberDiv = document.createElement('div');
        barberDiv.className = 'barber-option';
        barberDiv.dataset.barberId = barber.id;
        
        if (bookingData.barber === barber.id) {
            barberDiv.classList.add('selected');
        }
        
        barberDiv.innerHTML = `
            <img src="${barber.image}" alt="${barber.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem;">
            <h4>${barber.name}</h4>
            <p style="font-size: 0.9rem; opacity: 0.8;">${barber.bio.substring(0, 60)}...</p>
        `;
        
        barberDiv.addEventListener('click', function() {
            // Remover selección previa
            barbersContainer.querySelectorAll('.barber-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Seleccionar nuevo barbero
            this.classList.add('selected');
            bookingData.barber = parseInt(this.dataset.barberId);
            validateStep(2);
        });
        
        barbersContainer.appendChild(barberDiv);
    });
}

function renderDateTimePicker() {
    const calendarContainer = document.querySelector('.calendar-container');
    if (!calendarContainer) return;
    
    // Renderizar selector de fecha (implementación básica)
    const datePickerHTML = `
        <div class="date-picker">
            <h4 style="margin-bottom: 1rem; color: var(--accent-color);">Selecciona una fecha</h4>
            <input type="date" class="form-input" id="date-input" min="${new Date().toISOString().split('T')[0]}">
        </div>
        <div>
            <h4 style="margin-bottom: 1rem; color: var(--accent-color);">Selecciona una hora</h4>
            <div class="time-slots" id="time-slots"></div>
        </div>
    `;
    
    calendarContainer.innerHTML = datePickerHTML;
    
    const dateInput = document.getElementById('date-input');
    dateInput.addEventListener('change', function() {
        bookingData.date = this.value;
        renderTimeSlots();
    });
}

function renderTimeSlots() {
    const timeSlotsContainer = document.getElementById('time-slots');
    if (!timeSlotsContainer || !bookingData.date) return;
    
    const timeSlots = generateTimeSlots();
    timeSlotsContainer.innerHTML = '';
    
    timeSlots.forEach(time => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'time-slot';
        slotDiv.textContent = time;
        
        if (!isSlotAvailable(bookingData.date, time, bookingData.barber)) {
            slotDiv.classList.add('unavailable');
        } else {
            slotDiv.addEventListener('click', function() {
                timeSlotsContainer.querySelectorAll('.time-slot').forEach(slot => {
                    slot.classList.remove('selected');
                });
                this.classList.add('selected');
                bookingData.time = time;
                validateStep(3);
            });
        }
        
        timeSlotsContainer.appendChild(slotDiv);
    });
}

function renderContactForm() {
    const contactContainer = document.querySelector('.contact-container');
    if (!contactContainer) return;
    
    contactContainer.innerHTML = `
        <div class="form-group">
            <label class="form-label" for="client-name">Nombre completo</label>
            <input type="text" class="form-input" id="client-name" placeholder="Tu nombre completo" required>
        </div>
        <div class="form-group">
            <label class="form-label" for="client-phone">Número de WhatsApp</label>
            <input type="tel" class="form-input" id="client-phone" placeholder="+34 123 456 789" required>
        </div>
        
        <div style="background-color: var(--bg-primary); padding: 1.5rem; border-radius: var(--border-radius); margin-top: 2rem;">
            <h4 style="color: var(--accent-color); margin-bottom: 1rem;">Resumen de tu cita</h4>
            <div class="appointment-summary">
                <p><strong>Servicio:</strong> <span id="summary-service">${bookingData.service}</span></p>
                <p><strong>Barbero:</strong> <span id="summary-barber">${getBarbersName(bookingData.barber)}</span></p>
                <p><strong>Fecha:</strong> <span id="summary-date">${formatDate(bookingData.date)}</span></p>
                <p><strong>Hora:</strong> <span id="summary-time">${bookingData.time}</span></p>
            </div>
        </div>
    `;
    
    // Agregar eventos de validación
    document.getElementById('client-name').addEventListener('input', function() {
        bookingData.name = this.value;
        validateStep(4);
    });
    
    document.getElementById('client-phone').addEventListener('input', function() {
        bookingData.phone = this.value;
        validateStep(4);
    });
}

function getBarbersName(barberId) {
    const barber = barbersData.find(b => b.id === barberId);
    return barber ? barber.name : '';
}

function validateStep(step) {
    const nextBtn = document.querySelector('.btn-next, .btn-book');
    if (!nextBtn) return;
    
    let isValid = false;
    
    switch(step) {
        case 1:
            isValid = bookingData.service !== '';
            break;
        case 2:
            isValid = bookingData.barber !== null;
            break;
        case 3:
            isValid = bookingData.date !== '' && bookingData.time !== '';
            break;
        case 4:
            isValid = bookingData.name !== '' && bookingData.phone !== '';
            break;
    }
    
    nextBtn.disabled = !isValid;
    nextBtn.style.opacity = isValid ? '1' : '0.5';
    nextBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
}

function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        
        // Cargar contenido del siguiente paso
        if (currentStep === 2) {
            renderBarbers();
        } else if (currentStep === 3) {
            renderDateTimePicker();
        } else if (currentStep === 4) {
            renderContactForm();
        }
        
        showStep(currentStep);
    } else {
        // Último paso: crear mensaje de WhatsApp
        bookAppointment();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function bookAppointment() {
    const message = `¡Hola! Quiero agendar una cita con los siguientes detalles:

📅 *Fecha:* ${formatDate(bookingData.date)}
🕐 *Hora:* ${bookingData.time}
✂️ *Servicio:* ${bookingData.service}
👨‍💼 *Barbero:* ${getBarbersName(bookingData.barber)}
👤 *Nombre:* ${bookingData.name}
📱 *Teléfono:* ${bookingData.phone}

¿Podrían confirmar la disponibilidad? ¡Gracias!`;

    const whatsappURL = `https://wa.me/56912345678?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
}

// === FUNCIONES PARA CONSULTA DE CITAS ===
function searchAppointments() {
    const phoneInput = document.getElementById('search-phone');
    const resultsContainer = document.getElementById('appointments-results');
    
    if (!phoneInput || !resultsContainer) return;
    
    const phone = phoneInput.value.trim();
    if (!phone) {
        alert('Por favor, ingresa tu número de teléfono');
        return;
    }
    
    // Mostrar loading
    resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div> Buscando citas...</div>';
    
    // Simular búsqueda
    setTimeout(() => {
        const userAppointments = appointmentsData.filter(app => app.phone === phone);
        renderAppointmentsResults(userAppointments);
    }, 1000);
}

function renderAppointmentsResults(appointments) {
    const resultsContainer = document.getElementById('appointments-results');
    if (!resultsContainer) return;
    
    if (appointments.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <h3>No se encontraron citas</h3>
                <p>No tienes citas registradas con este número de teléfono.</p>
                <a href="reservar.html" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fab fa-whatsapp"></i>
                    Agendar Nueva Cita
                </a>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    const upcomingAppointments = appointments.filter(app => new Date(app.date) >= today);
    const pastAppointments = appointments.filter(app => new Date(app.date) < today);
    
    let html = '';
    
    if (upcomingAppointments.length > 0) {
        html += `
            <div class="appointments-section">
                <h3><i class="fas fa-calendar-check"></i> Próximas Citas</h3>
                ${upcomingAppointments.map(renderAppointmentCard).join('')}
            </div>
        `;
    }
    
    if (pastAppointments.length > 0) {
        html += `
            <div class="appointments-section">
                <h3><i class="fas fa-history"></i> Historial</h3>
                ${pastAppointments.map(renderAppointmentCard).join('')}
            </div>
        `;
    }
    
    resultsContainer.innerHTML = html;
}

function renderAppointmentCard(appointment) {
    const statusIcon = appointment.status === 'confirmed' ? 'fas fa-check-circle' : 'fas fa-history';
    const statusColor = appointment.status === 'confirmed' ? 'var(--accent-color)' : 'var(--text-primary)';
    
    return `
        <div class="appointment-card">
            <div class="appointment-date">
                <i class="${statusIcon}" style="color: ${statusColor}"></i>
                ${formatDate(appointment.date)} - ${appointment.time}
            </div>
            <div class="appointment-details">
                <div>
                    <strong>Servicio:</strong><br>
                    ${appointment.service}
                </div>
                <div>
                    <strong>Barbero:</strong><br>
                    ${appointment.barber}
                </div>
                <div>
                    <strong>Estado:</strong><br>
                    <span style="color: ${statusColor};">
                        ${appointment.status === 'confirmed' ? 'Confirmada' : 'Completada'}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// === EVENT LISTENERS GLOBALES ===
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch(currentPage) {
        case 'equipo.html':
            renderTeam();
            break;
        case 'barbero.html':
            renderBarberProfile();
            break;
        case 'reservar.html':
            initBookingForm();
            break;
    }
    
    // Event listeners para formulario de reserva
    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.btn-next');
    const searchBtn = document.getElementById('search-appointments');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', prevStep);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', nextStep);
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchAppointments);
    }
    
    // Enter key para búsqueda de citas
    const searchPhone = document.getElementById('search-phone');
    if (searchPhone) {
        searchPhone.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchAppointments();
            }
        });
    }
});

// === EXPORTAR FUNCIONES PARA USO GLOBAL ===
window.BarberShop = {
    barbersData,
    servicesData,
    appointmentsData,
    renderTeam,
    renderBarberProfile,
    initBookingForm,
    searchAppointments,
    openImageModal
};