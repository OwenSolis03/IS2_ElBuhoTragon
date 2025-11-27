# 🦉 El Búho Tragón — Ingeniería de Software II

> **Asistente Inteligente y Guía Gastronómica para la Universidad de Sonora.**

Proyecto desarrollado para la materia de **Ingeniería de Software II**, enfocado en centralizar la información de los menús, precios y ubicaciones de las cafeterías universitarias, potenciado por un asistente de IA (RAG).

---

![GitHub last commit](https://img.shields.io/github/last-commit/OwenSolis03/IS2_ElBuhoTragon/test?style=for-the-badge&color=b4befe)
![GitHub repo size](https://img.shields.io/github/repo-size/OwenSolis03/IS2_ElBuhoTragon?style=for-the-badge&color=cba6f7)
![Github Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Github Django](https://img.shields.io/badge/django-%23092E20.svg?style=for-the-badge&logo=django&logoColor=white)
![Github React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![PyTorch](https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white)
![HuggingFace](https://img.shields.io/badge/%F0%9F%A4%97-HuggingFace-orange?style=for-the-badge)
![FAISS](https://img.shields.io/badge/FAISS-Vector%20DB-blue?style=for-the-badge)

---

# 📑 Índice

1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [Arquitectura y Tecnologías](#-arquitectura-y-tecnologías)
3. [Estructura del Repositorio](#-estructura-del-repositorio)
4. [Instalación y Uso](#-instalación-y-uso)
    1. [Base de Datos (MySQL)](#1-base-de-datos-mysql)
    2. [Backend (Django)](#2-backend-django)
    3. [Frontend (React)](#3-frontend-react)
    4. [🤖 Módulo de IA (RAG Engine)](#4-🤖-módulo-de-ia-rag-engine-nuevo)

---

## 🦉 Descripción del Proyecto

**El Búho Tragón** resuelve el problema de la dispersión de información alimenticia en el campus. Permite a los estudiantes:
* Consultar menús actualizados de todas las cafeterías.
* Ver ubicaciones y horarios.
* **Interactuar con un Chatbot de IA:** Un sistema RAG (Retrieval-Augmented Generation) que responde preguntas como *"¿Dónde venden Torta Cubana más barata?"* o *"¿Qué cafetería está abierta ahorita cerca de Ingeniería?"*.

---

## ⚙️ Arquitectura y Tecnologías

### 🔧 Backend
- **Lenguaje:** Python 3.12+
- **Framework:** Django REST Framework
- **Base de Datos:** MySQL / MariaDB

### 🎨 Frontend
- **Framework:** React + Vite
- **Estilos:** TailwindCSS
- **Lenguaje:** JavaScript (ES6+)

### 🧠 Inteligencia Artificial (Nuevo)
- **Modelo LLM:** Qwen2.5-1.5B-Instruct (Optimizado para CPU)
- **Embeddings:** sentence-transformers (`all-MiniLM-L6-v2`)
- **Vector Store:** FAISS (Facebook AI Similarity Search)
- **Librerías:** PyTorch, Transformers, HuggingFace

---

## 📁 Estructura del Repositorio

- `/backend/` — API REST en Django. [🔗 Ver](./backend/)
- `/frontend/` — Cliente web en React. [🔗 Ver](./frontend/)
- `/llm_rag/` — **Motor de Inteligencia Artificial.** Contiene el script `rag_engine.py` y los datos vectorizados. [🔗 Ver](./llm_rag/)
- `/docs/` — Documentación y diagramas. [🔗 Ver](./docs/)
- `/sql/` — Scripts de inicialización de Base de Datos. [🔗 Ver](./sql/)

---

## 🛠️ Instalación y Uso

### Prerrequisitos Globales
- Python 3.10+
- Node.js 18+
- MySQL Server

### 1. Base de Datos (MySQL)

Asegúrate de que el servicio esté corriendo:
```bash
# Linux
sudo systemctl start mysql

# Windows
net start mysql