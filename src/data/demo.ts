// Datos de la clínica ficticia de demo. Los textos entre corchetes son marcadores intencionados.

export interface ChatMessage {
  from: 'user' | 'bot';
  text: string;
}

export interface Scenario {
  label: string;
  when: string;
  messages: ChatMessage[];
  leadTitle: string;
  lead1: string;
  lead2: string;
}

export const NV_SCEN: Scenario[] = [
  {
    label: 'Vacunas',
    when: 'Martes, 23:47',
    messages: [
      { from: 'user', text: 'Hola, ¿cuándo se pone la vacuna de la rabia a un cachorro?' },
      { from: 'bot', text: 'Hola. A partir de los 3 meses. ¿Qué edad tiene tu cachorro?' },
      { from: 'user', text: 'Tiene 4 meses. Se llama Lola.' },
      { from: 'bot', text: 'Entonces ya le toca. ¿Te viene bien el jueves a las 17:00 o el viernes a las 9:15?' },
      { from: 'user', text: 'El jueves a las 17:00.' },
      { from: 'bot', text: 'Hecho, cita reservada para Lola. Te enviaremos un recordatorio el día antes.' },
    ],
    leadTitle: 'Nueva cita reservada',
    lead1: 'Lola, cachorro de 4 meses',
    lead2: 'Vacuna: jueves, 17:00',
  },
  {
    label: 'Urgencia',
    when: 'Sábado, 02:14',
    messages: [
      { from: 'user', text: 'Mi perro se ha comido unas uvas, ¿es grave?' },
      {
        from: 'bot',
        text: 'Las uvas pueden ser tóxicas para los perros. Llama ahora al [TELÉFONO DE URGENCIAS], te están esperando.',
      },
      { from: 'user', text: 'Vale, llamo ya. Gracias.' },
      { from: 'bot', text: 'He avisado a la veterinaria de guardia con lo que me has contado.' },
    ],
    leadTitle: 'Urgencia avisada',
    lead1: 'Perro, ha comido uvas',
    lead2: 'Aviso enviado a tu móvil',
  },
  {
    label: 'Precios',
    when: 'Domingo, 21:30',
    messages: [
      { from: 'user', text: '¿Cuánto cuesta esterilizar a una gata?' },
      {
        from: 'bot',
        text: 'La esterilización de gata cuesta [PRECIO] e incluye la revisión posterior. ¿Te reservo una consulta previa?',
      },
      { from: 'user', text: 'Sí, ¿puede ser el martes?' },
      { from: 'bot', text: 'El martes tengo a las 10:00 o a las 17:30. ¿Cuál prefieres?' },
      { from: 'user', text: 'A las 17:30.' },
      { from: 'bot', text: 'Reservado. Te enviaremos un recordatorio el día antes.' },
    ],
    leadTitle: 'Nueva cita reservada',
    lead1: 'Gata, consulta previa',
    lead2: 'Martes, 17:30',
  },
];

export const NV_FEED = [
  { t: '23:47', d: 'Vacuna de Lola reservada' },
  { t: '00:30', d: 'Duda sobre esterilización resuelta' },
  { t: '02:14', d: 'Urgencia avisada a tu móvil' },
];

export const NV_ROWS = [
  { n: 'Lola, de Marta P.', d: 'Vacuna, cachorro', t: '23:47' },
  { n: 'Tango, de Iván S.', d: 'Revisión anual', t: '20:31' },
  { n: 'Misi, de Elena R.', d: 'Urgencia, avisada', t: '02:14' },
];
