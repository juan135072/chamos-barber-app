import React from 'react';

const WhatsAppButton: React.FC = () => {
    return (
        <a
            href="https://wa.me/56927767904"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-[9999] flex items-center justify-center w-16 h-16 bg-[#25D366] rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 animate-bounce-subtle"
            aria-label="Contactar por WhatsApp"
            id="whatsapp-floating-button"
        >
            <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm"
            >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>

            {/* Tooltip */}
            <span className="absolute right-20 bg-white text-black px-4 py-2 rounded-lg text-sm font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none border border-gray-100">
                ¡Agenda por WhatsApp! 🔥
            </span>

            <style jsx>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite ease-in-out;
        }
        #whatsapp-floating-button:hover span {
          opacity: 1;
        }
      `}</style>
        </a>
    );
};

export default WhatsAppButton;
