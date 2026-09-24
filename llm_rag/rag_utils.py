"""
Utilidades puras del RAG (sin modelos): normalización de texto, geolocalización,
detección de intención/presupuesto, horarios y limpieza de la respuesta del LLM.

No importa torch a nivel de módulo para que estas funciones se puedan probar
sin tener instaladas las dependencias pesadas.
"""
import logging
import math
import re
import unicodedata
from datetime import datetime, time, timedelta, timezone
from typing import Optional, Tuple

from thefuzz import fuzz, process

logger = logging.getLogger(__name__)

# Sonora no usa horario de verano: UTC-7 fijo (evita depender de tzdata en Windows).
HERMOSILLO_TZ = timezone(timedelta(hours=-7), "America/Hermosillo")

# Centro aproximado del campus Hermosillo. Un GPS más lejos que CAMPUS_RADIUS_M
# se ignora: el usuario está fuera del campus y las distancias no le sirven.
CAMPUS_CENTER = (29.0830, -110.9630)
CAMPUS_RADIUS_M = 2000

# MAPA MENTAL DEL CAMPUS (Con Alias Estudiantiles). Claves sin acentos.
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
    "diseno": (29.081607, -110.958986),

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
    "comedor universitario": (29.083678, -110.962482),
    "gimnasio": (29.082979, -110.964557),
    "deporte": (29.082979, -110.964557),
    "medicina": (29.081355, -110.968206),
    "salud": (29.081355, -110.968206),
    "vicerrectoria": (29.0822, -110.9615),
    "rectoria": (29.0822, -110.9615),
    "biblioteca": (29.0833, -110.9630),
}

OTHER_CAMPUSES = ("caborca", "navojoa", "nogales", "cajeme", "santa ana")

_CHEAP_RE = re.compile(r"\b(barat\w*|economic\w*|menos cuest\w*|menor precio|accesible\w*|no tan car\w*)")
_NEAR_RE = re.compile(r"\b(cerca\w*|cercan\w*|proxim\w*|a lado|al lado|junto a)\b")
_BUDGET_RES = (
    re.compile(r"\$\s*(\d{2,4})"),
    re.compile(r"\b(\d{2,4})\s*(?:pesos|pesitos|varos|mxn|\$)"),
    # El lookahead evita leer horas como dinero ("abren hasta 18:00", "hasta 17 hrs")
    re.compile(r"\b(?:tengo|traigo|presupuesto(?: de)?|menos de|maximo|hasta|no mas de|con)\s*\$?\s*(\d{2,4})\b"
               r"(?!\s*(?::|h\b|hr|hora|am\b|pm\b|min))"),
)


def normalize_text(text: str) -> str:
    """Minúsculas y sin acentos/diacríticos ("Diseño" -> "diseno")."""
    decomposed = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


def detect_device():
    import torch  # import perezoso: solo se necesita al cargar modelos

    if torch.cuda.is_available():
        device_name = torch.cuda.get_device_name(0)
        backend = "ROCm" if "AMD" in device_name or "Radeon" in device_name else "CUDA"
        logger.info(f"GPU detectada: {device_name} ({backend})")
        return "cuda:0", torch.bfloat16
    logger.warning("Usando CPU")
    return "cpu", torch.float32


def to_float(value) -> Optional[float]:
    """Convierte coordenadas (str/float/None) a float finito, o None."""
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def calculate_distance(lat1, lon1, lat2, lon2) -> Optional[float]:
    """Distancia Haversine en metros, o None si falta alguna coordenada."""
    coords = [to_float(v) for v in (lat1, lon1, lat2, lon2)]
    if any(c is None for c in coords):
        return None
    R = 6371000
    lat1, lon1, lat2, lon2 = map(math.radians, coords)
    a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def is_on_campus(lat, lon) -> bool:
    dist = calculate_distance(lat, lon, *CAMPUS_CENTER)
    return dist is not None and dist <= CAMPUS_RADIUS_M


def get_coords_from_query(query: str) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    query_norm = normalize_text(query)
    if any(x in query_norm for x in OTHER_CAMPUSES):
        return None, None, None

    # Extracción de tokens y bigramas para el Fuzzy Matching
    words = re.sub(r"[^\w\s]", " ", query_norm).split()
    bigrams = [' '.join(words[i:i + 2]) for i in range(len(words) - 1)]
    tokens = words + bigrams

    aliases = list(KNOWN_LOCATIONS.keys())
    best_score = 0
    best_match = None

    # Usar thefuzz para coincidencia aproximada (>85% confianza)
    for token in tokens:
        if len(token) < 4:
            continue  # Ignorar palabras muy cortas
        match, score = process.extractOne(token, aliases, scorer=fuzz.ratio)
        if score > best_score:
            best_score = score
            best_match = match

    if best_score > 85:
        logger.info(f"Ubicación detectada por fuzzy match: '{best_match}' (Confianza: {best_score}%)")
        coords = KNOWN_LOCATIONS[best_match]
        return coords[0], coords[1], best_match

    return None, None, None


def detect_budget(text: str) -> Optional[float]:
    """Detecta un presupuesto: "$50", "50 pesos", "tengo 80", "menos de 60"..."""
    norm = normalize_text(text)
    for pattern in _BUDGET_RES:
        match = pattern.search(norm)
        if match:
            value = float(match.group(1))
            if value >= 10:  # evita confundir "medicina 1" o "5 minutos" con dinero
                return value
    return None


def wants_cheap(text: str) -> bool:
    return bool(_CHEAP_RE.search(normalize_text(text)))


def wants_near(text: str) -> bool:
    return bool(_NEAR_RE.search(normalize_text(text)))


def parse_hour(value) -> Optional[time]:
    """"7:00:00" / "07:00" -> time(7, 0). None si no se puede interpretar."""
    match = re.match(r"^\s*(\d{1,2}):(\d{2})", str(value or ""))
    if not match:
        return None
    hour, minute = int(match.group(1)), int(match.group(2))
    if hour > 23 or minute > 59:
        return None
    return time(hour, minute)


def now_hermosillo() -> datetime:
    return datetime.now(HERMOSILLO_TZ)


def is_open(apertura, cierre, now: datetime) -> Optional[bool]:
    """True/False si la tienda está abierta a la hora `now`; None si no hay horario."""
    start, end = parse_hour(apertura), parse_hour(cierre)
    if start is None or end is None:
        return None
    current = now.time().replace(tzinfo=None)
    if start <= end:
        return start <= current < end
    return current >= start or current < end  # horario que cruza medianoche


def strip_special_tokens(text: str) -> str:
    """Quita tokens de chat (<|im_end|>...) y una etiqueta de rol al inicio."""
    text = re.sub(r"<\|[^|>]*\|>", "", text or "")
    text = re.sub(r"^\s*(assistant|system|user)\s*[:\n]", "", text, flags=re.IGNORECASE)
    return text.strip()


def clean_answer(text: str) -> str:
    """Normaliza el formato de la respuesta para el ChatWidget (texto plano con bullets)."""
    answer = strip_special_tokens(text)
    answer = answer.replace("**", "").replace("__", "")
    answer = re.sub(r"^\s*Respuesta\s*:\s*", "", answer, flags=re.IGNORECASE)
    # Listas con guion/asterisco al inicio de línea -> bullet
    answer = re.sub(r"(?m)^[ \t]*[-*][ \t]+", "• ", answer)
    # Cada bullet en su propia línea (incluye "están en: • A • B")
    answer = re.sub(r"[ \t]*•[ \t]*", "\n• ", answer)
    # Sin líneas vacías ni espacios colgando
    lines = [line.rstrip() for line in answer.split("\n")]
    return "\n".join(line for line in lines if line.strip()).strip()
