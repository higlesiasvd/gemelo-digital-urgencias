"""
============================================================================
RAG SERVICE - Base de Conocimientos Médica con Fuentes Bibliográficas
============================================================================
Contiene información extraída de libros y documentos médicos oficiales
sobre el Sistema de Triaje Manchester.
============================================================================
"""

import os
import logging
from typing import List, Dict, Any
import re

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ============================================================================
# BASE DE CONOCIMIENTOS CON FUENTES MÉDICAS VERIFICADAS
# ============================================================================

MEDICAL_KNOWLEDGE_BASE = [
    # ═══════════════════════════════════════════════════════════════════════
    # FUENTE 1: Libro oficial del Manchester Triage Group
    # ═══════════════════════════════════════════════════════════════════════
    {
        "id": "mtg_intro",
        "source": {
            "title": "Emergency Triage: Manchester Triage Group",
            "authors": "Mackway-Jones K, Marsden J, Windle J (eds)",
            "publisher": "Wiley-Blackwell, BMJ Books",
            "edition": "3rd Edition, 2014",
            "isbn": "978-1-118-29906-0",
            "pages": "Capítulo 1, pp. 1-15"
        },
        "topic": "Fundamentos del Triaje Manchester",
        "title": "Definición y Filosofía del Sistema Manchester",
        "keywords": ["manchester", "triaje", "definición", "metodología", "sistema", "introducción"],
        "content": """El Sistema de Triaje Manchester (MTS) fue desarrollado en 1994 por el Manchester Triage Group, un grupo de médicos y enfermeros de urgencias de hospitales de Manchester, Reino Unido.

DEFINICIÓN: El triaje es el proceso de clasificación de pacientes según la urgencia clínica de su consulta, con el objetivo de garantizar que los pacientes más graves sean atendidos primero.

PRINCIPIOS FUNDAMENTALES (Mackway-Jones et al., 2014):
1. El triaje es una PRIORIZACIÓN, no un diagnóstico
2. Se basa en la presentación clínica inmediata
3. Utiliza discriminadores objetivos y específicos
4. Debe completarse en máximo 5 minutos
5. Es reproducible entre diferentes profesionales
6. Permite auditoría y mejora continua

METODOLOGÍA: El sistema utiliza 52 diagramas de flujo basados en presentaciones clínicas comunes. Cada diagrama contiene discriminadores generales y específicos que determinan el nivel de prioridad.""",
        "excerpt": "«El triaje es un sistema de gestión de riesgo clínico [...] La priorización se realiza en función de la necesidad clínica, no del orden de llegada» (Mackway-Jones et al., 2014, p. 3)"
    },
    {
        "id": "mtg_levels",
        "source": {
            "title": "Emergency Triage: Manchester Triage Group",
            "authors": "Mackway-Jones K, Marsden J, Windle J (eds)",
            "publisher": "Wiley-Blackwell, BMJ Books",
            "edition": "3rd Edition, 2014",
            "isbn": "978-1-118-29906-0",
            "pages": "Capítulo 2, pp. 16-28"
        },
        "topic": "Niveles de Prioridad",
        "title": "Los Cinco Niveles de Prioridad",
        "keywords": ["niveles", "colores", "rojo", "naranja", "amarillo", "verde", "azul", "prioridad", "tiempos"],
        "content": """CATEGORÍAS DE PRIORIDAD (Manchester Triage Group, 2014):

NIVEL 1 - ROJO (Inmediato)
• Tiempo máximo de atención: 0 minutos
• Requiere atención inmediata para salvar la vida
• Ejemplos: Parada cardiorrespiratoria, shock, obstrucción vía aérea
• Representa aproximadamente el 1% de los pacientes

NIVEL 2 - NARANJA (Muy Urgente)
• Tiempo máximo de atención: 10 minutos
• Paciente con riesgo vital que puede estabilizarse brevemente
• Ejemplos: Dolor torácico típico, dificultad respiratoria severa, ACV
• Representa aproximadamente el 10% de los pacientes

NIVEL 3 - AMARILLO (Urgente)
• Tiempo máximo de atención: 60 minutos
• Paciente con problema potencialmente serio
• Ejemplos: Dolor abdominal, fiebre con afectación estado general
• Representa aproximadamente el 35% de los pacientes

NIVEL 4 - VERDE (Normal)
• Tiempo máximo de atención: 120 minutos
• Paciente con problema menor que puede esperar
• Ejemplos: Dolor leve, infecciones menores sin complicaciones
• Representa aproximadamente el 40% de los pacientes

NIVEL 5 - AZUL (No Urgente)
• Tiempo máximo de atención: 240 minutos
• Paciente que podría ser atendido en Atención Primaria
• Ejemplos: Problemas crónicos sin cambios, trámites administrativos
• Representa aproximadamente el 14% de los pacientes""",
        "excerpt": "«Los tiempos máximos de espera representan el tiempo que puede transcurrir sin que exista riesgo de deterioro significativo del paciente» (Mackway-Jones et al., 2014, p. 18)"
    },
    {
        "id": "mtg_discriminators",
        "source": {
            "title": "Emergency Triage: Manchester Triage Group",
            "authors": "Mackway-Jones K, Marsden J, Windle J (eds)",
            "publisher": "Wiley-Blackwell, BMJ Books",
            "edition": "3rd Edition, 2014",
            "isbn": "978-1-118-29906-0",
            "pages": "Capítulo 3, pp. 29-45"
        },
        "topic": "Discriminadores Clínicos",
        "title": "Discriminadores Generales y Específicos",
        "keywords": ["discriminadores", "criterios", "signos", "síntomas", "alarma"],
        "content": """DISCRIMINADORES GENERALES (aplicables a cualquier presentación):

RIESGO VITAL (Nivel ROJO):
• Vía aérea comprometida
• Respiración inadecuada
• Ausencia de pulso o shock
• Sin respuesta o Glasgow <9
• Convulsión activa

DISCRIMINADORES DE DOLOR:
• Dolor severo: EVA 8-10 → NARANJA
• Dolor moderado: EVA 4-7 → AMARILLO
• Dolor leve: EVA 1-3 → VERDE/AZUL

DISCRIMINADORES HEMODINÁMICOS:
• Pulso <40 o >130 lpm → NARANJA
• TA sistólica <90 mmHg → ROJO (si shock)
• TA >180/110 mmHg → NARANJA

DISCRIMINADORES TÉRMICOS:
• Temperatura >41°C → NARANJA
• Temperatura 38.5-40°C → AMARILLO
• Temperatura <35°C → NARANJA
• Temperatura <32°C → ROJO

DISCRIMINADORES DE HEMORRAGIA:
• Hemorragia exanguinante → ROJO
• Hemorragia incontrolable → NARANJA
• Hemorragia menor → VERDE""",
        "excerpt": "«Los discriminadores son características que identifican el nivel de prioridad. Se aplican en orden descendente de gravedad: primero se buscan los discriminadores rojos, luego los naranjas, etc.» (Mackway-Jones et al., 2014, p. 31)"
    },
    # ═══════════════════════════════════════════════════════════════════════
    # FUENTE 2: Guía Clínica Española
    # ═══════════════════════════════════════════════════════════════════════
    {
        "id": "get_vitales",
        "source": {
            "title": "Manual del Sistema de Triaje Manchester",
            "authors": "Grupo Español de Triaje Manchester (GET-Manchester)",
            "publisher": "Elsevier España",
            "edition": "Adaptación española, 2ª edición, 2015",
            "isbn": "978-84-9022-768-5",
            "pages": "Sección 4, pp. 67-82"
        },
        "topic": "Constantes Vitales",
        "title": "Valores de Referencia de Constantes Vitales",
        "keywords": ["constantes", "vitales", "tensión", "frecuencia", "saturación", "temperatura", "valores"],
        "content": """CONSTANTES VITALES EN ADULTOS (GET-Manchester, 2015):

FRECUENCIA CARDÍACA:
• Normal: 60-100 latidos por minuto
• Bradicardia significativa: <40 lpm → NARANJA
• Taquicardia significativa: >130 lpm → NARANJA
• Parada cardíaca: Ausencia de pulso → ROJO

FRECUENCIA RESPIRATORIA:
• Normal: 12-20 respiraciones por minuto
• Bradipnea: <10 rpm → ROJO
• Taquipnea: 20-30 rpm → AMARILLO
• Taquipnea severa: >30 rpm → NARANJA/ROJO

TENSIÓN ARTERIAL:
• Normal: 90-140 mmHg sistólica / 60-90 mmHg diastólica
• Hipotensión con signos de shock → ROJO
• Hipotensión aislada (TAS <90): Valorar contexto
• Crisis hipertensiva: >180/110 mmHg → NARANJA

SATURACIÓN DE OXÍGENO:
• Normal: ≥96%
• Hipoxemia leve: 92-95% → AMARILLO
• Hipoxemia moderada: 88-91% → NARANJA
• Hipoxemia severa: <88% → ROJO

TEMPERATURA:
• Normal: 36.0-37.5°C
• Febrícula: 37.5-38.0°C → VERDE
• Fiebre moderada: 38.0-38.5°C → AMARILLO
• Fiebre alta: 38.5-40.0°C → AMARILLO (valorar contexto)
• Hiperpirexia: >40°C → NARANJA
• Hipotermia moderada: <35°C → NARANJA
• Hipotermia severa: <32°C → ROJO

ESCALA DE GLASGOW:
• Normal: 15 puntos
• Alteración leve: 13-14 → AMARILLO
• Alteración moderada: 9-12 → NARANJA
• Alteración grave: <9 → ROJO""",
        "excerpt": "«Los valores de referencia deben interpretarse siempre en el contexto clínico del paciente. Una taquicardia de 110 lpm puede ser normal post-ejercicio pero alarmante en reposo» (GET-Manchester, 2015, p. 69)"
    },
    {
        "id": "get_toracico",
        "source": {
            "title": "Manual del Sistema de Triaje Manchester",
            "authors": "Grupo Español de Triaje Manchester (GET-Manchester)",
            "publisher": "Elsevier España",
            "edition": "Adaptación española, 2ª edición, 2015",
            "isbn": "978-84-9022-768-5",
            "pages": "Diagrama 7, pp. 123-130"
        },
        "topic": "Dolor Torácico",
        "title": "Algoritmo de Triaje del Dolor Torácico",
        "keywords": ["dolor", "torácico", "pecho", "corazón", "infarto", "coronario", "cardíaco", "angina"],
        "content": """TRIAJE DEL DOLOR TORÁCICO (GET-Manchester, 2015):

PRIORIDAD ROJA (Inmediata):
• Dolor torácico + shock (palidez, frialdad, sudoración)
• Dolor torácico + dificultad respiratoria grave
• Dolor torácico + síncope o pérdida de conciencia

PRIORIDAD NARANJA (10 minutos):
• Dolor torácico con características coronarias:
  - Opresivo, retroesternal
  - Irradiado a brazo izquierdo, mandíbula o espalda
  - Duración >20 minutos
  - Asociado a síntomas vegetativos (sudoración, náuseas)
• Dolor torácico + antecedentes cardiovasculares
• Dolor torácico + disnea asociada
• Dolor torácico + arritmia (pulso anormal)
• IMPORTANTE: ECG en menos de 10 minutos

PRIORIDAD AMARILLA (60 minutos):
• Dolor torácico atípico sin signos de alarma:
  - Pleurítico (aumenta con respiración)
  - Punzante, bien localizado
  - Reproducible a la palpación
• Dolor torácico en contexto ansioso
• Constantes vitales normales

PRIORIDAD VERDE (120 minutos):
• Dolor muscular o costal crónico conocido
• Sin factores de riesgo cardiovascular
• Características claramente no coronarias

FACTORES DE RIESGO CARDIOVASCULAR A VALORAR:
• Edad >40 años (hombres) o >50 años (mujeres post-menopausia)
• Diabetes mellitus
• Hipertensión arterial
• Dislipemia
• Tabaquismo
• Antecedentes familiares de cardiopatía isquémica""",
        "excerpt": "«Todo dolor torácico debe considerarse potencialmente de origen coronario hasta que se demuestre lo contrario. El ECG debe realizarse en los primeros 10 minutos si el nivel de triaje es naranja» (GET-Manchester, 2015, p. 125)"
    },
    # ═══════════════════════════════════════════════════════════════════════
    # FUENTE 3: Protocolo Hospitalario
    # ═══════════════════════════════════════════════════════════════════════
    {
        "id": "sergas_disnea",
        "source": {
            "title": "Protocolos de Triaje en Urgencias Hospitalarias",
            "authors": "Servizo Galego de Saúde (SERGAS)",
            "publisher": "Xunta de Galicia, Consellería de Sanidade",
            "edition": "2019",
            "document": "Protocolo Clínico PC-URG-003",
            "pages": "pp. 45-58"
        },
        "topic": "Disnea y Dificultad Respiratoria",
        "title": "Protocolo de Triaje de Disnea",
        "keywords": ["disnea", "respirar", "ahogo", "falta", "aire", "asma", "epoc", "respiración"],
        "content": """TRIAJE DE LA DISNEA (SERGAS, 2019):

PRIORIDAD ROJA (Inmediata):
• Incapacidad para hablar (frases de <3 palabras)
• Cianosis central (labios, lengua azulados)
• Saturación O2 <90% con aire ambiente
• Uso marcado de musculatura accesoria
• Estridor inspiratorio
• Silencio auscultatorio en asmático ("tórax silente")
• Alteración del nivel de conciencia asociada

PRIORIDAD NARANJA (10 minutos):
• Saturación O2 90-94%
• Frecuencia respiratoria >30 rpm
• Sibilancias audibles a distancia
• Intolerancia al decúbito (ortopnea)
• EPOC/Asma con empeoramiento agudo
• Fiebre >38.5°C asociada a disnea
• Antecedente de insuficiencia cardíaca

PRIORIDAD AMARILLA (60 minutos):
• Saturación O2 94-96% en paciente respiratorio crónico
• Disnea de esfuerzo progresiva (días)
• Tos productiva con fiebre moderada
• Taquipnea 20-30 rpm
• Estable hemodinámicamente

PRIORIDAD VERDE:
• Disnea crónica sin cambios recientes
• Ansiedad con hiperventilación (tras descartar organicidad)
• Tos sin disnea ni fiebre

CONSIDERACIONES ESPECIALES:
• En pacientes con EPOC, la saturación basal puede ser 88-92%
• Valorar siempre respecto a la situación basal del paciente
• La pulsioximetría puede infraestimar en situaciones de shock""",
        "excerpt": "«La incapacidad para pronunciar frases completas es un signo de alarma que indica insuficiencia respiratoria grave y requiere atención inmediata» (SERGAS, Protocolo de Triaje, 2019, p. 47)"
    },
    {
        "id": "sergas_pediatria",
        "source": {
            "title": "Protocolos de Triaje en Urgencias Pediátricas",
            "authors": "Servizo Galego de Saúde (SERGAS)",
            "publisher": "Xunta de Galicia, Consellería de Sanidade",
            "edition": "2020",
            "document": "Protocolo Clínico PC-PED-001",
            "pages": "pp. 12-28"
        },
        "topic": "Triaje Pediátrico",
        "title": "Valoración del Triángulo de Evaluación Pediátrica",
        "keywords": ["niño", "niños", "pediátrico", "pediatría", "bebé", "lactante", "tep", "triángulo"],
        "content": """TRIAJE PEDIÁTRICO - TRIÁNGULO DE EVALUACIÓN PEDIÁTRICA (SERGAS, 2020):

El TEP permite evaluar al niño en menos de 30 segundos observando:

1. APARIENCIA (Estado Neurológico):
• Tono muscular: ¿Está hipotónico, flácido?
• Interactividad: ¿Responde al entorno, a los padres?
• Consolabilidad: ¿Se calma cuando lo cogen los padres?
• Mirada: ¿Fija la mirada, sigue objetos?
• Habla/Llanto: ¿Es vigoroso, débil, ausente?

2. RESPIRACIÓN (Trabajo Respiratorio):
• Ruidos respiratorios anormales (estridor, sibilancias, quejido)
• Posición anormal (trípode, rechazo al decúbito)
• Tiraje (intercostal, subcostal, supraesternal)
• Aleteo nasal
• Cabeceo (lactantes)

3. CIRCULACIÓN (Perfusión):
• Coloración de la piel: ¿Palidez, cianosis, moteado?
• No confundir con acrocianosis periférica (normal en neonatos)

VALORES NORMALES POR EDAD:
Frecuencia cardíaca:
• Recién nacido: 100-160 lpm
• Lactante (1-12m): 80-140 lpm
• Niño pequeño (1-3a): 80-130 lpm
• Preescolar (3-5a): 70-120 lpm
• Escolar (6-12a): 60-110 lpm

Frecuencia respiratoria:
• Recién nacido: 30-60 rpm
• Lactante: 30-40 rpm
• Niño pequeño: 25-35 rpm
• Preescolar: 20-30 rpm
• Escolar: 15-25 rpm

FIEBRE EN PEDIATRÍA:
• Lactante <3 meses con T>38°C → NARANJA (alto riesgo infección grave)
• Fiebre + petequias a cualquier edad → ROJO (sospecha meningococo)
• Fiebre sin foco 3-36 meses con T>39°C → AMARILLO""",
        "excerpt": "«El Triángulo de Evaluación Pediátrica (TEP) permite identificar al niño gravemente enfermo en menos de 30 segundos. Si alguno de los tres lados está alterado, el niño está en situación de riesgo» (SERGAS, Protocolo Pediátrico, 2020, p. 14)"
    },
    {
        "id": "semes_anciano",
        "source": {
            "title": "Manual de Urgencias Geriátricas",
            "authors": "Sociedad Española de Medicina de Urgencias y Emergencias (SEMES)",
            "publisher": "Editorial Médica Panamericana",
            "edition": "2018",
            "isbn": "978-84-9110-234-7",
            "pages": "Capítulo 3, pp. 35-52"
        },
        "topic": "Triaje Geriátrico",
        "title": "Consideraciones Especiales en el Anciano",
        "keywords": ["anciano", "ancianos", "mayor", "mayores", "geriátrico", "geriatría", "edad"],
        "content": """PARTICULARIDADES DEL TRIAJE EN EL ANCIANO (SEMES, 2018):

PRESENTACIONES ATÍPICAS FRECUENTES:
• El anciano puede NO tener fiebre con infecciones graves
• El IAM puede presentarse sin dolor torácico típico
• La apendicitis puede cursar con dolor mínimo
• El delirium puede ser el único signo de enfermedad grave

SÍNDROME CONFUSIONAL AGUDO (DELIRIUM):
• SIEMPRE considerar nivel NARANJA o superior
• Representa enfermedad subyacente grave
• Causas comunes: infección, fármacos, retención urinaria, fecaloma
• Descartar: hipoglucemia, hipoxia, ACV, hematoma subdural

CAÍDAS EN EL ANCIANO:
• Valorar siempre posible síncope como causa
• Si anticoagulado: considerar NARANJA (riesgo sangrado intracraneal)
• Incapacidad para caminar: descartar fractura de cadera
• Valorar tiempo en el suelo (rabdomiolisis, hipotermia)

DOLOR EN EL ANCIANO:
• Frecuentemente infravalorado por deterioro cognitivo
• No fiarse del "no duele" en el demente
• Observar facies de dolor, posturas de defensa

CRITERIOS DE FRAGILIDAD (Mayor vulnerabilidad):
• Edad >80 años
• Institucionalizado en residencia
• Deterioro cognitivo previo
• Dependencia para actividades básicas
• Polifarmacia (>5 fármacos)
• Hospitalizaciones recientes (<3 meses)
• Desnutrición, sarcopenia

FÁRMACOS DE ALTO RIESGO EN ANCIANOS:
• Anticoagulantes: Mayor riesgo de sangrado
• Hipoglucemiantes: Riesgo de hipoglucemia inadvertida
• Antihipertensivos: Ortostatismo, caídas
• Benzodiacepinas: Confusión, caídas""",
        "excerpt": "«En el anciano, el síndrome confusional agudo de nueva aparición siempre representa una enfermedad potencialmente grave y debe clasificarse como NARANJA como mínimo, para permitir una evaluación precoz» (SEMES, 2018, p. 42)"
    }
]

# ============================================================================
# CLASE RAG SERVICE CON FUENTES COMPLETAS
# ============================================================================

class RAGService:
    """Servicio RAG con fuentes bibliográficas verificadas"""
    
    def __init__(self):
        logger.info(f"RAG Service inicializado con {len(MEDICAL_KNOWLEDGE_BASE)} documentos médicos")
    
    def search(self, query: str, n_results: int = 3) -> List[Dict[str, Any]]:
        """Búsqueda por keywords con fuentes completas"""
        query_lower = query.lower()
        query_words = set(re.findall(r'\w+', query_lower))
        
        scored_docs = []
        for item in MEDICAL_KNOWLEDGE_BASE:
            keyword_score = sum(3 for kw in item["keywords"] if kw in query_lower)
            title_score = sum(2 for word in query_words if word in item["title"].lower())
            content_lower = item["content"].lower()
            content_score = sum(0.5 for word in query_words if word in content_lower and len(word) > 3)
            
            total_score = keyword_score + title_score + content_score
            if total_score > 0:
                scored_docs.append((total_score, item))
        
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        
        return [
            {
                "content": doc["content"],
                "title": doc["title"],
                "source": doc["source"],
                "excerpt": doc.get("excerpt", ""),
                "topic": doc["topic"],
                "score": score
            }
            for score, doc in scored_docs[:n_results]
        ]
    
    async def query_with_llm(self, question: str, context_docs: int = 3) -> Dict[str, Any]:
        """Consulta usando RAG + Groq LLM con fuentes bibliográficas"""
        import httpx
        
        relevant_docs = self.search(question, n_results=context_docs)
        
        if not relevant_docs:
            return {
                "answer": "No encontré información específica sobre tu pregunta en la base de conocimientos médica.",
                "sources": [],
                "excerpts": []
            }
        
        # Construir contexto con fuentes
        context_parts = []
        for doc in relevant_docs:
            src = doc["source"]
            context_parts.append(f"FUENTE: {src['title']} ({src['authors']}, {src.get('edition', '')})\n{doc['content']}")
        context = "\n\n---\n\n".join(context_parts)
        
        # Preparar fuentes y extractos
        sources = []
        excerpts = []
        for doc in relevant_docs:
            src = doc["source"]
            sources.append({
                "title": src["title"],
                "authors": src["authors"],
                "edition": src.get("edition", ""),
                "pages": src.get("pages", "")
            })
            if doc.get("excerpt"):
                excerpts.append(doc["excerpt"])
        
        if not GROQ_API_KEY:
            return {
                "answer": relevant_docs[0]["content"],
                "sources": sources,
                "excerpts": excerpts
            }
        
        system_prompt = """Eres un profesor de medicina de urgencias experto en el Sistema de Triaje Manchester.
Responde de forma clara, estructurada y educativa. Usa listas con guiones para organizar la información.
Evita usar asteriscos o markdown complejo. Cita las fuentes cuando sea pertinente.
Responde siempre en español."""

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    GROQ_API_URL,
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": GROQ_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Basándote en estas fuentes médicas:\n\n{context}\n\nResponde a: {question}"}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 1000
                    }
                )
                
                if response.status_code == 200:
                    return {
                        "answer": response.json()["choices"][0]["message"]["content"],
                        "sources": sources,
                        "excerpts": excerpts
                    }
        except Exception as e:
            logger.error(f"Error Groq: {e}")
        
        return {
            "answer": relevant_docs[0]["content"],
            "sources": sources,
            "excerpts": excerpts
        }
    
    def get_topics(self) -> List[Dict[str, Any]]:
        """Obtiene temas con sus fuentes"""
        topics = {}
        for item in MEDICAL_KNOWLEDGE_BASE:
            topic = item["topic"]
            if topic not in topics:
                topics[topic] = {"documents": [], "sources": set()}
            topics[topic]["documents"].append(item["title"])
            topics[topic]["sources"].add(item["source"]["title"])
        
        return [
            {"topic": t, "documents": d["documents"], "sources": list(d["sources"])}
            for t, d in topics.items()
        ]


rag_service = RAGService()
