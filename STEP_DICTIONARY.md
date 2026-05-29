# 🧩 Step Dictionary

Referencia completa de todos los steps disponibles en CAT.  
Cada step es una pieza de puzzle que puedes combinar para construir cualquier escenario de validación.

> **Convención de syntax:**  
> - `{placeholder}` → texto entre comillas: `"valor"`
> - `{n}` → número sin comillas: `30`
> - `:` al final → requiere un bloque `"""` debajo (doc string) o una tabla `| col |`
> - 📁 → step que carga contenido desde un archivo externo

---

## 📐 GIVEN — Configuración y Contexto

Steps para preparar el escenario antes de invocar al agente.

---

### Adaptador del Agente

#### `Given the agent uses the "{adapter}" adapter`
Selecciona el tipo de adaptador para comunicarse con el agente.

| Adaptador | Uso |
|-----------|-----|
| `http` | Agentes expuestos como API REST / Copilot Extensions |
| `cli` | Agentes invocados por línea de comandos (`gh copilot`, etc.) |
| `mock` | Respuestas simuladas para testing |

```gherkin
Given the agent uses the "http" adapter
```

---

#### `Given the agent endpoint is "{url}"`
Define el endpoint HTTP del agente. Establece automáticamente el adaptador `http`.

```gherkin
Given the agent endpoint is "https://my-agent.com/api/chat"
Given the agent endpoint is "{{AGENT_URL}}"
```

---

#### `Given the agent command is "{command}"`
Define el comando CLI del agente. Establece automáticamente el adaptador `cli`.

```gherkin
Given the agent command is "gh copilot suggest"
Given the agent command is "python agent.py"
```

---

### Autenticación

#### `Given the auth header "{name}" is "{value}"`
Añade un header de autenticación a las peticiones HTTP.

```gherkin
Given the auth header "Authorization" is "Bearer {{API_KEY}}"
Given the auth header "X-Custom-Token" is "my-secret"
```

---

#### `Given the environment variable "{name}" is "{value}"`
Define una variable de entorno para la ejecución del agente.

```gherkin
Given the environment variable "OPENAI_API_KEY" is "sk-..."
```

---

### Timeouts

#### `Given the timeout is {n} milliseconds`
```gherkin
Given the timeout is 30000 milliseconds
```

#### `Given the timeout is {n} seconds`
```gherkin
Given the timeout is 60 seconds
```

---

### Variables

#### `Given the variable "{name}" is "{value}"`
Define una variable que se puede usar con `{{nombre}}` en cualquier step posterior.

```gherkin
Given the variable "lang" is "Python"
When I send the prompt "Generate code in {{lang}}"
```

> Las variables también se pueden pasar desde el CLI: `--var lang=Python`

---

### System Prompt

#### `Given the system prompt is "{text}"`
System prompt inline (una línea).

```gherkin
Given the system prompt is "You are a Kubernetes deployment assistant."
```

#### `Given the system prompt is:`
System prompt multi-línea usando doc string.

```gherkin
Given the system prompt is:
  """
  You are a Kubernetes deployment assistant.
  Only answer questions about Kubernetes.
  Refuse any other topic politely.
  """
```

#### 📁 `Given the system prompt from file "{path}"`
Carga el system prompt desde un archivo externo. **Ideal para system prompts largos.**

```gherkin
Given the system prompt from file "fixtures/prompts/k8s-assistant.txt"
```

---

### Historial de Conversación

#### `Given the previous user message was "{message}"`
Añade un mensaje del usuario al historial.

```gherkin
Given the previous user message was "Help me deploy a Node.js app"
```

#### `Given the previous assistant message was "{message}"`
Añade un mensaje del asistente al historial.

```gherkin
Given the previous assistant message was "Sure! What platform?"
```

#### `Given the conversation history:`
Define el historial completo con una tabla.

```gherkin
Given the conversation history:
  | role      | content                        |
  | user      | I'm working on a Python API    |
  | assistant | Are you using Flask or FastAPI? |
  | user      | FastAPI                        |
```

---

### Mock Configuration

#### `Given the mock responds to "{pattern}" with "{response}"`
Respuesta mock inline. El `pattern` es una regex que se compara con el prompt.

```gherkin
Given the mock responds to "hello|greet" with "Hello! How can I help you?"
Given the mock responds to ".*" with "Default response"
```

#### `Given the mock responds to "{pattern}" with:`
Respuesta mock multi-línea.

```gherkin
Given the mock responds to "generate.*function" with:
  """
  Here's a function:
  ```python
  def hello():
      print("Hello!")
  ```
  """
```

#### 📁 `Given the mock responds to "{pattern}" with file "{path}"`
Carga la respuesta mock desde un archivo. **Perfecto para respuestas largas sin ensuciar el `.feature`.**

```gherkin
Given the mock responds to "explain.*recursion" with file "fixtures/responses/recursion.md"
```

#### `Given the mock has a delay of {n} milliseconds`
Simula latencia de red.

```gherkin
Given the mock has a delay of 500 milliseconds
```

---

### Archivos de Contexto

#### `Given the context includes the file "{path}"`
Añade un archivo al contexto que recibe el agente.

```gherkin
Given the context includes the file "src/main.ts"
Given the context includes the file "{{PROJECT_ROOT}}/config.json"
```

---

## ⚡ WHEN — Invocación del Agente

Steps para enviar un prompt al agente. **Cada escenario debe tener exactamente un step When.**

---

#### `When I send the prompt "{text}"`
Envía un prompt inline.

```gherkin
When I send the prompt "Generate a factorial function in Python"
When I send the prompt "Explain this code: {{code_snippet}}"
```

#### `When I send the prompt:`
Envía un prompt multi-línea.

```gherkin
When I send the prompt:
  """
  Review the following code for security vulnerabilities:
  
  ```python
  def login(username, password):
      query = f"SELECT * FROM users WHERE name='{username}'"
      return db.execute(query)
  ```
  """
```

#### 📁 `When I send the prompt from file "{path}"`
Carga el prompt desde un archivo externo. **Ideal para prompts largos o con código.**

```gherkin
When I send the prompt from file "fixtures/prompts/complex-refactoring.md"
```

#### `When I send an empty prompt`
Para testear edge cases.

```gherkin
When I send an empty prompt
```

---

## ✅ THEN — Aserciones y Validaciones

Steps para verificar la respuesta del agente.

---

### Contenido de Texto

#### `Then the response contains "{text}"`
Verifica que la respuesta contiene el texto (case-insensitive).

```gherkin
Then the response contains "def factorial"
Then the response contains "error handling"
```

#### `Then the response does not contain "{text}"`
Verifica que la respuesta NO contiene el texto.

```gherkin
Then the response does not contain "error"
Then the response does not contain "I don't know"
```

#### `Then the response contains "{text}" case sensitive`
Igual que `contains` pero distingue mayúsculas/minúsculas.

```gherkin
Then the response contains "FastAPI" case sensitive
```

#### `Then the response is not empty`
```gherkin
Then the response is not empty
```

---

### Patrones Regex

#### `Then the response matches the pattern "{regex}"`
Verifica que la respuesta coincide con un patrón regex. 

> **Soporte de Flags:** Admite la notación `/patrón/flags` (por ejemplo `/patrón/i` para búsquedas case-insensitive o `/patrón/m` para multilínea). Si no se rodea con barras inclinadas `/`, se compila como una expresión regular estándar.

```gherkin
# Expresión regular simple
Then the response matches the pattern "def \w+\(.*\):"
Then the response matches the pattern "\d{3}-\d{2}-\d{4}"

# Con flags case-insensitive (/i)
Then the response matches the pattern "/(pros|ventajas|beneficios)/i"
Then the response matches the pattern "/(devops|backend|qa|frontend)/i"
```

#### `Then the response does not match the pattern "{regex}"`
Verifica que la respuesta NO coincide con un patrón regex (también soporta la notación `/patrón/flags`).

```gherkin
Then the response does not match the pattern "TODO|FIXME|HACK"
Then the response does not match the pattern "/(error|fallo|bug|crash)/i"
```

---

### Validación JSON

#### `Then the response is valid JSON`
Verifica que la respuesta se puede parsear como JSON (detecta JSON dentro de bloques ```` ```json ````).

```gherkin
Then the response is valid JSON
```

#### `Then the response matches the JSON schema:`
Valida la respuesta contra un JSON Schema (inline).

```gherkin
Then the response matches the JSON schema:
  """
  {
    "type": "object",
    "required": ["name", "version"],
    "properties": {
      "name": { "type": "string" },
      "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" }
    }
  }
  """
```

#### 📁 `Then the response matches the JSON schema in file "{path}"`
Carga el JSON Schema desde un archivo. **Mejor para schemas complejos.**

```gherkin
Then the response matches the JSON schema in file "fixtures/schemas/project-info.json"
```

---

### Tool Calls

#### `Then the agent called the tool "{name}"`
Verifica que el agente invocó un tool específico.

```gherkin
Then the agent called the tool "search_code"
Then the agent called the tool "read_file"
```

#### `Then the agent called the tool "{name}" with "{key}" equal to "{value}"`
Verifica que el agente invocó un tool con un argumento específico.

```gherkin
Then the agent called the tool "search_code" with "query" equal to "authentication"
Then the agent called the tool "write_file" with "path" equal to "src/index.ts"
```

#### `Then the agent did not call the tool "{name}"`
Verifica que el agente NO usó un tool.

```gherkin
Then the agent did not call the tool "delete_file"
Then the agent did not call the tool "execute_command"
```

#### `Then the agent called {n} tools`
Verifica el número total de tool calls.

```gherkin
Then the agent called 3 tools
Then the agent called 0 tools
```

---

### Estado y Rendimiento

#### `Then the status code is {n}`
Verifica el código HTTP (para HTTP adapter) o exit code (para CLI adapter).

```gherkin
Then the status code is 200
Then the status code is 0
```

#### `Then the response time is less than {n} milliseconds`
Verifica que el agente respondió dentro de un límite de tiempo.

```gherkin
Then the response time is less than 5000 milliseconds
Then the response time is less than 500 milliseconds
```

---

### Longitud de Respuesta

#### `Then the response has at least {n} words`
```gherkin
Then the response has at least 20 words
```

#### `Then the response has at most {n} words`
```gherkin
Then the response has at most 500 words
```

---

### Cambios en Archivos

#### `Then the agent created the file "{path}"`
```gherkin
Then the agent created the file "src/utils.ts"
```

#### `Then the agent modified the file "{path}"`
```gherkin
Then the agent modified the file "package.json"
```

#### `Then the agent did not delete any files`
```gherkin
Then the agent did not delete any files
```

---

### 📁 Comparación con Archivos Externos

#### 📁 `Then the response matches the content of file "{path}"`
Compara la respuesta exactamente con el contenido de un archivo.

```gherkin
Then the response matches the content of file "fixtures/expected/factorial-output.txt"
```

#### 📁 `Then the response contains the content of file "{path}"`
Verifica que la respuesta contiene todo el texto de un archivo.

```gherkin
Then the response contains the content of file "fixtures/expected/required-snippet.txt"
```

---

### 🧠 LLM-as-Judge

Requiere `OPENAI_API_KEY` en el entorno. Modelo configurable con `LLM_JUDGE_MODEL` (default: `gpt-4o`).

#### `Then an LLM judge rates the response above {n} for "{criteria}"`
Evaluación semántica con criterio inline. Score de 0.0 a 1.0.

```gherkin
Then an LLM judge rates the response above 0.8 for "Explains recursion clearly with a code example"
```

#### `Then an LLM judge rates the response above {n} for:`
Evaluación semántica con criterio multi-línea.

```gherkin
Then an LLM judge rates the response above 0.7 for:
  """
  The explanation should:
  1. Distinguish between let and const correctly
  2. Mention block scoping
  3. Include at least one code example
  4. Be suitable for a beginner
  """
```

#### 📁 `Then an LLM judge confirms the response is semantically equivalent to file "{path}"`
Compara semánticamente la respuesta del agente con un archivo de referencia (fixture) ignorando el formato, diferencias de espacio o palabras accesorias.

```gherkin
Then an LLM judge confirms the response is semantically equivalent to file "fixtures/expected/payment-strategy.md"
```

---

## 📁 Estrategia de Archivos Externos

Para mantener los `.feature` limpios y legibles, externaliza contenido grande a archivos:

```
features/
├── code-assistant.feature          ← limpio y legible
├── tool-safety.feature
fixtures/
├── prompts/
│   ├── complex-refactoring.md      ← prompts largos
│   └── code-review-request.md
├── responses/
│   ├── expected-factorial.py       ← respuestas esperadas
│   └── recursion-explanation.md
├── schemas/
│   └── project-info.json           ← JSON schemas complejos
└── system-prompts/
    ├── k8s-assistant.txt           ← system prompts
    └── code-reviewer.txt
```

### Ejemplo completo con archivos externos

```gherkin
Feature: Agent with External Fixtures

  Background:
    Given the agent endpoint is "{{AGENT_URL}}"
    Given the system prompt from file "fixtures/system-prompts/code-reviewer.txt"

  Scenario: Reviews code from file
    When I send the prompt from file "fixtures/prompts/code-review-request.md"
    Then the response is not empty
    And the response has at least 50 words
    And the response contains the content of file "fixtures/expected/must-mention.txt"
    And the response matches the JSON schema in file "fixtures/schemas/review-output.json"
```

**Resultado**: El `.feature` tiene 8 líneas limpias. Todo el contenido pesado vive en `fixtures/`.

---

## 🔧 Crear Steps Custom

Si necesitas un step que no existe, créalo en un archivo TypeScript:

```typescript
// steps/custom-steps.ts
import { Given, When, Then } from "../src/gherkin/step-registry.js";

Then(
  "the response is a bullet list",
  (ctx) => {
    const lines = ctx.response!.text.split("\n").filter(l => l.trim());
    const passed = lines.every(l => /^[\-\*•]/.test(l.trim()));
    ctx.results.push({
      evaluator: "bullet-list",
      label: "response is a bullet list",
      passed,
      message: passed ? "✓ Is a bullet list" : "✗ Not a bullet list",
    });
  },
  "Assert the response is formatted as a bullet list"
);
```

Patrón de los placeholders:
- `{name}` → captura texto entre comillas: `"valor"` → `args[0] = "valor"`
- `{n}` → captura un número: `42` → `args[0] = "42"` (parsear con `parseInt`)

---

## 📋 Resumen Rápido

| Categoría | Steps | Ejemplo |
|-----------|-------|---------|
| **Adapter** | 3 | `Given the agent uses the "http" adapter` |
| **Auth** | 2 | `Given the auth header "Authorization" is "Bearer ..."` |
| **Config** | 3 | `Given the timeout is 30 seconds` |
| **System Prompt** | 3 | `Given the system prompt from file "prompt.txt"` |
| **History** | 3 | `Given the previous user message was "..."` |
| **Mock** | 4 | `Given the mock responds to ".*" with file "resp.md"` |
| **Context** | 1 | `Given the context includes the file "src/main.ts"` |
| **Prompt** | 4 | `When I send the prompt from file "prompt.md"` |
| **Text** | 4 | `Then the response contains "expected"` |
| **Regex** | 2 | `Then the response matches the pattern "def \w+"` |
| **JSON** | 3 | `Then the response matches the JSON schema in file "s.json"` |
| **Tools** | 4 | `Then the agent called the tool "search_code"` |
| **Status** | 2 | `Then the status code is 200` |
| **Length** | 3 | `Then the response has at least 20 words` |
| **Files** | 5 | `Then the response matches the content of file "exp.txt"` |
| **LLM Judge** | 3 | `Then an LLM judge rates the response above 0.8 for "..."` |
| **Total** | **48** | |
