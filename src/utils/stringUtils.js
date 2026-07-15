/**
 * stringUtils.js
 * Utilidades para procesamiento de texto, capitalización inteligente y búsquedas sin acentos.
 */

// Diccionario de los nombres y apellidos hispanos más comunes que llevan tilde.
const ACCENT_DICT = {
  // Nombres comunes
  "jose": "José",
  "maria": "María",
  "jesus": "Jesús",
  "hector": "Héctor",
  "victor": "Víctor",
  "ramon": "Ramón",
  "raul": "Raúl",
  "angel": "Ángel",
  "joaquin": "Joaquín",
  "andres": "Andrés",
  "tomas": "Tomás",
  "martin": "Martín",
  "nicolas": "Nicolás",
  "sebastian": "Sebastián",
  "julian": "Julián",
  "ruben": "Rubén",
  "cesar": "César",
  "oscar": "Óscar",
  "ivan": "Iván",
  "simon": "Simón",
  "matias": "Matías",
  "lucia": "Lucía",
  "sofia": "Sofía",
  "belen": "Belén",
  "ines": "Inés",
  "noemi": "Noemí",
  "arantxa": "Arantxa",
  
  // Apellidos comunes
  "perez": "Pérez",
  "gomez": "Gómez",
  "rodriguez": "Rodríguez",
  "garcia": "García",
  "fernandez": "Fernández",
  "gonzalez": "González",
  "lopez": "López",
  "martinez": "Martínez",
  "sanchez": "Sánchez",
  "ramirez": "Ramírez",
  "ruiz": "Ruiz", // Sin tilde, pero por si acaso
  "diaz": "Díaz",
  "alvarez": "Álvarez",
  "romero": "Romero",
  "suarez": "Suárez",
  "gutierrez": "Gutiérrez",
  "marquez": "Márquez",
  "navarro": "Navarro",
  "dominguez": "Domínguez",
  "vazquez": "Vázquez",
  "ramos": "Ramos",
  "gil": "Gil",
  "ortiz": "Ortiz",
  "gimenez": "Giménez",
  "cruz": "Cruz",
  "cortes": "Cortés",
  "nunez": "Núñez",
  "mendez": "Méndez",
  "chavez": "Chávez",
  "rios": "Ríos"
};

/**
 * Normaliza un string para búsqueda: lo pasa a minúsculas y le quita todos los acentos.
 * @param {string} str Texto original
 * @returns {string} Texto normalizado
 */
export const normalizeForSearch = (str) => {
  if (!str) return "";
  return str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * Formatea un nombre completo:
 * 1. Pone en mayúscula la primera letra de cada palabra.
 * 2. Si la palabra está en nuestro diccionario de acentos comunes, le añade el acento.
 * @param {string} fullName Nombre completo introducido por el usuario
 * @returns {string} Nombre formateado perfectamente
 */
export const formatName = (fullName) => {
  if (!fullName) return "";
  
  // Dividir por palabras y espacios capturándolos para conservar la estructura del texto mientras se escribe
  const parts = fullName.split(/(\s+)/);
  
  const formattedParts = parts.map(part => {
    // Si la parte es solo espacio(s), mantenerla igual
    if (/^\s+$/.test(part)) {
      return part;
    }
    if (!part) return "";
    
    const lowerWord = part.toLowerCase();
    const cleanWord = normalizeForSearch(lowerWord); // quitamos tilde por si la pusieron mal
    let word = lowerWord;
    if (ACCENT_DICT[cleanWord]) {
      word = ACCENT_DICT[cleanWord];
    }
    
    // Capitalizar la primera letra
    if (word.length > 0) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  });
  
  return formattedParts.join('');
};

/**
 * Devuelve el nombre corto de una especialista (primer nombre + primer apellido)
 * para mostrar en la Agenda y demás listados, en vez del nombre completo.
 * Usa `display_name` si está definido; si no, arma un nombre corto a partir de `name`.
 * @param {{ display_name?: string, name?: string }|string} staffOrName Objeto de staff, o directamente el nombre completo
 * @returns {string}
 */
export const getStaffDisplayName = (staffOrName) => {
  if (!staffOrName) return '';
  if (typeof staffOrName === 'string') {
    return shortenName(staffOrName);
  }
  if (staffOrName.display_name && staffOrName.display_name.trim() !== '') {
    return staffOrName.display_name.trim();
  }
  return shortenName(staffOrName.name);
};

const shortenName = (fullName) => {
  if (!fullName) return '';
  const words = fullName.trim().split(/\s+/);
  if (words.length <= 2) return fullName.trim();
  return `${words[0]} ${words[words.length - 1]}`;
};

export default {
  normalizeForSearch,
  formatName,
  getStaffDisplayName
};
