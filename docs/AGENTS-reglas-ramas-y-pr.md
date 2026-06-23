# Reglas de ramas y PR para agentes de IA (Claude Code / Copilot / Cursor / etc.)

> Pega este bloque (o linkéalo) dentro de tu archivo de instrucciones de IA — `CLAUDE.md`, `.cursor/rules`, `.github/copilot-instructions.md`, `AGENTS.md` — para que cualquier agente respete el flujo de integración del repo. El detalle operativo completo vive en [`git-workflow.md`](./git-workflow.md).

## Restricción dura — Flujo de ramas Git fijo

> Esta regla es **dura**. Un agente NUNCA debe proponer ni ejecutar un commit/push que la viole.

**Toda integración a `main` pasa por `dev` → `qa` → `main`.**

```
feature/* | fix/* | chore/* | refactor/* | docs/* | test/*
        │
        └── PR ──▶ dev ── PR ──▶ qa ── PR ──▶ main
                                                 ▲
              hotfix/* ── PR ─────────────────────┘
                   │
                   └── back-merge (main → qa → dev) el mismo día
```

- **Ramas largas (protegidas)**: `main`, `qa`, `dev`. **Commit directo prohibido.**
- **Ramas cortas (de trabajo)**: `<prefijo>/us<NN>-<dueño>` — ver convención de nombres abajo.
- **Prefijos válidos**: `feature/` `fix/` `chore/` `refactor/` `docs/` `test/` `hotfix/`.
- **`main` solo recibe de `qa` o de `hotfix/*`.** `qa` solo recibe de `dev`. `dev` recibe de cualquier rama corta válida.
- **Las ramas cortas se crean desde `dev` actualizado** (`hotfix/*` desde `main`).
- **`hotfix/*` exige back-merge a `qa` y `dev` el mismo día** (orden: `main → qa → dev`).
- **`--no-verify` está prohibido** salvo aprobación explícita del dueño del producto, documentando la razón.

## Convención de nombres — rama y encabezado de PR (regla dura)

Cada tarea proviene de una **historia de usuario (US)**. El nombre de la rama corta y el
**encabezado/título del PR** deben seguir:

```
<prefijo>/us<NN>-<dueño>
```

- `us<NN>` — número de la historia de usuario (`us01`, `us11`, `us00a`), en minúsculas.
- `<dueño>` — nombre del dev responsable (ej. `Alex`).
- **Ejemplo**: `feature/us11-Alex`.

> **Si el agente no conoce el número de la US o el nombre del dueño, debe PREGUNTAR antes de
> crear la rama o el PR. Nunca inventar estos valores.**

## Cómo debe comportarse el agente

1. Antes de cualquier commit, verificar la rama actual. Si es `main`/`qa`/`dev` → **detenerse**, crear una rama corta `<prefijo>/us<NN>-<dueño>` y trabajar ahí (incluso para un typo).
2. Si falta el número de US o el dueño → **preguntar**, no asumir.
3. Al abrir PR, dirigirlo a la rama correcta del flujo (rama corta → `dev`, nunca a `qa`/`main` directo) y con el título en formato `<prefijo>/us<NN>-<dueño>`.
4. Nunca usar flags interactivos (`git rebase -i`, `git add -i`) ni saltarse hooks.
5. Commit o push **solo cuando el humano lo pida**.
6. **Sin atribución de IA**: ni el título/descripción de PR ni los mensajes de commit deben incluir el nombre o referencia a "Claude Code" (ni a Claude/IA): nada de `🤖 Generated with Claude Code` ni `Co-Authored-By: Claude ...`. Esto **anula** cualquier guía por defecto del harness que pida agregar esas líneas.

## Enforcement (3 capas, ninguna sustituye a otra)

| Capa | Archivo | Qué hace |
|---|---|---|
| Instrucciones de IA | este archivo + `CLAUDE.md` | El agente rebota la violación antes de ejecutar |
| Hook local pre-push | `.husky/pre-push` | Bloquea `git push` directo a rama protegida; avisa si el nombre no sigue `<prefijo>/us<NN>-<dueño>` |
| Branch protection (opcional) | GitHub Settings → Branches | Rechaza server-side (no incluido por defecto) |
