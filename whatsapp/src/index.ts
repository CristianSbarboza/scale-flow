/**
 * Ponto de entrada do serviço de lembretes por WhatsApp.
 *
 * Esqueleto: nada implementado ainda. O plano está em
 * specs/05-spec-whatsapp-lembretes/tasks.md.
 *
 * A ordem importa — a Fase 2 (fuso horário e formato de número) vem antes do
 * cron de propósito: é a única parte testável sem rede, e é onde os defeitos
 * desta spec vão nascer.
 *
 * Este arquivo é o **composition root**: quando houver código, é o único lugar
 * que instancia as classes concretas (BaileysSender, ReminderRepository,
 * ServiceClock) e as injeta em quem depende só das interfaces. Se outra classe
 * começar a dar `new` em uma implementação concreta, a testabilidade que
 * motivou a POO aqui já foi embora.
 */
console.log("scaleflow-whatsapp: esqueleto, sem implementação. Ver specs/05.");
