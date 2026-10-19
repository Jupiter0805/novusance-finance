// Reglas del formulario de contacto. Las usan el navegador (src/scripts/contact-form.ts)
// y el servidor (functions/api/contact.ts), así los mensajes y límites siempre coinciden.

export const LIMITS = {
  nombre: 100,
  clinica: 120,
  email: 254,
  telefono: 30,
  mensaje: 2000,
} as const;

export type TextField = keyof typeof LIMITS;
export type Field = TextField | 'privacidad';

export interface ContactInput {
  nombre: string;
  clinica: string;
  email: string;
  telefono: string;
  mensaje: string;
  privacidad: boolean;
}

export type FieldErrors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
const PHONE_RE = /^\+?[0-9 ().-]{6,}$/;

export function validateContact(input: ContactInput): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.nombre) errors.nombre = 'Escribe tu nombre.';
  if (!input.clinica) errors.clinica = 'Escribe el nombre de tu negocio.';

  if (!input.email) errors.email = 'Escribe tu email.';
  else if (!EMAIL_RE.test(input.email)) errors.email = 'Revisa el email; debe tener la forma nombre@negocio.es.';

  if (input.telefono && !PHONE_RE.test(input.telefono)) {
    errors.telefono = 'Revisa el teléfono: usa solo números, espacios y el signo +.';
  }

  for (const key of Object.keys(LIMITS) as TextField[]) {
    if (!errors[key] && input[key].length > LIMITS[key]) {
      errors[key] = `Como máximo ${LIMITS[key]} caracteres (ahora hay ${input[key].length}).`;
    }
  }

  if (!input.privacidad) errors.privacidad = 'Para poder responderte necesito que aceptes la política de privacidad.';

  return errors;
}

/** Lee y normaliza los campos de un FormData (navegador o servidor). */
export function readContact(data: FormData): ContactInput {
  const text = (k: string) => {
    const v = data.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const privacidad = data.get('privacidad');
  return {
    nombre: text('nombre'),
    clinica: text('clinica'),
    email: text('email'),
    telefono: text('telefono'),
    mensaje: text('mensaje'),
    privacidad: privacidad === 'on' || privacidad === 'true' || privacidad === '1',
  };
}
