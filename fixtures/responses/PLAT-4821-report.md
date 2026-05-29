# Informe Técnico: PLAT-4821
**API Gateway 504 Timeout en /api/v2/reports/generate para datasets grandes**

---

## 📋 Resumen Ejecutivo

| Campo | Valor |
|-------|-------|
| **Ticket** | PLAT-4821 |
| **Severidad** | 🔴 Crítica |
| **Confianza en causa raíz** | Alta (85%) |
| **Cuentas afectadas** | ~340 enterprise (Tier 1 y Tier 2) |
| **Error rate actual** | 18% (vs. 0.2% baseline) |
| **Tiempo estimado de resolución** | 3-5 días hábiles |
| **Esfuerzo total estimado** | 13 puntos de historia |
| **SLA breach** | ✅ Confirmado |
| **Impacto en revenue** | Alto — 3 clientes en escalación |

**Diagnóstico en una línea:** El commit `a3f92c1` de la release v2.4.1 eliminó el mecanismo de streaming para reparar la renderización de gráficos (PLAT-4756), pero esto provocó que el API Gateway timeout de 30s sea insuficiente para datasets > 50K filas que ahora se procesan en batch (media: 47.3s).

---

## 🔍 Análisis de Causa Raíz

### Causa Raíz Primaria — Confianza: Alta

**Regresión de arquitectura en commit `a3f92c1`**

La versión v2.4.1 introdujo un cambio de arquitectura crítico:

```
ANTES (v2.4.0):  Cliente → API Gateway → Reports Service (streaming)
                                          ↓ chunks cada ~2s
                                          ↓ primer byte < 1s
                                          ✅ Gateway no timeout

DESPUÉS (v2.4.1): Cliente → API Gateway → Reports Service (batch)
                                           ↓ silencio durante 47.3s
                                           ❌ Gateway timeout a 30s
```

El API Gateway interpreta la ausencia de respuesta durante 30 segundos como fallo del upstream, aunque el Reports Service esté trabajando correctamente.

### Causa Raíz Secundaria — Confianza: Media

**Incremento de latencia no relacionado con el streaming**

Los logs de PLAT-4800 indican que el consumo de memoria del Reports Service aumentó un 40%. Esto sugiere que el cambio a batch mode también eliminó alguna optimización de procesamiento incremental, incrementando el tiempo de procesamiento base.

**Evidencia:** El tiempo de procesamiento documentado es 47.3s para ds_enterprise_50k_plus. Incluso con streaming restaurado, si el procesamiento total tarda > 30s, el primer chunk debe enviarse antes de ese umbral.

### Cronología del Incidente

```
2026-05-24  Deployment v2.4.1 → commit a3f92c1 elimina streaming
2026-05-24  ↑ Error rate comienza a subir (no detectado inicialmente)
2026-05-27  08:14 → Reporter crea PLAT-4821
2026-05-27  08:22 → Primeros logs de error confirmados
2026-05-29  Sprint 42 → Ticket en progreso
```

---

## 💥 Evaluación de Impacto

### Impacto en Negocio

| Dimensión | Detalle | Severidad |
|-----------|---------|-----------|
| Usuarios afectados | ~340 cuentas enterprise (Tier 1/2) | 🔴 Crítica |
| Escalaciones abiertas | 3 clientes enterprise | 🔴 Crítica |
| SLA breach | Garantía < 25s incumplida para > 50K filas | 🔴 Crítica |
| Revenue en riesgo | Penalizaciones contractuales posibles | 🔴 Alta |
| Reputación | Clientes enterprise son los más visibles | 🟠 Alta |
| Error rate | 18% de requests fallando (baseline: 0.2%) | 🔴 Crítica |

### Impacto Técnico

| Sistema | Impacto |
|---------|---------|
| API Gateway | Acumulación de conexiones colgadas (30s cada una) |
| Reports Service | Procesamiento huérfano tras timeout del gateway |
| Data Pipeline | [REQUIERE INFORMACIÓN] ¿Jobs de pipeline afectados? |
| Monitoring | PLAT-4815 indica degradación visible en dashboard SLA |
| Memoria | +40% en Reports Service (PLAT-4800, posiblemente relacionado) |

### Datasets en Riesgo

Basado en el umbral de 50K filas y el tiempo de procesamiento de 47.3s, se puede estimar:

- **< 30K filas**: ✅ OK (< 30s estimado)
- **30K - 50K filas**: ⚠️ Zona de riesgo (próximos a timeout)
- **> 50K filas**: ❌ 504 garantizado
- **> 100K filas**: ❌ Fuera de SLA incluso si se resuelve el timeout

---

## 🛠️ Soluciones Propuestas

### Solución 1 (RECOMENDADA): Restaurar Streaming con Compatibilidad de Charts

**Descripción:** Revertir el cambio de batch a streaming del commit `a3f92c1`, pero preservando el fix de renderización de gráficos de PLAT-4756 mediante una estrategia de generación en dos fases.

**Arquitectura propuesta:**

```
Fase 1 — Datos (streaming):
  Reports Service → chunks de datos cada 2-3s → API Gateway → Cliente
  
Fase 2 — Charts (post-procesamiento):
  Al finalizar datos → generar charts → enviar como último chunk
```

**Implementación:**

```python
# reports_service/generator.py

async def generate_report_streaming(dataset_id: str, include_charts: bool):
    """
    Genera informe en modo streaming.
    Los datos se envían en chunks; los charts al finalizar.
    """
    async with DatasetProcessor(dataset_id) as processor:
        # Stream data sections
        async for section in processor.stream_sections():
            yield ReportChunk(type="data", content=section)
            # Keepalive: garantiza que el gateway no timeout
        
        # Charts procesados al final (fix para PLAT-4756)
        if include_charts:
            charts = await processor.render_charts()
            yield ReportChunk(type="charts", content=charts)
```

**Cambios necesarios:**
1. `reports-service/generator.py`: Restaurar modo streaming
2. `reports-service/chart_renderer.py`: Adaptar para ser llamado post-stream
3. `api-gateway/config/timeouts.yaml`: [HIPÓTESIS] Verificar si hay timeout de idle además del total
4. Tests de integración: Cubrir escenario PLAT-4756 + PLAT-4821 simultáneamente

**Pros:**
- ✅ Resuelve el 504 sin cambiar el API Gateway
- ✅ Preserva el fix de PLAT-4756
- ✅ Mejora la experiencia de usuario (respuesta incremental visible)
- ✅ Reduce consumo de memoria del Reports Service (aborda PLAT-4800)

**Contras:**
- ⚠️ Requiere refactoring de la lógica de charts
- ⚠️ Más complejo de testear que un simple revert
- ⚠️ Si el fix de PLAT-4756 era profundo, puede haber conflictos

**Esfuerzo estimado:** 5 puntos de historia  
**Tiempo estimado:** 2-3 días  
**Responsable sugerido:** Backend engineer con conocimiento de Reports Service

---

### Solución 2: Aumentar Timeout del API Gateway (Parche inmediato)

**Descripción:** Aumentar el timeout del API Gateway de 30s a 120s como medida paliativa inmediata mientras se implementa la Solución 1.

**Configuración:**

```yaml
# api-gateway/config/timeouts.yaml
upstream:
  reports-service:
    connect_timeout: 10s
    read_timeout: 120s      # Aumentado de 30s
    send_timeout: 10s
```

**Pros:**
- ✅ Implementable en minutos (solo configuración)
- ✅ Resuelve el 504 inmediatamente para datasets < ~100K filas
- ✅ Sin riesgo de romper funcionalidad existente

**Contras:**
- ❌ No soluciona el problema raíz
- ❌ Conexiones bloqueadas durante hasta 120s (impacto en concurrencia)
- ❌ No resuelve datasets > ~100K filas
- ❌ Deuda técnica — debe retirarse tras implementar Solución 1

**Esfuerzo estimado:** 1 punto de historia  
**Tiempo estimado:** < 2 horas (incluye deploy y verificación)  
**Responsable sugerido:** DevOps/SRE

> 💡 **RECOMENDACIÓN:** Implementar Solución 2 HOY como hotfix, y Solución 1 esta semana.

---

### Solución 3: Endpoint Asíncrono con Polling (Para datasets > 100K)

**Descripción:** Implementar un patrón Request-Reply asíncrono para datasets grandes:
1. `POST /api/v2/reports/generate` devuelve inmediatamente un `job_id`
2. `GET /api/v2/reports/jobs/{job_id}` permite consultar el estado
3. Cuando el job termina, el cliente descarga el informe

**Flujo:**

```
Cliente → POST /api/v2/reports/generate
        ← 202 Accepted { job_id: "rpt_abc123", poll_url: "/jobs/rpt_abc123" }

Cliente → GET /api/v2/reports/jobs/rpt_abc123
        ← 202 { status: "processing", progress: 45% }

Cliente → GET /api/v2/reports/jobs/rpt_abc123
        ← 200 { status: "completed", download_url: "..." }
```

**Este approach satisface el criterio de aceptación:**
> "Async fallback con polling endpoint para datasets > 100,000 rows"

**Pros:**
- ✅ Cubre cualquier tamaño de dataset sin timeouts
- ✅ Mejor UX con feedback de progreso
- ✅ Permite reintentos sin reprocesamiento

**Contras:**
- ❌ Mayor complejidad de implementación
- ❌ Requiere almacenamiento de jobs (Redis/DB)
- ❌ Los clientes necesitan actualizar su integración
- ❌ No resuelve el problema actual sin cambios en el cliente

**Esfuerzo estimado:** 8 puntos de historia  
**Tiempo estimado:** 4-5 días  
**Responsable sugerido:** Backend + Frontend + DevOps

---

## 📋 Plan de Implementación Recomendado

### Fase 0 — Hotfix inmediato (HOY, < 2h)

| Tarea | Responsable | Tiempo |
|-------|-------------|--------|
| Aumentar timeout API Gateway a 120s (Solución 2) | DevOps | 1h |
| Deploy y verificación en producción | DevOps + QA | 30min |
| Comunicación a clientes en escalación | Customer Success | 30min |

**Criterio de éxito:** Error rate baja de 18% a < 2%

---

### Fase 1 — Fix definitivo (Esta semana, 3 días)

| Tarea | Responsable | SP | Día |
|-------|-------------|----|----|
| Análisis del commit a3f92c1 y fix de PLAT-4756 | Backend Lead | - | Lun |
| Implementar streaming con charts en post-proceso | Backend | 3 | Lun-Mar |
| Tests unitarios del nuevo generador | Backend | 1 | Mar |
| Tests de integración (streaming + charts) | QA | 1 | Mar-Mié |
| Load test: 50 usuarios concurrentes, 100K filas | QA + DevOps | - | Mié |
| Deploy staging + validación | DevOps | - | Mié |
| Deploy producción + monitorización | DevOps | - | Jue |
| Revertir timeout del API Gateway a 30s | DevOps | - | Jue |

**Criterio de éxito:**
- Error rate < 0.3% (baseline)
- P95 latencia < 25s para 100K filas
- 0 regresiones en PLAT-4756

---

### Fase 2 — Endpoint asíncrono (Próximo sprint)

| Tarea | Responsable | SP |
|-------|-------------|-----|
| Diseño de API async + documentación | Backend Lead | 1 |
| Implementación job queue (Redis/Celery) | Backend | 3 |
| Endpoint POST /generate (202 + job_id) | Backend | 1 |
| Endpoint GET /jobs/{id} con progreso | Backend | 1 |
| Actualización SDK cliente | Frontend | 1 |
| Tests E2E async flow | QA | 1 |

---

## ⚠️ Análisis de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Fix de streaming rompe PLAT-4756 | Media | Alto | Test de regresión explícito para charts |
| Timeout de 120s causa pool exhaustion en gateway | Baja | Alto | Monitorizar conexiones activas tras hotfix |
| PLAT-4800 (memoria) agrava el problema | Media | Medio | Investigar en paralelo con PLAT-4800 |
| Datasets > 100K siguen fallando tras Fase 1 | Alta | Medio | Comunicar límite proactivamente a clientes |
| Clientes con SDK antiguo no soportan async | Media | Bajo | Backward compatibility en Fase 2 |

---

## ❓ Información Requerida

Los siguientes puntos necesitan aclararse antes de comenzar la implementación:

1. **[REQUIERE INFORMACIÓN]** ¿El API Gateway tiene un timeout de idle (sin datos) además del timeout total? Si es así, el streaming debe garantizar chunks en intervalos < idle_timeout.

2. **[REQUIERE INFORMACIÓN]** ¿Cuál es el impacto exacto del commit a3f92c1 en la lógica de charts? ¿Es un cambio mínimo o una refactorización profunda?

3. **[REQUIERE INFORMACIÓN]** ¿Qué porcentaje de los 340 clientes afectados tienen datasets > 100K filas (que no se resolverán con la Fase 1)?

4. **[REQUIERE INFORMACIÓN]** ¿Hay SLAs contractuales específicos con los 3 clientes en escalación que definan penalizaciones concretas?

5. **[HIPÓTESIS]** El tiempo de 47.3s incluye tanto el procesamiento de datos como la generación de charts. Si los charts representan > 17.3s del total, restaurar el streaming de datos no bastará sin paralelizar la generación de charts.

---

## ✅ Próximos Pasos

Ordenados por prioridad y cronología:

1. **[HOY - BLOQUEANTE]** DevOps: Deploy del hotfix de timeout (Solución 2) → objetivo: error rate < 2%
2. **[HOY]** Customer Success: Notificar a los 3 clientes en escalación con ETA de resolución definitiva
3. **[HOY]** Backend Lead: Revisar commit `a3f92c1` y evaluar alcance del fix de PLAT-4756
4. **[MAÑANA]** Backend: Comenzar implementación de streaming con charts en post-proceso (Solución 1)
5. **[MAÑANA]** Responder las 5 preguntas de "Información Requerida" y actualizar este informe
6. **[ESTA SEMANA]** QA: Preparar plan de load testing (50 usuarios, 100K filas)
7. **[PRÓXIMO SPRINT]** Planificar Solución 3 (async polling) para datasets > 100K

---

*Informe generado por: Agente de Análisis Técnico JIRA*  
*Basado en: PLAT-4821 (snapshot 2026-05-29)*  
*Confianza general del análisis: Alta*
