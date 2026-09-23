"""
Pruebas de la lógica determinista del RAG (sin cargar modelos).
Ejecutar desde la raíz del repo:  python -m pytest llm_rag/tests
"""
from datetime import datetime

import pytest

from llm_rag.rag_utils import (
    HERMOSILLO_TZ,
    calculate_distance,
    clean_answer,
    detect_budget,
    get_coords_from_query,
    is_on_campus,
    is_open,
    normalize_text,
    wants_cheap,
    wants_near,
)


def at(hour, minute=0):
    return datetime(2026, 9, 22, hour, minute, tzinfo=HERMOSILLO_TZ)


@pytest.mark.parametrize("text, expected", [
    ("tengo 50 pesos", 50),
    ("algo de $80", 80),
    ("comida por 60 varos", 60),
    ("menos de 45", 45),
    ("que hay en la cafeteria de derecho", None),
    ("cafeteria medicina 1", None),
    ("abren hasta 18:00?", None),
    ("hasta 17 hrs", None),
])
def test_detect_budget(text, expected):
    assert detect_budget(text) == expected


def test_intents():
    assert wants_cheap("¿Qué es lo más barato?")
    assert wants_cheap("algo económico")
    assert not wants_cheap("¿dónde hay molletes?")
    assert wants_near("¿cuál está más cerca?")
    assert wants_near("la cafetería más próxima")
    assert not wants_near("menú de artes")


def test_normalize_text():
    assert normalize_text("Diseño Matemáticas") == "diseno matematicas"


def test_location_alias_with_accents_and_typos():
    lat, lon, name = get_coords_from_query("¿Qué hay cerca de Matemáticas?")
    assert name == "matematicas" and lat is not None
    assert get_coords_from_query("estoy en servicio social")[2] == "servicio social"
    assert get_coords_from_query("comida en navojoa") == (None, None, None)
    assert get_coords_from_query("¿dónde venden molletes?") == (None, None, None)


def test_distance_and_campus():
    assert calculate_distance(None, 1, 2, 3) is None
    assert calculate_distance("29.08", "-110.96", 29.08, -110.96) == pytest.approx(0)
    assert is_on_campus(29.0848, -110.9632)
    assert not is_on_campus(19.4326, -99.1332)  # CDMX
    assert not is_on_campus("abc", None)


def test_is_open():
    assert is_open("7:00:00", "19:00:00", at(8)) is True
    assert is_open("7:00:00", "19:00:00", at(19)) is False
    assert is_open("7:00:00", "19:00:00", at(6, 59)) is False
    assert is_open(None, "19:00:00", at(8)) is None


def test_clean_answer_formats_bullets_without_breaking_hours():
    raw = "assistant\nRespuesta: Los **molletes** están en: • Artes ($30) • Derecho ($30)<|im_end|>"
    assert clean_answer(raw) == "Los molletes están en:\n• Artes ($30)\n• Derecho ($30)"
    assert clean_answer("Abre de 07:00 - 19:00") == "Abre de 07:00 - 19:00"
    assert clean_answer("Opciones:\n- Torta ($50)\n- Taco ($20)") == "Opciones:\n• Torta ($50)\n• Taco ($20)"
