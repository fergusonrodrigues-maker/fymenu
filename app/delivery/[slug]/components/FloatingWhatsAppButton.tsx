"use client";

import { MessageCircle } from "lucide-react";

interface FloatingWhatsAppButtonProps {
  restaurantPhone: string;
}

export function FloatingWhatsAppButton({
  restaurantPhone,
}: FloatingWhatsAppButtonProps) {
  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("Olá! Gostaria de fazer um pedido.");
    const whatsappUrl = `https://wa.me/${restaurantPhone.replace(/\D/g, "")}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition transform hover:scale-110 z-50"
      aria-label="Contato WhatsApp"
    >
      <MessageCircle size={28} />
    </button>
  );
}
