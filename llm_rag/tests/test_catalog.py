from datetime import datetime

from llm_rag.catalog import MENU_CHUNK_SIZE, Catalog, RenderContext, query_terms
from llm_rag.rag_utils import HERMOSILLO_TZ

DATA = {
    "tienditas": [
        {"id_tiendita": 1, "nombre": "Cafeteria Derecho", "direccion": "Edificio 10I",
         "facultad_nombre": "Ciencias Sociales", "latitud": "29.0846", "longitud": "-110.9625",
         "hora_apertura": "7:00:00", "hora_cierre": "19:00:00"},
        {"id_tiendita": 2, "nombre": "CafeteriaArtes", "direccion": "", "facultad_nombre": "Artes",
         "latitud": "29.0811", "longitud": "-110.9591", "hora_apertura": "7:00:00", "hora_cierre": "17:00:00"},
    ],
    "menus": (
        [{"nombre": "Mollete", "descripcion": "Con frijoles y queso", "precio": "30.00",
          "id_tiendita": 1, "categoria": "Desayuno"},
         {"nombre": "Torta Cubana", "descripcion": "", "precio": "85.00", "id_tiendita": 1, "categoria": ""},
         {"nombre": "Molletes Especiales", "descripcion": "", "precio": "45.00", "id_tiendita": 2,
          "categoria": "Desayuno"},
         {"nombre": "Invalido", "precio": "abc", "id_tiendita": 2, "categoria": "Snacks"},
         {"nombre": "Huerfano", "precio": "10", "id_tiendita": 99, "categoria": "Snacks"}]
        + [{"nombre": f"Taco {i}", "precio": str(20 + i), "id_tiendita": 2, "categoria": "Comida"}
           for i in range(MENU_CHUNK_SIZE + 2)]
    ),
}

NOW = datetime(2026, 9, 22, 18, 0, tzinfo=HERMOSILLO_TZ)


def chunk_index(catalog, store_id, category):
    return next(i for i, c in enumerate(catalog.chunks)
                if c.store_id == store_id and c.category == category)


def test_chunks_are_small_and_skip_orphans():
    catalog = Catalog(DATA)
    assert catalog.stores[2].name == "Cafeteria Artes"
    tacos = [c for c in catalog.chunks if c.category == "Comida"]
    assert [len(c.items) for c in tacos] == [MENU_CHUNK_SIZE, 2]
    assert any(c.category == "Varios" for c in catalog.chunks)  # categoría vacía
    assert all(item.name != "Huerfano" for c in catalog.chunks for item in c.items)
    assert sum(1 for c in catalog.chunks if c.category is None) == 2  # una ficha por cafetería


def test_query_terms_and_lexical_search():
    catalog = Catalog(DATA)
    terms = query_terms("¿Dónde venden molletes baratos?")
    assert terms == {"mollete"}
    hits = [catalog.chunks[i] for i, _ in catalog.lexical_search(terms)]
    assert {(c.store_id, c.category) for c in hits} == {(1, "Desayuno"), (2, "Desayuno")}


def test_render_status_distance_and_budget():
    catalog = Catalog(DATA)
    idx = chunk_index(catalog, 1, "Varios")
    ctx = RenderContext(now=NOW, ref_lat=29.0846, ref_lon=-110.9625)
    text = catalog.render_chunk(idx, ctx)
    assert "HORARIO: 07:00 - 19:00 (ABIERTA AHORA)" in text
    assert "DISTANCIA: 0 metros" in text
    assert "- Torta Cubana ($85)" in text

    # Presupuesto de $50: la torta de $85 se filtra y el fragmento queda vacío
    assert catalog.render_chunk(idx, RenderContext(now=NOW, budget=50)) is None

    artes = catalog.render_chunk(chunk_index(catalog, 2, "Desayuno"), RenderContext(now=NOW))
    assert "CERRADA AHORA" in artes


def test_cheapest_and_nearest_blocks():
    catalog = Catalog(DATA)
    ctx = RenderContext(now=NOW, cheap=True, terms={"mollete"})
    cheapest = catalog.render_cheapest(ctx)
    lines = cheapest.splitlines()
    assert lines[1] == "- Mollete ($30) en Cafeteria Derecho"
    assert lines[2] == "- Molletes Especiales ($45) en Cafeteria Artes"
    assert len(lines) == 3  # solo molletes, no todo el menú

    nearest = catalog.render_nearest(RenderContext(now=NOW, ref_lat=29.0811, ref_lon=-110.9591))
    assert nearest.splitlines()[1].startswith("- Cafeteria Artes: 0 metros")


def test_embedding_text_is_short():
    catalog = Catalog(DATA)
    for text in catalog.embedding_texts():
        assert len(text.split()) < 80
