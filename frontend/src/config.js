// URL base de la API de Django.
// - Sin definir (desarrollo local): el runserver por defecto.
// - VITE_API_URL vacía (Amplify): mismo dominio; Amplify reenvía /api/* al backend
//   para que el navegador nunca dependa del dominio del servidor.
// - Con valor: esa URL.
export const API_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

// Funciones experimentales: apagadas en el sitio publicado, encendidas en desarrollo
// (.env.development y .env.api-real). Para una vista previa con la función:
//   VITE_FEATURE_PASAPORTE=true deploy/amplify/deploy-frontend.sh preview
export const PASAPORTE_ACTIVO = import.meta.env.VITE_FEATURE_PASAPORTE === "true";

// Encabezado Authorization con el token de la sesión actual (o vacío si no hay sesión)
export const authHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
