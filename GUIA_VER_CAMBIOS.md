# Guía: ver los cambios y subirlos a GitHub

Esta guía asume que estás en la carpeta del proyecto y que ya tienes Node.js instalado.

```
cd C:\Users\evach\OneDrive\Documentos\SISTEMAS\PROYECTOS\hitos\Hito-perfil
```

---

## 1. Ver las mejoras en el navegador (recomendado)

```powershell
npm run dev
```

Abre <http://localhost:3000> y:

1. Pega el enlace de tu libro de Google Sheets (el que ya usas) y pulsa **Cargar Enlace**.
   *Requiere `keys.json` en la raíz y que el libro esté compartido con el `client_email` de la
   cuenta de servicio.*
2. Aparece el panel de siempre, con dos cambios visibles:
   - los porcentajes ahora están en escala 0–100 correcta (antes promediaban puntos brutos);
   - arriba a la derecha, el botón **«Ver diagnóstico por competencias →»**.
3. Entra a `/diagnostico` (o pulsa el botón). Verás:
   - tarjetas por asignatura con su dominio medio y su nivel;
   - «Competencias con menor evidencia en la cohorte»;
   - la lista de estudiantes; al elegir uno, su perfil con cada ejercicio, cada competencia y las
     carencias priorizadas con la acción de reforzo.

**Sin libro a mano**, abre directamente en el navegador:

```
http://localhost:3000/api/diagnostico
```

Esa ruta devuelve el banco de reactivos completo (5 asignaturas, 54 reactivos) y sirve para comprobar
que el servidor está leyendo el catálogo.

### Si no puedes ejecutar `npm run dev`

Abre con doble clic:

```
entregables\demo_diagnostico.html
```

Es una **vista previa estática** generada con las 274 calificaciones reales del Hito Inicial 2026
(anonimizadas). No necesita servidor ni credenciales: muestra exactamente lo que produce el motor, con
el resumen por asignatura y tres perfiles individuales (uno en Inicio, uno en Proceso y uno en Destacado).

---

## 2. Ver qué cambió en el código

```powershell
git log --oneline -n 3                 # el commit nuevo sobre el publicado
git diff --stat d5d9b8f..HEAD          # 29 archivos, +3236 / -348 líneas
git show --stat HEAD                   # qué entró en el commit
```

Para mirar un archivo concreto, por ejemplo el motor de diagnóstico:

```powershell
git diff d5d9b8f..HEAD -- lib/diagnostico.ts
git show HEAD:lib/catalogo-reactivos.ts | more
```

Si prefieres una vista visual, después de subirlo a GitHub abre:

```
https://github.com/Aether-Khaos/Hito-perfil/compare/d5d9b8f...feature/diagnostico-por-reactivos
```

---

## 3. Comprobar que todo sigue funcionando

```powershell
npm test        # 29 pruebas: escala, promedio ponderado, lector del libro, motor
npm run lint    # 0 errores
npx tsc --noEmit
```

Resultado esperado: `tests 29 / pass 29 / fail 0` y `eslint` sin errores.

---

## 4. Subir a GitHub **solo los archivos que cambiaron**

Los cambios ya están en **un solo commit** dentro de la rama `feature/diagnostico-por-reactivos`.
No hace falta elegir archivos: el commit contiene exactamente los 21 archivos de código y los 8 de
`entregables/`. Al subir la rama, GitHub recibe solo eso.

```powershell
git status                              # debe decir: nothing to commit, working tree clean
git log --oneline origin/main..HEAD     # debe mostrar 1 commit
git push -u origin feature/diagnostico-por-reactivos
```

Si es la primera vez que subes desde esta máquina, Git abrirá el navegador para autenticarte con tu
cuenta de GitHub (Git Credential Manager). Si no lo abre, ejecuta antes:

```powershell
gh auth login          # si tienes GitHub CLI
# o crea un token en https://github.com/settings/tokens y úsalo como contraseña
```

Cuando termine, GitHub muestra el enlace para crear el *Pull Request*:

```
https://github.com/Aether-Khaos/Hito-perfil/compare/main...feature/diagnostico-por-reactivos
```

Desde ahí puedes revisar archivo por archivo, aprobar y fusionar a `main` cuando quieras.

### Si prefieres subir solo el código y no los documentos

Los `.docx` de `entregables/` pesan ~660 KB. Si no los quieres en el repositorio:

```powershell
git rm -r --cached entregables
Add-Content .gitignore "`n/entregables"
git commit -m "Retira los entregables del repositorio"
git push
```

Los archivos siguen en tu disco; solo dejan de estar versionados.

### Antes de subir: identidad del commit

El commit quedó firmado como `Eva Chino <evachino456@gmail.com>` (la configuración de Git de este
equipo). Si quieres que aparezca otro autor:

```powershell
git config user.name "Alex Rosales Quispe"
git config user.email "alex.rosales@uab.edu.bo"
git commit --amend --reset-author --no-edit
git push -u origin feature/diagnostico-por-reactivos
```

---

## 5. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `npm run dev` no responde | puerto ocupado | `npx next dev -p 3001` |
| Error 500 al cargar el libro | `keys.json` inválido o el libro no está compartido | comparte el Sheet con el `client_email` de la clave (permiso Lector) |
| «No hay notas para diagnosticar» | el filtro no tiene datos o la pestaña no tiene encabezados | revisa la fila de encabezado y la fila de máximos (`notas`) |
| `git push` rechazado | `main` avanzó en GitHub | `git pull --rebase origin main` y vuelve a subir |
| Quieres deshacer el commit local | aún no subiste nada | `git reset --soft HEAD~1` (deja los archivos listos para rehacer el commit) |

---

## 6. Qué mirar primero si te preguntan en la defensa

1. `lib/escala.ts` → la fórmula del promedio ponderado y los cinco niveles.
2. `lib/catalogo-reactivos.ts` → de dónde sale cada competencia (los exámenes).
3. `lib/diagnostico.ts` → cómo se decide que una competencia «no se evidencia».
4. `tests/` → las 29 pruebas que fijan esos comportamientos.
5. `entregables/demo_diagnostico.html` → el resultado visual con datos reales.
