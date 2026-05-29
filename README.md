# 🐱 CAT — Copilot Agent Testing

Framework BDD de automatización de pruebas para agentes de GitHub Copilot y agentes de IA en general.

**Objetivo:** Verificar que un agente hace lo que dice que debe hacer — sin escribir código.

## Filosofía

CAT usa un enfoque **low-code con Gherkin** (Given/When/Then). Viene con una librería de **48 steps pre-construidos** que encajan como piezas de puzzle para componer cualquier escenario de validación:

```gherkin
Feature: Mi Agente de Código
  
  Scenario: Genera funciones Python correctamente
    Given the agent endpoint is "https://my-agent.com/api"
    When I send the prompt "Genera una función factorial en Python"
    Then the response contains "def factorial"
    And the response matches the pattern "def factorial\(n\)"
    And the response does not contain "error"
    And the response is not empty
```

**Cero código necesario** para la mayoría de escenarios. Solo escribes `.feature` files.

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Ver todos los steps disponibles
npx tsx src/index.ts list-steps

# Ejecutar todas las features
npx tsx src/index.ts run

# Ejecutar una feature específica
npx tsx src/index.ts run -f features/code-assistant.feature

# Filtrar por tags
npx tsx src/index.ts run -t smoke,basic

# Con variables de entorno
npx tsx src/index.ts run --var AGENT_URL=https://mi-agente.com --var API_KEY=secret

# Generar reporte visual interactivo en HTML
npx tsx src/index.ts run --html results/report.html

# Listar escenarios
npx tsx src/index.ts list

# Validar syntax sin ejecutar
npx tsx src/index.ts validate
```

## Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│                    CLI  (cat run)                         │
├──────────────────────────────────────────────────────────┤
│              Gherkin Parser + Runner                      │
│  ┌────────────────────────────────────────────────────┐   │
│  │          Built-in Step Library (48 steps)          │   │
│  │                                                    │   │
│  │  GIVEN               WHEN              THEN        │   │
│  │  ├ adapter config    ├ send prompt     ├ contains  │   │
│  │  ├ endpoint          ├ send prompt:    ├ regex     │   │
│  │  ├ auth headers      └ empty prompt    ├ JSON      │   │
│  │  ├ timeouts                            ├ tools     │   │
│  │  ├ system prompt                       ├ status    │   │
│  │  ├ history                             ├ time      │   │
│  │  ├ mock config                         ├ words     │   │
│  │  └ variables                           ├ files     │   │
│  │                                        └ LLM judge │   │
│  └────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│           Adapters              Reporters                 │
│       HTTP │ CLI │ Mock      Console │ JSON │ HTML        │
└──────────────────────────────────────────────────────────┘
```

## Steps Disponibles

### GIVEN — Configuración

| Step | Descripción |
|------|-------------|
| `Given the agent uses the "{adapter}" adapter` | Seleccionar adaptador (http, cli, mock) |
| `Given the agent endpoint is "{url}"` | Endpoint HTTP del agente |
| `Given the agent command is "{cmd}"` | Comando CLI del agente |
| `Given the auth header "{name}" is "{value}"` | Header de autenticación |
| `Given the timeout is {n} seconds` | Timeout en segundos |
| `Given the timeout is {n} milliseconds` | Timeout en milisegundos |
| `Given the variable "{name}" is "{value}"` | Variable para `{{interpolación}}` |
| `Given the system prompt is "{text}"` | System prompt inline |
| `Given the system prompt is:` + `"""` | System prompt multi-línea |
| `Given the previous user message was "{msg}"` | Añadir mensaje user al historial |
| `Given the previous assistant message was "{msg}"` | Añadir mensaje assistant al historial |
| `Given the conversation history:` + tabla | Historial completo desde tabla |
| `Given the mock responds to "{pattern}" with "{response}"` | Respuesta mock inline |
| `Given the mock responds to "{pattern}" with:` + `"""` | Respuesta mock multi-línea |
| `Given the mock has a delay of {n} milliseconds` | Latencia simulada |
| `Given the context includes the file "{path}"` | Archivo de contexto |
| `Given the environment variable "{name}" is "{value}"` | Variable de entorno |

### WHEN — Invocación del Agente

| Step | Descripción |
|------|-------------|
| `When I send the prompt "{text}"` | Enviar prompt inline |
| `When I send the prompt:` + `"""` | Enviar prompt multi-línea |
| `When I send an empty prompt` | Prompt vacío (edge case) |

### THEN — Aserciones

| Step | Descripción |
|------|-------------|
| `Then the response contains "{text}"` | Contiene texto (case-insensitive) |
| `Then the response does not contain "{text}"` | NO contiene texto |
| `Then the response contains "{text}" case sensitive` | Contiene texto (exacto) |
| `Then the response matches the pattern "{regex}"` | Coincide con regex |
| `Then the response does not match the pattern "{regex}"` | NO coincide con regex |
| `Then the response is valid JSON` | Es JSON válido |
| `Then the response matches the JSON schema:` + `"""` | Valida contra JSON Schema |
| `Then the agent called the tool "{name}"` | El agente usó un tool |
| `Then the agent called the tool "{name}" with "{key}" equal to "{value}"` | Tool con argumento específico |
| `Then the agent did not call the tool "{name}"` | El agente NO usó un tool |
| `Then the agent called {n} tools` | Número exacto de tool calls |
| `Then the status code is {n}` | Código HTTP o exit code |
| `Then the response time is less than {n} milliseconds` | Tiempo de respuesta |
| `Then the response has at least {n} words` | Mínimo de palabras |
| `Then the response has at most {n} words` | Máximo de palabras |
| `Then the response is not empty` | No está vacía |
| `Then the agent created the file "{path}"` | El agente creó un archivo |
| `Then the agent modified the file "{path}"` | El agente modificó un archivo |
| `Then the agent did not delete any files` | No eliminó archivos |
| `Then an LLM judge rates the response above {n} for "{criteria}"` | Evaluación semántica con LLM |
| `Then an LLM judge rates the response above {n} for:` + `"""` | Evaluación semántica (multi-línea) |
| `Then an LLM judge confirms the response is semantically equivalent to file "{path}"` | Equivalencia semántica (ignora formato) |

## Features de Gherkin Soportadas

### Background (setup compartido)
```gherkin
Feature: Mi Feature

  Background:
    Given the agent endpoint is "https://my-api.com/chat"
    And the auth header "Authorization" is "Bearer {{API_KEY}}"
    And the timeout is 30 seconds

  Scenario: Test 1
    When I send the prompt "hello"
    Then the response is not empty
```

### Scenario Outline (tests parametrizados)
```gherkin
Scenario Outline: Responde a preguntas sobre <topic>
  Given the mock responds to ".*" with "<response>"
  When I send the prompt "<prompt>"
  Then the response contains "<keyword>"

  Examples:
    | topic      | prompt             | response            | keyword   |
    | greeting   | Hello!             | Hi there!           | hi        |
    | capability | What can you do?   | I can write code.   | code      |
```

### Multi-turn conversations
```gherkin
Scenario: Recuerda el contexto
  Given the previous user message was "I'm using Python"
  And the previous assistant message was "Great! What framework?"
  When I send the prompt "I'm using FastAPI"
  Then the response contains "FastAPI"
```

### Tags y filtrado
```gherkin
@smoke @critical
Scenario: Test importante
  When I send the prompt "test"
  Then the response is not empty
```
```bash
npx tsx src/index.ts run -t smoke
```

### Variables e interpolación
```gherkin
Given the variable "lang" is "Python"
When I send the prompt "Generate code in {{lang}}"
```
```bash
npx tsx src/index.ts run --var API_KEY=abc123
```

## Extensibilidad

### Añadir un step custom (sin tocar el framework)

Crea un archivo `steps/custom-steps.ts` e impórtalo:

```typescript
import { Given, When, Then } from "../src/gherkin/step-registry.js";

// Step custom: verificar que la respuesta tiene formato de lista
Then(
  "the response is a numbered list",
  (ctx) => {
    const lines = ctx.response!.text.split("\n").filter(Boolean);
    const passed = lines.every((line, i) => line.startsWith(`${i + 1}.`));
    ctx.results.push({
      evaluator: "numbered-list",
      label: "response is a numbered list",
      passed,
      message: passed ? "✓ Response is a numbered list" : "✗ Response is NOT a numbered list",
    });
  },
  "Assert the response is formatted as a numbered list"
);

// Step custom: verificar longitud de código generado
Then(
  "the generated code has at least {n} lines",
  (ctx, [n]) => {
    const codeMatch = ctx.response!.text.match(/```[\s\S]*?\n([\s\S]*?)```/);
    const codeLines = codeMatch ? codeMatch[1].split("\n").filter(Boolean).length : 0;
    const min = parseInt(n);
    const passed = codeLines >= min;
    ctx.results.push({
      evaluator: "code-lines",
      label: `generated code ≥ ${min} lines`,
      passed,
      message: passed
        ? `✓ Code has ${codeLines} lines (≥ ${min})`
        : `✗ Code has ${codeLines} lines, expected ≥ ${min}`,
    });
  },
  "Assert minimum lines of generated code"
);
```

### Añadir un adaptador custom

```typescript
import { registerAdapter } from "../src/adapters/index.js";

registerAdapter("websocket", () => ({
  name: "websocket",
  async invoke(prompt, context, config) {
    // Tu lógica WebSocket aquí
    return { text: "...", toolCalls: [], fileChanges: [], statusCode: 0, durationMs: 0, raw: {} };
  },
}));
```

## Estructura del Proyecto

```
fw-agent-testing/
├── src/
│   ├── index.ts                  # CLI entry point
│   ├── types.ts                  # Core types
│   ├── loader.ts                 # YAML suite loader (legacy)
│   ├── runner.ts                 # YAML suite runner (legacy)
│   ├── gherkin/                  # ★ Gherkin BDD engine
│   │   ├── parser.ts            #   .feature file parser
│   │   ├── types.ts             #   Gherkin AST types
│   │   ├── context.ts           #   Scenario execution context
│   │   ├── step-registry.ts     #   Step matching engine
│   │   ├── built-in-steps.ts    #   ★ 41 pre-built steps
│   │   ├── runner.ts            #   Feature runner
│   │   └── index.ts             #   Public API
│   ├── adapters/                 # Agent adapters
│   │   ├── http.adapter.ts      #   HTTP/REST
│   │   ├── cli.adapter.ts       #   CLI commands
│   │   └── mock.adapter.ts      #   Mock (testing)
│   ├── evaluators/               # Evaluator plugins (YAML mode)
│   └── reporters/
│       ├── console.reporter.ts  #   Terminal output
│       └── json.reporter.ts     #   JSON report
├── features/                     # ★ Test features (Gherkin)
│   ├── code-assistant.feature
│   ├── conversations.feature
│   ├── tool-safety.feature
│   └── http-agent.feature
├── suites/                       # YAML suites (alternative)
└── package.json
```

## 💻 Pruebas en Entornos Locales (VS Code)

Si estás desarrollando tu **GitHub Copilot Agent** localmente en VS Code (ej. Express, NestJS, FastAPI), el framework CAT puede conectarse directamente con él. Además, CAT soporta **Server-Sent Events (SSE / streaming de texto)** de manera nativa para simular interacciones reales de chat.

### Paso 1: Configurar el Servidor del Agente en local
Para desarrollo local, tu agente suele ejecutarse en un puerto como `http://localhost:3000`. Al no pasar las peticiones por los servidores de GitHub, te recomendamos **desactivar la verificación de firmas criptográficas** en tu entorno local para evitar errores de autenticación `401 Unauthorized`.

*Ejemplo en Express (Node.js):*
```typescript
if (process.env.NODE_ENV !== 'development') {
  // Aplicar middleware de verificación de firmas de GitHub en producción
  app.post('/api/copilot', verifyGithubSignature, copilotHandler);
} else {
  // Omitir middleware en local
  app.post('/api/copilot', copilotHandler);
}
```

### Paso 2: Ejecutar las pruebas localmente

#### Opción A: Conexión Directa Local
Si el servidor no requiere HTTPS, apunta el endpoint directamente a tu localhost:
```bash
npx tsx src/index.ts run -f features/mi-agente.feature \
  --var AGENT_URL=http://localhost:3000/api/copilot \
  --var API_KEY=local-dummy-token
```

#### Opción B: Usar VS Code Dev Tunnels (Simular llamadas HTTPS reales)
Si tu agente requiere obligatoriamente HTTPS para integrarse con los Developer Settings de GitHub:
1. En VS Code, ve a la pestaña **Ports** (Puertos) del panel inferior.
2. Haz clic en **Forward a Port** y añade el puerto de tu agente (ej: `3000`).
3. En la columna *Port Visibility*, haz clic derecho y cámbiala a **Public**.
4. Copia la dirección HTTPS generada (ej. `https://xxxx-3000.app.online.visualstudio.com/api/copilot`).
5. Genera un Personal Access Token (PAT) en GitHub para usar como tu `API_KEY`.
6. Ejecuta el comando:
   ```bash
   npx tsx src/index.ts run -f features/mi-agente.feature \
     --var AGENT_URL=https://xxxx-3000.app.online.visualstudio.com/api/copilot \
     --var API_KEY=ghp_tu_token_de_github
   ```

#### Opción C: Usando variables de entorno locales (`.env`)
Para no escribir las variables en cada comando, crea un archivo `.env` en la raíz de tu proyecto:
```env
AGENT_URL=http://localhost:3000/api/copilot
API_KEY=dev-bypass-key
```
El runner cargará automáticamente estas variables y podrás ejecutar las pruebas con simplemente:
```bash
npx tsx src/index.ts run -f features/mi-agente.feature
```

---

## CI/CD

```yaml
# GitHub Actions
- name: Test Copilot Agent
  run: |
    npm ci
    npx tsx src/index.ts run \
      -p "features/**/*.feature" \
      --var AGENT_URL=${{ secrets.AGENT_URL }} \
      --var API_KEY=${{ secrets.API_KEY }} \
      -o results/report.json
```

Exit code `0` = todo OK, `1` = fallos, `2` = error de configuración.
