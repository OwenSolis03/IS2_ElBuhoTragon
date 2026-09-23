"""
Catálogo de cafeterías para el RAG.

Convierte rag_data_fixed.json en fragmentos pequeños (chunks) que se indexan con
embeddings, ofrece búsqueda léxica sobre platillos y renderiza el contexto que
recibe el LLM (con horario abierto/cerrado, distancia y filtro de presupuesto
calculados de forma determinista, no por el modelo).

Sin dependencias de modelos: se puede probar sin torch/faiss.
"""
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

from .rag_utils import calculate_distance, is_open, normalize_text, parse_hour

# El modelo de embeddings trunca a 128 tokens: fragmentos chicos para que
# todos los platillos queden realmente representados en el vector.
MENU_CHUNK_SIZE = 6
DESCRIPTION_MAX_CHARS = 90

# Palabras que no sirven para buscar platillos por coincidencia léxica.
STOPWORDS = {
    "donde", "venden", "vende", "tienen", "tiene", "hay", "haya", "cuanto", "cuesta", "cuestan",
    "precio", "precios", "quiero", "queria", "algo", "para", "comer", "desayunar", "cenar",
    "almorzar", "cafeteria", "cafeterias", "cafe", "comida", "comidas", "menu", "menus",
    "platillo", "platillos", "opciones", "opcion", "recomiendas", "recomienda", "recomendacion",
    "barato", "barata", "baratos", "baratas", "economico", "economica", "cerca", "cercana",
    "cercano", "cercanas", "cercanos", "estoy", "esta", "estan", "este", "esto", "unos", "unas",
    "pesos", "tengo", "traigo", "presupuesto", "menos", "mas", "con", "sin", "que", "como",
    "cual", "cuales", "cuando", "horario", "horarios", "abierto", "abierta", "abren", "cierran",
    "ahora", "hoy", "puedo", "puede", "quisiera", "busco", "buscar", "alguna", "alguno", "algun",
    "todas", "todos", "todo", "universidad", "unison", "campus", "facultad", "edificio",
    "bueno", "buena", "rico", "rica", "lugar", "lugares", "sabes", "dime", "ayuda", "gracias",
}


def _clean_name(name: str) -> str:
    """"CafeteriaArtes" -> "Cafeteria Artes"."""
    return re.sub(r"([a-z])([A-Z])", r"\1 \2", (name or "Desconocida").strip())


def _stem(word: str) -> str:
    """Singular aproximado en español: "molletes" -> "mollete", "tortas" -> "torta"."""
    if len(word) > 4 and word.endswith("s"):
        return word[:-1]
    return word


def _words(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", normalize_text(text))


def query_terms(query: str) -> Set[str]:
    """Términos útiles de la consulta para la búsqueda léxica."""
    return {_stem(w) for w in _words(query) if len(w) >= 4 and w not in STOPWORDS}


def _matches(terms: Set[str], tokens: Set[str]) -> bool:
    return any(tok.startswith(term) for term in terms for tok in tokens)


@dataclass
class MenuItem:
    name: str
    price: Optional[float]
    description: str
    name_tokens: Set[str] = field(default_factory=set)
    desc_tokens: Set[str] = field(default_factory=set)

    def label(self) -> str:
        price = f"${self.price:.0f}" if self.price is not None else "precio no disponible"
        text = f"- {self.name} ({price})"
        if self.description:
            desc = self.description
            if len(desc) > DESCRIPTION_MAX_CHARS:
                desc = desc[:DESCRIPTION_MAX_CHARS].rsplit(" ", 1)[0] + "..."
            text += f": {desc}"
        return text


@dataclass
class Store:
    id: int
    name: str
    address: str
    faculty: str
    lat: Optional[str]
    lon: Optional[str]
    opens: Optional[str]
    closes: Optional[str]
    name_tokens: Set[str] = field(default_factory=set)

    def hours(self) -> Optional[str]:
        start, end = parse_hour(self.opens), parse_hour(self.closes)
        if start is None or end is None:
            return None
        return f"{start:%H:%M} - {end:%H:%M}"

    def status(self, now: datetime) -> Optional[str]:
        state = is_open(self.opens, self.closes, now)
        if state is None:
            return None
        return "ABIERTA AHORA" if state else "CERRADA AHORA"

    def location(self) -> str:
        return ", ".join(part for part in (self.address, self.faculty) if part)


@dataclass
class Chunk:
    store_id: int
    category: Optional[str]  # None = ficha general de la cafetería
    items: List[MenuItem]


@dataclass
class RenderContext:
    now: datetime
    ref_lat: Optional[float] = None
    ref_lon: Optional[float] = None
    budget: Optional[float] = None
    cheap: bool = False
    terms: Set[str] = field(default_factory=set)

    @property
    def has_location(self) -> bool:
        return self.ref_lat is not None and self.ref_lon is not None


class Catalog:
    def __init__(self, data: Dict):
        self.stores: Dict[int, Store] = {}
        self.chunks: List[Chunk] = []

        for t in data.get("tienditas", []):
            store = Store(
                id=t.get("id_tiendita"),
                name=_clean_name(t.get("nombre")),
                address=(t.get("direccion") or "").strip(),
                faculty=(t.get("facultad_nombre") or "").strip(),
                lat=t.get("latitud"),
                lon=t.get("longitud"),
                opens=t.get("hora_apertura"),
                closes=t.get("hora_cierre"),
            )
            store.name_tokens = {w for w in _words(store.name) if len(w) >= 4 and w not in STOPWORDS}
            self.stores[store.id] = store

        items_by_store: Dict[int, Dict[str, List[MenuItem]]] = {}
        for m in data.get("menus", []):
            if m.get("id_tiendita") not in self.stores:
                continue
            name = (m.get("nombre") or "").strip().replace("\n", " ")
            if not name:
                continue
            try:
                price = float(m.get("precio"))
            except (TypeError, ValueError):
                price = None
            description = " ".join((m.get("descripcion") or "").split())
            item = MenuItem(
                name=name,
                price=price,
                description=description,
                name_tokens=set(_words(name)),
                desc_tokens=set(_words(description)),
            )
            category = (m.get("categoria") or "").strip() or "Varios"
            items_by_store.setdefault(m["id_tiendita"], {}).setdefault(category, []).append(item)

        for store_id in self.stores:
            self.chunks.append(Chunk(store_id=store_id, category=None, items=[]))
            for category, items in items_by_store.get(store_id, {}).items():
                for i in range(0, len(items), MENU_CHUNK_SIZE):
                    self.chunks.append(Chunk(store_id, category, items[i:i + MENU_CHUNK_SIZE]))

        self._categories = {
            store_id: sorted(cats.keys()) for store_id, cats in items_by_store.items()
        }

    # ------------------------------------------------------------------ indexado

    def embedding_text(self, idx: int) -> str:
        """Texto corto (<128 tokens) que se vectoriza para la búsqueda semántica."""
        chunk = self.chunks[idx]
        store = self.stores[chunk.store_id]
        if chunk.category is None:
            cats = ", ".join(self._categories.get(store.id, [])) or "sin menú registrado"
            parts = [f"{store.name}.", f"Ubicación: {store.location()}."]
            if store.hours():
                parts.append(f"Horario {store.hours()}.")
            parts.append(f"Menú: {cats}.")
            return " ".join(parts)
        names = ", ".join(item.name for item in chunk.items)
        return f"{store.name}. {chunk.category}: {names}."

    def embedding_texts(self) -> List[str]:
        return [self.embedding_text(i) for i in range(len(self.chunks))]

    # ------------------------------------------------------------------ búsqueda

    def lexical_search(self, terms: Set[str], limit: int = 20) -> List[Tuple[int, int]]:
        """Fragmentos que mencionan los términos (platillo o nombre de cafetería).
        Devuelve [(índice, puntaje)] ordenado por puntaje descendente."""
        if not terms:
            return []
        scored = []
        for idx, chunk in enumerate(self.chunks):
            store = self.stores[chunk.store_id]
            score = 0
            for item in chunk.items:
                if _matches(terms, item.name_tokens):
                    score += 2
                elif _matches(terms, item.desc_tokens):
                    score += 1
            if _matches(terms, store.name_tokens):
                score += 1
            if score:
                scored.append((idx, score))
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:limit]

    def store_distance(self, store_id: int, ctx: RenderContext) -> Optional[float]:
        if not ctx.has_location:
            return None
        store = self.stores[store_id]
        return calculate_distance(ctx.ref_lat, ctx.ref_lon, store.lat, store.lon)

    # ------------------------------------------------------------------ render

    def _store_header(self, store: Store, ctx: RenderContext) -> List[str]:
        lines = [f"CAFETERÍA: {store.name}"]
        if store.location():
            lines.append(f"UBICACIÓN: {store.location()}")
        if store.hours():
            status = store.status(ctx.now)
            lines.append(f"HORARIO: {store.hours()}" + (f" ({status})" if status else ""))
        dist = self.store_distance(store.id, ctx)
        if dist is not None:
            lines.append(f"DISTANCIA: {dist:.0f} metros")
        return lines

    def _visible_items(self, items: List[MenuItem], ctx: RenderContext) -> List[MenuItem]:
        if ctx.budget is not None:
            items = [it for it in items if it.price is not None and it.price <= ctx.budget]
        # Primero lo que coincide con lo que pidió el usuario; luego por precio si busca barato.
        return sorted(
            items,
            key=lambda it: (
                not _matches(ctx.terms, it.name_tokens),
                (it.price if it.price is not None else float("inf")) if ctx.cheap else 0,
            ),
        )

    def render_chunk(self, idx: int, ctx: RenderContext) -> Optional[str]:
        """Contexto para el LLM. None si el presupuesto deja el fragmento vacío."""
        chunk = self.chunks[idx]
        store = self.stores[chunk.store_id]
        lines = self._store_header(store, ctx)
        if chunk.category is None:
            cats = self._categories.get(store.id)
            lines.append(f"CATEGORÍAS DEL MENÚ: {', '.join(cats)}" if cats else "MENÚ: (sin menú registrado)")
            return "\n".join(lines)
        items = self._visible_items(chunk.items, ctx)
        if not items:
            return None
        lines.append(f"MENÚ ({chunk.category.upper()}):")
        lines.extend(item.label() for item in items)
        return "\n".join(lines)

    def render_nearest(self, ctx: RenderContext, limit: int = 5) -> Optional[str]:
        ranked = []
        for store in self.stores.values():
            dist = self.store_distance(store.id, ctx)
            if dist is not None:
                ranked.append((dist, store))
        if not ranked:
            return None
        ranked.sort(key=lambda pair: pair[0])
        lines = ["CAFETERÍAS MÁS CERCANAS:"]
        for dist, store in ranked[:limit]:
            extra = [f"{dist:.0f} metros"]
            if store.hours():
                extra.append(store.hours())
            if store.status(ctx.now):
                extra.append(store.status(ctx.now))
            lines.append(f"- {store.name}: " + ", ".join(extra))
        return "\n".join(lines)

    def render_cheapest(self, ctx: RenderContext, limit: int = 8) -> Optional[str]:
        """Platillos más baratos (de lo que pidió el usuario si hay coincidencias)."""
        candidates = []
        for chunk in self.chunks:
            for item in chunk.items:
                if item.price is None:
                    continue
                if ctx.budget is not None and item.price > ctx.budget:
                    continue
                candidates.append((item, chunk.store_id))
        matching = [c for c in candidates if _matches(ctx.terms, c[0].name_tokens)]
        pool = matching or candidates
        if not pool:
            return None
        pool.sort(key=lambda c: c[0].price)
        title = "OPCIONES MÁS BARATAS"
        if ctx.budget is not None:
            title += f" (hasta ${ctx.budget:.0f})"
        lines = [title + ":"]
        for item, store_id in pool[:limit]:
            line = f"- {item.name} (${item.price:.0f}) en {self.stores[store_id].name}"
            dist = self.store_distance(store_id, ctx)
            if dist is not None:
                line += f", a {dist:.0f} metros"
            lines.append(line)
        return "\n".join(lines)
