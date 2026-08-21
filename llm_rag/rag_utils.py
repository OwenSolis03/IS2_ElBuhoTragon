import logging
import torch
from math import radians, sin, cos, sqrt, atan2
from typing import Optional, Tuple
from thefuzz import fuzz, process

logger = logging.getLogger(__name__)

# MAPA MENTAL DEL CAMPUS (Con Alias Estudiantiles)
KNOWN_LOCATIONS = {
    # Ciencias Exactas
    "exactas": (29.081527, -110.960999),
    "matematicas": (29.081527, -110.960999),
    "mates": (29.081527, -110.960999),
    "fisica": (29.081527, -110.960999),
    "geologia": (29.081527, -110.960999),
    "quimico": (29.081527, -110.960999),
    "biologicas": (29.081355, -110.968206),

    # Humanidades y Artes
    "artes": (29.081607, -110.958986),
    "bellas artes": (29.081607, -110.958986),
    "musica": (29.081607, -110.958986),
    "teatro": (29.081607, -110.958986),
    "arquitectura": (29.081607, -110.958986),
    "diseño": (29.081607, -110.958986),

    # Letras
    "letras": (29.082632, -110.960454),
    "letritas": (29.082632, -110.960454),
    "linguistica": (29.082632, -110.960454),
    "idiomas": (29.082632, -110.960454),
    "lenguas": (29.082632, -110.960454),

    # Ingeniería
    "ingenieria": (29.081694, -110.962732),
    "civil": (29.081694, -110.962732),
    "minas": (29.081694, -110.962732),
    "industrial": (29.081694, -110.962732),
    "quimica": (29.081694, -110.962732),

    # Ciencias Sociales
    "derecho": (29.084896, -110.963255),
    "economia": (29.084896, -110.963255),
    "enfermeria": (29.084896, -110.963255),
    "administrativas": (29.084896, -110.963255),
    "sociales": (29.085566, -110.965056),
    "sociologia": (29.085566, -110.965056),
    "trabajo social": (29.085566, -110.965056),
    "servicio social": (29.085566, -110.965056),
    "psicologia": (29.085566, -110.965056),
    "comunicacion": (29.085566, -110.965056),
    "historia": (29.085566, -110.965056),
    "educacion": (29.085566, -110.965056),

    # Otros
    "contabilidad": (29.084019, -110.964915),
    "conta": (29.084019, -110.964915),
    "gimnasio": (29.082979, -110.964557),
    "deporte": (29.082979, -110.964557),
    "medicina": (29.081355, -110.968206),
    "salud": (29.081355, -110.968206),
    "vicerrectoria": (29.0822, -110.9615),
    "rectoria": (29.0822, -110.9615),
    "biblioteca": (29.0833, -110.9630),
}


def detect_device() -> Tuple[str, torch.dtype]:
    if torch.cuda.is_available():
        device_name = torch.cuda.get_device_name(0)
        backend = "ROCm" if "AMD" in device_name or "Radeon" in device_name else "CUDA"
        logger.info(f"GPU detectada: {device_name} ({backend})")
        return "cuda:0", torch.float16
    else:
        logger.warning("Usando CPU")
        return "cpu", torch.float32


def calculate_distance(lat1, lon1, lat2, lon2) -> float:
    if not all([lat1, lon1, lat2, lon2]): return 99999
    R = 6371000
    lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    a = sin((lat2-lat1)/2)**2 + cos(lat1) * cos(lat2) * sin((lon2-lon1)/2)**2
    return R * (2 * atan2(sqrt(a), sqrt(1-a)))


def get_coords_from_query(query: str) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    query_lower = query.lower()
    if any(x in query_lower for x in ['caborca', 'navojoa', 'nogales', 'cajeme', 'santa ana']):
        return None, None, None

    # Extracción de tokens y bigramas para el Fuzzy Matching
    words = query_lower.replace('?', '').replace(',', '').replace('.', '').split()
    bigrams = [' '.join(words[i:i+2]) for i in range(len(words)-1)]
    tokens = words + bigrams

    aliases = list(KNOWN_LOCATIONS.keys())
    best_score = 0
    best_match = None

    # Usar thefuzz para coincidencia aproximada (>85% confianza)
    for token in tokens:
        if len(token) < 4: continue # Ignorar palabras muy cortas
        match, score = process.extractOne(token, aliases, scorer=fuzz.ratio)
        if score > best_score:
            best_score = score
            best_match = match

    if best_score > 85:
        logger.info(f"Ubicación detectada por fuzzy match: '{best_match}' (Confianza: {best_score}%)")
        coords = KNOWN_LOCATIONS[best_match]
        return coords[0], coords[1], best_match

    return None, None, None
