// URL base de la API de Django.
// En Amplify se define VITE_API_URL en las variables de entorno del build;
// en desarrollo local se usa el runserver por defecto.
export const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

// Encabezado Authorization con el token de la sesión actual (o vacío si no hay sesión)
export const authHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
