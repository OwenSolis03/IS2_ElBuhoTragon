// Convierte una cafetería de la API al formato de punto que usa BuhoMap
export function puntoDeTiendita(t) {
  const lat = parseFloat(t.latitud);
  const lon = parseFloat(t.longitud);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return {
    id: t.id_tiendita,
    lat,
    lon,
    nombre: t.nombre,
    horario: t.hora_apertura && t.hora_cierre ? `${t.hora_apertura.slice(0, 5)} – ${t.hora_cierre.slice(0, 5)}` : null,
  };
}
