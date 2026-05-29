# 🎯 Estrategia de Calidad y Plan de Pruebas: Payment Splitter

Este documento define el enfoque de aseguramiento de calidad (QA) para la funcionalidad de **División de Gastos Compartidos (Payment Splitter)**, asegurando la robustez del sistema financiero y la consistencia matemática de las operaciones.

---

## 📊 1. Matriz de Estrategia Multinivel

| Nivel de Prueba | Alcance del Test | Herramienta Propuesta | Automatizado |
|-----------------|------------------|----------------------|--------------|
| **Unitarias** | Algoritmo de redondeo, suma de porcentajes, validaciones numéricas básicas | Jest / Vitest | Sí (100%) |
| **Integración** | API REST (POST `/groups`, POST `/expenses`), persistencia de transacciones | Supertest / Playwright | Sí (90%) |
| **E2E** | Flujo completo: Crear grupo → Añadir amigos → Registrar gasto → Validar saldos | Playwright | Sí (80%) |
| **Carga** | Concurrencia de 50 usuarios dividiendo gastos simultáneamente | k6 | Sí |
| **Seguridad** | Intentar alterar el balance o acceder a grupos ajenos | OWASP ZAP | Manual/Semi |

---

## 🧪 2. Casos de Prueba Críticos

### TC-01: Happy Path - División Equitativa Exacta
* **Prioridad:** Alta (P1)
* **Precondición:** Grupo de 4 miembros creado.
* **Acción:** Registrar gasto de 100.00€ con división equitativa.
* **Resultado Esperado:** 
  - El balance de cada uno de los 3 invitados disminuye en 25.00€.
  - El balance del creador incrementa en 75.00€.
  - Suma total de saldos = 0.00€.

### TC-02: Esquina Crítica - División Equitativa con Residuo (El "Problema de los Céntimos")
* **Prioridad:** Crítica (P0)
* **Precondición:** Grupo de 3 miembros. El usuario A registra el gasto.
* **Acción:** Registrar gasto de 10.00€ con división equitativa (10 / 3 = 3.3333...).
* **Resultado Esperado:**
  - Dos participantes deben 3.33€ cada uno.
  - El tercer participante (o el creador) se le asigna 3.34€ para completar los 10.00€ exactos.
  - La transacción cuadra perfectamente sin céntimos flotantes en el sistema financiero.

### TC-03: Caso Negativo - División Porcentual Inválida
* **Prioridad:** Alta (P1)
* **Precondición:** Grupo de 2 personas.
* **Acción:** Intentar registrar gasto dividiendo 60% y 50% (Suma = 110%).
* **Resultado Esperado:**
  - Error HTTP 400 Bad Request.
  - Mensaje de validación: "La suma de los porcentajes debe ser exactamente 100%".

---

## 🥒 3. Especificaciones BDD (Gherkin)

Aquí se definen los criterios de aceptación listos para Cucumber/Playwright:

```gherkin
Feature: División de Gastos Compartidos

  Scenario Outline: Ajuste correcto de residuo en división equitativa
    Given un grupo con <participantes> miembros donde "User A" es el creador
    When "User A" registra un gasto de <total> euros distribuido equitativamente
    Then la suma total de las deudas calculadas es exactamente <total> euros
    And la diferencia máxima entre las deudas individuales es de 0.01 euros

    Examples:
      | participantes | total | deudas_esperadas        |
      | 3             | 10.00 | 3.33 + 3.33 + 3.34      |
      | 6             | 50.00 | 8.33 * 5 + 8.35 * 1     |
```

---

## 🔍 4. Gaps y Ambigüedades en Requisitos (Product Feedback)

Tras analizar los requisitos del negocio, se han identificado las siguientes contradicciones o lagunas que requieren confirmación de Product Ownership:

1. **[GAPS] Algoritmo de asignación del residuo centesimal:**
   - La historia dice: *"se le asigna de manera aleatoria al creador o se ajusta para que cuadre"*. En sistemas contables, la **aleatoriedad** es inaceptable porque dificulta la auditabilidad. 
   - **Propuesta QA:** El residuo de céntimos debe asignarse siempre sistemáticamente al participante de mayor ID, o en su defecto, al creador del gasto de forma determinista.

2. **[GAPS] Control de concurrencia y notificaciones push:**
   - Si dos usuarios registran gastos simultáneamente en el mismo grupo, ¿cómo se mitigan las condiciones de carrera (race conditions) en el cálculo del balance final?
   - Si la notificación push falla, ¿existe un fallback por email o se registra un log silencioso?

3. **[HIPÓTESIS] Salida del grupo con balance positivo:**
   - La regla indica que un usuario con deuda (balance negativo) no puede abandonar el grupo. Sin embargo, no especifica qué ocurre si tiene saldo a favor (balance positivo). ¿Debe poder salir del grupo perdiendo ese saldo, o el sistema debe forzar una transferencia de liquidación primero?

---

## 🛠️ 5. Próximos Pasos Priorizados

1. **[BLOQUEANTE]** Definir la regla exacta y determinista de redondeo con el Product Owner (eliminando el comportamiento aleatorio).
2. **[MAÑANA]** Escribir tests unitarios en Jest para el módulo del redondeo financiero (`rounding.utils.spec.ts`).
3. **[ESTA SEMANA]** Configurar tests de integración de API con Supertest para verificar las respuestas `400 Bad Request` en divisiones incorrectas.
