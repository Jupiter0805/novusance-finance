// Sectores con los que trabaja Novusance. Cada uno tiene su página en /es/<slug> y /co/<slug>, y sus guías en /guias.
// Para añadir un sector: añádelo aquí y escribe sus textos. Todo lo demás (rutas, sitemap, formulario, panel) se genera solo.
// Sin imports de Astro: lo usan también el endpoint del formulario y el panel.

export interface Sector {
  slug: string;
  /** Nombre en plural, como se muestra en listas y títulos ("Fisioterapeutas y osteópatas"). */
  label: string;
  /** Cómo se llama el negocio, para "la web de tu …" ("clínica", "consulta", "centro"…). */
  noun: string;
  /** Una frase para la sección Sectores de la portada. */
  blurb: string;
  /** Primera frase de la escena del problema: quién busca y qué escribe en Google. */
  search: string;
  /** Introducción del sector en /guias. */
  guidesIntro: string;
  /** Web de ejemplo del antes/después (negocio ficticio). */
  example: {
    oldName: string;
    oldText: string;
    brand: string;
    short: string;
    headline: string;
    text: string;
    services: [string, string, string];
    cta: string;
    url: string;
  };
}

export const SECTORS: Sector[] = [
  {
    slug: 'clinicas-veterinarias',
    label: 'Clínicas veterinarias',
    noun: 'clínica',
    blurb: 'Horarios, urgencias y servicios claros para que los dueños de mascotas te elijan a ti.',
    search: 'Su perro no está bien. Busca «veterinario cerca»',
    guidesIntro: 'Qué buscan los dueños de mascotas antes de elegir clínica y cómo debe responder tu web.',
    example: {
      oldName: 'Clínica Veterinaria Arce',
      oldText:
        'En nuestra clínica ofrecemos servicios de medicina general, vacunación, cirugía y peluquería para su mascota. Contamos con un equipo de profesionales con amplia experiencia.',
      brand: 'Veterinaria Arce',
      short: 'Arce',
      headline: 'Cuidamos de los tuyos como si fueran nuestros.',
      text: 'Medicina general, vacunas y cirugía en el centro de la ciudad.',
      services: ['Consulta general', 'Vacunación', 'Cirugía'],
      cta: 'Pedir cita',
      url: 'www.tuclinica.vet',
    },
  },
  {
    slug: 'fisioterapeutas-y-osteopatas',
    label: 'Fisioterapeutas y osteópatas',
    noun: 'consulta',
    blurb: 'Tratamientos explicados con claridad y la cita a un clic, sin llamadas.',
    search: 'Se ha vuelto a hacer daño en la espalda. Busca «fisioterapeuta cerca»',
    guidesIntro: 'Cómo eligen fisioterapeuta los pacientes y qué tiene que dejar claro tu web.',
    example: {
      oldName: 'Centro de Fisioterapia Alameda',
      oldText:
        'Somos un centro de fisioterapia con experiencia en el tratamiento de lesiones. Ofrecemos fisioterapia, osteopatía y masaje terapéutico. Consulte nuestras tarifas en el centro.',
      brand: 'Fisio Alameda',
      short: 'Alameda',
      headline: 'Vuelve a moverte sin dolor.',
      text: 'Fisioterapia, osteopatía y readaptación deportiva.',
      services: ['Fisioterapia', 'Osteopatía', 'Suelo pélvico'],
      cta: 'Pedir cita',
      url: 'www.tuconsulta.es',
    },
  },
  {
    slug: 'clinicas-dentales',
    label: 'Clínicas dentales',
    noun: 'clínica',
    blurb: 'Una web que transmite confianza a quien tiene miedo al dentista, sin parecer una cadena.',
    search: 'Le duele una muela desde ayer. Busca «dentista cerca»',
    guidesIntro: 'Qué mira un paciente antes de elegir dentista y cómo puede competir una clínica pequeña.',
    example: {
      oldName: 'Clínica Dental Robles',
      oldText:
        'Clínica dental con más de 15 años de experiencia. Realizamos odontología general, ortodoncia, implantes y estética dental. Primera visita gratuita.',
      brand: 'Dental Robles',
      short: 'Robles',
      headline: 'Sonríe sin miedo al dentista.',
      text: 'Revisiones, limpiezas y ortodoncia para toda la familia.',
      services: ['Revisión', 'Limpieza', 'Ortodoncia'],
      cta: 'Pedir cita',
      url: 'www.tuclinicadental.es',
    },
  },
  {
    slug: 'psicologos-y-nutricionistas',
    label: 'Psicólogos y nutricionistas',
    noun: 'consulta',
    blurb: 'Una web tranquila y profesional que facilita dar el primer paso y pedir la primera sesión.',
    search: 'Por fin se ha decidido a pedir ayuda. Busca «psicólogo cerca»',
    guidesIntro: 'Cómo transmitir confianza en tu web y quitar miedos antes de la primera sesión.',
    example: {
      oldName: 'Gabinete de Psicología Lumen',
      oldText:
        'Gabinete de psicología y nutrición. Atendemos a adultos, adolescentes y parejas. Para más información o para concertar una cita, contacte por teléfono.',
      brand: 'Consulta Lumen',
      short: 'Lumen',
      headline: 'Un espacio para hablar con calma.',
      text: 'Psicología y nutrición, en consulta y online.',
      services: ['Terapia individual', 'Pareja', 'Nutrición'],
      cta: 'Primera sesión',
      url: 'www.tuconsulta.es',
    },
  },
  {
    slug: 'peluquerias-caninas',
    label: 'Peluquerías caninas',
    noun: 'peluquería',
    blurb: 'Fotos de antes y después, precios por tamaño y reservas sin llamadas.',
    search: 'A su perro le toca baño y corte. Busca «peluquería canina cerca»',
    guidesIntro: 'Cómo enseñar tu trabajo en la web y llenar la agenda sin pasarte el día al teléfono.',
    example: {
      oldName: 'Peluquería Canina Guau',
      oldText:
        'Peluquería canina profesional. Baño, corte, deslanado y corte de uñas para todas las razas. Productos de primera calidad. Pida cita por teléfono.',
      brand: 'Guau Studio',
      short: 'Guau',
      headline: 'Baño, corte y mimos para tu perro.',
      text: 'Peluquería canina con cita, sin esperas.',
      services: ['Baño', 'Corte', 'Deslanado'],
      cta: 'Reservar',
      url: 'www.tupeluqueriacanina.es',
    },
  },
  {
    slug: 'centros-de-estetica',
    label: 'Centros de estética',
    noun: 'centro',
    blurb: 'Tratamientos y precios a la vista, con una imagen tan cuidada como tu cabina.',
    search: 'Quiere reservar algo para el viernes. Busca «centro de estética cerca»',
    guidesIntro: 'Qué buscan tus clientas antes de reservar y cómo convertir visitas en citas.',
    example: {
      oldName: 'Centro de Estética Brisa',
      oldText:
        'En nuestro centro ofrecemos tratamientos faciales, corporales, depilación y manicura. Utilizamos productos de alta calidad. Consulte nuestros horarios en el centro.',
      brand: 'Estética Brisa',
      short: 'Brisa',
      headline: 'Tu momento para cuidarte.',
      text: 'Tratamientos faciales, corporales y manicura.',
      services: ['Facial', 'Corporal', 'Manicura'],
      cta: 'Reservar',
      url: 'www.tucentrodeestetica.es',
    },
  },
  {
    slug: 'academias-y-autoescuelas',
    label: 'Academias y autoescuelas',
    noun: 'autoescuela o academia',
    blurb: 'Cursos, horarios y precios claros para que los alumnos se matriculen contigo.',
    search: 'Quiere sacarse el carnet antes del verano. Busca «autoescuela cerca»',
    guidesIntro: 'Qué compara un alumno antes de matricularse y qué debe contestar tu web.',
    example: {
      oldName: 'Autoescuela Norte',
      oldText:
        'Autoescuela con más de 20 años de experiencia. Permisos B, A y C. Clases teóricas por la mañana y por la tarde. Infórmese en nuestras oficinas.',
      brand: 'Autoescuela Norte',
      short: 'Norte',
      headline: 'Tu carnet, a tu ritmo.',
      text: 'Teórico online, prácticas y cursos intensivos.',
      services: ['Teórico', 'Prácticas', 'Intensivo'],
      cta: 'Pedir información',
      url: 'www.tuautoescuela.es',
    },
  },
];

export const SECTOR_SLUGS = SECTORS.map((s) => s.slug);

export const sectorBySlug = (slug: string | null | undefined) => SECTORS.find((s) => s.slug === slug);

/** Textos de la portada general (sin sector). */
export const GENERAL = {
  noun: 'negocio',
  search: 'Necesita cita para esta semana. Busca «cerca de mí»',
  example: {
    oldName: 'Centro Arce',
    oldText:
      'Somos un negocio con años de experiencia en el sector. Ofrecemos un servicio profesional y personalizado, adaptado a cada cliente.',
    brand: 'Centro Arce',
    short: 'Arce',
    headline: 'Te atendemos con cita, sin esperas.',
    text: 'Servicios, horarios y precios siempre al día.',
    services: ['Servicios', 'Equipo', 'Opiniones'],
    cta: 'Pedir cita',
    url: 'www.tunegocio.es',
  } satisfies Sector['example'],
};
