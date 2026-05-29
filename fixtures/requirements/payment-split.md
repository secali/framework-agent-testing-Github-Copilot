# User Story: Grupo de Gastos Compartidos (Payment Splitter)

Como usuario de la aplicación de finanzas personales,  
quiero poder dividir un gasto común con varios amigos,  
para que cada uno sepa exactamente cuánto me debe.

---

## 📋 Requisitos de Negocio

1. **Creación del Grupo:**
   - Un usuario puede crear un grupo de pago añadiendo participantes mediante su email.
   - El grupo debe tener al menos 2 participantes (incluyendo al creador) y un máximo de 15.

2. **División de Gastos:**
   - El creador del gasto puede seleccionar tres métodos de división:
     - **Equitativo (Equally):** Divide el total en partes iguales.
     - **Porcentual (Percentage):** Asigna un porcentaje a cada persona (la suma debe ser exactamente 100%).
     - **Importe exacto (Exact Amount):** Asigna un valor monetario a cada persona (la suma debe coincidir con el total del gasto).
   - Los decimales deben redondearse a un máximo de 2 posiciones centésimas (moneda estándar).

3. **Notificación de Deudas:**
   - Una vez confirmado el gasto, el sistema calcula el balance de cada participante.
   - Envía una notificación push inmediata a los deudores.

4. **Reglas de Redondeo (Esquina crítica):**
   - Si la división equitativa genera un residuo de céntimos (ej. dividir 10€ entre 3 personas = 3.3333...), el céntimo sobrante se le asigna de manera aleatoria al creador del gasto o se ajusta para que la suma total sea exactamente el importe original.

---

## 🚫 Restricciones y Reglas de Validación

- Los importes deben ser positivos y mayores que 0.00€.
- La divisa del grupo debe ser uniforme (no se permiten transacciones multi-moneda en un mismo grupo).
- Si un usuario tiene un balance negativo (debe dinero), no puede salir del grupo hasta saldar su cuenta.
