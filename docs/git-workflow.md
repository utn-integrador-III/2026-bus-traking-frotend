# Flujo de ramas Git — canonical

> **Fuente única de verdad del flujo de integración del repo.** Las instrucciones de IA (`CLAUDE.md` / `AGENTS.md` / etc.) resumen las reglas duras; este doc cubre el detalle operativo, cómo extender los prefijos, qué hace el enforcement y cuándo (si alguna vez) se permite saltarse el flujo.

## TL;DR

```
feature/* | fix/* | chore/* | refactor/* | docs/* | test/*
        │
        └── PR ──▶ dev ── PR ──▶ qa ── PR ──▶ main
                                                 ▲
              hotfix/* ── PR ─────────────────────┘
                   │
                   └── back-merge (main → qa → dev) mismo día
```

- **Ramas largas (protegidas)**: `main`, `qa`, `dev`.
- **Ramas cortas (de trabajo)**: cualquier `<prefijo>/us<NN>-<dueño>` listada abajo.
- **Toda integración a `main` pasa por `qa`**, y todo a `qa` pasa por `dev`.
- **Excepción única**: `hotfix/*` puede ir directo a `main`; obliga back-merge inmediato a `qa` y `dev`.
- **Commit directo a `main`/`qa`/`dev` está prohibido**. Siempre PR desde rama corta.

## Convención de nombres (regla dura del equipo)

Cada tarea proviene de una **historia de usuario (US)**. Por eso el nombre de la rama corta
—y por extensión el **encabezado/título del PR**— debe seguir:

```
<prefijo>/us<NN>-<dueño>
```

- `<prefijo>` — uno de los prefijos válidos (ver tabla).
- `us<NN>` — identificador de la historia de usuario, en minúsculas y sin espacios (`us01`, `us11`, `us00a`).
- `<dueño>` — nombre del dev responsable de la tarea (ej. `Alex`, `Samiel`).

**Ejemplo del estándar**: `feature/us11-Alex`.

> **Si no se conoce el número de la US o el nombre del dueño, hay que preguntar antes de
> crear la rama o abrir el PR** — nunca inventarlos.

**Prefijos válidos hoy** (extensible — ver §"Cómo añadir un prefijo nuevo"):

| Prefijo | Propósito | Flujo |
|---|---|---|
| `feature/*` | Capacidad nueva, feature de UI/UX, endpoint nuevo | `dev → qa → main` |
| `fix/*` | Bug fix sin urgencia (puede esperar el ciclo qa) | `dev → qa → main` |
| `chore/*` | Mantenimiento: deps bump, CI, tooling, scripts no productivos | `dev → qa → main` |
| `refactor/*` | Reorganización interna sin cambio funcional observable | `dev → qa → main` |
| `docs/*` | Cambios solo en `.md` / documentación / comentarios externos | `dev → qa → main` |
| `test/*` | Suite nueva, fixtures, harness, e2e (sin tocar código productivo) | `dev → qa → main` |
| `hotfix/*` | Bug urgente en producción que no puede esperar qa | `main` directo + back-merge a `qa` y `dev` |

**Ejemplos válidos**:
- `feature/us11-Alex`
- `fix/us03-Samiel`
- `chore/us00c-Alex`
- `docs/us01-Maria`
- `test/us02-Luis`
- `hotfix/us19-Alex`

**Ejemplos inválidos** (no usar):
- `feature/UI-export` (sin `us<NN>`, descripción libre)
- `feature/us11` (falta el dueño)
- `us11-Alex` (sin prefijo)
- `feat/us11-Alex` (prefijo `feat` no está en la lista — usa `feature`)
- `feature/us 11-Alex` (espacios)

> Nota: el `<dueño>` se escribe tal cual el nombre del dev (ej. `Alex`). El resto del nombre de
> rama va en minúsculas. El identificador `us<NN>` siempre en minúsculas.

## Reglas duras

1. **`main` solo recibe de `qa` o `hotfix/*`**. Cualquier otro PR a `main` se rechaza.
2. **`qa` solo recibe de `dev`**. Cualquier otro PR a `qa` se rechaza.
3. **`dev` recibe de cualquier rama corta válida** (`feature|fix|chore|refactor|docs|test/*`).
4. **Commit directo en ramas largas está prohibido**. Si necesitas tocar `main`/`qa`/`dev`, crea una rama corta — incluso para un typo.
5. **El nombre de rama / título de PR sigue `<prefijo>/us<NN>-<dueño>`**. Si falta la US o el dueño, preguntar.
6. **`hotfix/*` requiere back-merge en el mismo día**. Orden obligatorio: `main` → `qa` → `dev` (siempre desde la posterior hacia la anterior para no introducir conflictos).
7. **Las ramas cortas se crean desde `dev` actualizado** (`git checkout dev && git pull && git checkout -b feature/usNN-dueño`). Excepción: `hotfix/*` se crea desde `main` actualizado.
8. **PRs requieren CI verde** antes de mergear (typecheck + lint + build mínimo).

## Workflow paso a paso

### Caso normal (`feature` / `fix` / `chore` / `refactor` / `docs` / `test`)

```bash
git checkout dev
git pull origin dev
git checkout -b feature/us11-Alex

# trabajo + commits con mensaje convencional (feat:/fix:/chore:/...)
git push origin feature/us11-Alex

# crear PR feature/us11-Alex → dev en GitHub (título con el mismo formato)
# tras review + CI verde → merge a dev
# tras validación en dev → PR dev → qa → merge
# tras validación QA → PR qa → main → merge
```

### Caso hotfix

```bash
git checkout main
git pull origin main
git checkout -b hotfix/us19-Alex

# fix + commits
git push origin hotfix/us19-Alex

# PR hotfix/us19-Alex → main → merge urgente
# inmediatamente después:
git checkout main && git pull origin main
git checkout qa && git pull origin qa && git merge main && git push origin qa
git checkout dev && git pull origin dev && git merge main && git push origin dev
```

El back-merge se hace **el mismo día**. Si no es posible (fin de semana, oncall ausente), documentar en el PR de hotfix con fecha límite del back-merge.

## Enforcement

Tres capas, ninguna sustituye a la otra:

1. **Instrucciones de IA** (`CLAUDE.md` / `AGENTS.md` / `.cursor/rules` / copilot-instructions) — resumen de las reglas duras; cualquier agente lo carga cada sesión y rebota un commit directo a rama larga antes de ejecutarlo.
2. **Este doc** (`docs/git-workflow.md`) — alcance operativo completo.
3. **Husky pre-push** (`.husky/pre-push`) — gate local. Bloquea `git push` a `main`/`qa`/`dev` desde ramas que no sean la contraparte de la rama larga (caso fast-forward de upstream) o `hotfix/*` hacia `main`. Además **avisa** si el nombre de rama no sigue `<prefijo>/us<NN>-<dueño>`. Bypaseable con `--no-verify` (consciente, prohibido salvo aprobación explícita del dueño del producto).

**Si no hay branch protection en GitHub** — los push directos al remoto no se rechazan server-side. Para endurecer, ver §"Follow-ups opcionales".

## Cómo añadir un prefijo nuevo

Editar dos lugares + (opcional) un tercero:

1. **`docs/git-workflow.md`** (este archivo) — añadir fila a la tabla §"Prefijos válidos hoy" con propósito y flujo (default: igual que `feature/*`).
2. **`.husky/pre-push`** — añadir el prefijo al patrón de validación de nombre y al allowlist de ramas cortas. Si el flujo del prefijo nuevo difiere del default (ej. `release/*` → `main` directo), añadir branch específica.
3. **Instrucciones de IA** — solo si el flujo de merge del prefijo nuevo es distinto al default `dev → qa → main`.

## Cuándo saltarse la regla

Nunca silenciosamente. `--no-verify` bypassea el pre-push local pero:

- Requiere aprobación explícita previa del dueño del producto.
- El commit/PR debe documentar la razón.
- Es trazable: el log de hooks no se ejecuta pero el push queda en el historial.

## Follow-ups opcionales (no aplicados por defecto)

Si en algún momento se decide endurecer el flujo:

- **GitHub branch protection rules** (Settings → Branches) para `main`/`qa`/`dev`: require PR + status checks (typecheck + lint + build) + 1 reviewer mínimo + no force-push + no deletion. Refuerza server-side lo que hoy solo enforza el hook local.
- **CI triggers en `dev` y `qa`**: añadir `push: { branches: [main, dev, qa] }` para que build/tests corran al integrar. Por defecto solo dispara en `push: main` + PRs.
- **`release/*` branches** si surge necesidad de freezing por versión: flujo distinto (`release/*` → `main` directo + tag de versión).
- **Commit-msg hook con Conventional Commits**: enforzar `feat:` / `fix:` / `chore:` / etc. en el primer carácter del mensaje.
