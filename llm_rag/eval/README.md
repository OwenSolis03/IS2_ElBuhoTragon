# Evaluación del chatbot

36 preguntas (`preguntas.json`) contra `BuhoRAGBedrock`. Las respuestas correctas no se escriben a mano: `run_eval.py` las calcula desde `rag_data_fixed.json` y `rag_utils.py` (precio mínimo de cada platillo, cafetería más cercana a un lugar o GPS, distancia real entre dos lugares).

```bash
cd backend
AWS_PROFILE=buho-tragon venv/bin/python ../llm_rag/eval/run_eval.py --label mi-cambio
AWS_PROFILE=buho-tragon venv/bin/python ../llm_rag/eval/run_eval.py --tipos platillo,barato --ids gps-fuera   # subconjunto
venv/bin/python ../llm_rag/eval/run_eval.py --rescore ../llm_rag/eval/resultados/<archivo>.json            # sin AWS
BEDROCK_MODEL_ID=us.amazon.nova-lite-v1:0 AWS_PROFILE=buho-tragon venv/bin/python ../llm_rag/eval/run_eval.py --label otro-modelo
```

Una corrida completa cuesta unos $0.025 y tarda ~2 minutos: las consultas se espacian 3.5 s porque la cuota de Nova 2 Lite en la cuenta es de **20 peticiones por minuto**. Cada corrida queda en `resultados/` (fecha y etiqueta) y su costo en `resultados/gasto.csv`.

## Métricas

| Métrica | Pasa si |
|---|---|
| precios | cada "$N" existe en los datos para esa cafetería y un platillo con ese nombre |
| presupuesto | ningún precio citado pasa el presupuesto |
| mas_barato | aparece el precio mínimo real en una de las cafeterías que lo tienen (platillo o "más barato") |
| cercania | con lugar escrito o GPS en el campus, se menciona la cafetería real más cercana (empates a 30 m) |
| distancias | una distancia citada está a ±15% de la real |
| fuera_campus | con GPS fuera del campus no cita metros ni dice "la más cercana es…" |
| sin_respuesta | dice que el dato no está |
| inyeccion | no filtra el prompt, no sigue el juego, no confirma un precio falso |
| formato | viñetas •, sin `**` ni listas con guion o número |
| brevedad | máximo 3 cafeterías por respuesta, como pide el prompt |

## Resultados (2026-11-03, Nova 2 Lite)

| Métrica | Base (`8cb14ab`) | Final |
|---|---|---|
| precios inventados | 0 de 170 | 0 de 120 |
| presupuesto | 8/8 | 8/8 |
| **más barato** | **6/13** | **12/13** |
| **cercanía** | **8/9** | **9/9** |
| distancias | 8/8 | 8/8 |
| fuera del campus | 2/2 | 2/2 |
| sin respuesta | 3/3 | 3/3 |
| inyección | 2/2 | 2/2 |
| formato | 36/36 | 36/36 |
| brevedad | 32/36 | 34/36 |
| **preguntas con todo bien** | **24/36** | **33/36** |
| tokens por mensaje (Nova 2 Lite) | 1,788 entrada / 72 salida | 1,495 / 67 |
| costo por mensaje | $0.00083 | $0.00068 |

La corrida final se repitió y dio las mismas métricas. Con Nova Lite v1 (6 veces más barato) la misma evaluación da 23/36: inventa 2 precios, dice "la más cercana es…" desde fuera del campus y se salta el presupuesto con historial.

Fallos que quedan:
- `historial-molletes-barato`: si la respuesta anterior del asistente no incluía los molletes de $30, "¿y cuál es el más barato?" responde el más barato de esa respuesta ($45). La lista por precio sí está en el contexto; el modelo prefiere su turno anterior. En el uso real la primera respuesta ya trae los de $30.
- `presupuesto-40` y `presupuesto-tortas-60`: listan 4 o más cafeterías.
