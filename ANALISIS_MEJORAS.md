# Análisis: Steam Out para México + Esquizofrenia

## Resumen
Steam Out es una herramienta bien diseñada. Requiere adaptaciones específicas para:
1. **Contexto mexicano** (números de emergencia, referencias locales)
2. **Personas con esquizofrenia** (especificidad en síntomas, claridad sobre medicación, seguridad)
3. **Lenguaje inclusivo** (claro, no devaluador, no discriminatorio)

---

## ✅ FORTALEZAS ACTUALES

### Diseño seguro
- Disclaimer gate con validación de comprensión ✓
- Botón de crisis evidente ✓
- Escalas de cuidado graduado (stepped care) ✓
- Sin recolección de datos personales ✓

### Herramientas
- 5-4-3-2-1 grounding (muy útil para ansiedad) ✓
- Respiración (múltiples modalidades) ✓
- ACT/DBT (evidence-based) ✓
- Check-in/out (monitoreo simple) ✓

### Accesibilidad
- Modo comodidad alta ✓
- Control haptic/voice/feedback ✓
- Tema claro/oscuro ✓
- Sin requerimientos de entrada compleja ✓

---

## 🔴 PROBLEMAS CRÍTICOS A RESOLVER

### 1. **EMERGENCIAS: DATOS DE ESPAÑA, NECESITA MÉXICO**
**Actual (línea 34):**
```html
<li><a href="tel:024">Línea 024 (España)</a></li>
<li><a href="tel:112">Llamar a emergencias (112)</a></li>
```

**Debe ser:**
- 911 (emergencias general México)
- 988 (Línea Nacional de Prevención del Suicidio - México, si existe)
- Línea de psicosis/esquizofrenia regional si existe
- Considerar números de hospitales psiquiátricos locales

**IMPACTO**: Alto. Una persona en crisis necesita información correcta inmediatamente.

---

### 2. **LENGUAJE: "DESREALIZACIÓN" MUY TÉCNICO**
**Actual (línea 113):**
```
"Si aparece mareo intenso, sensación de desmayo, dolor torácico, disnea marcada,
desrealización que sube o pánico que escala:"
```

**Problema**: "Desrealización" es término clínico. Personas con esquizofrenia pueden no entenderlo.

**Solución**:
```
"Si aparece mareo intenso, sensación de desmayo, dolor torácico,
dificultad para respirar, o sensación de que las cosas no son reales:"
```

---

### 3. **SÍNTOMAS EN MENÚ: FALTA ALUCINACIONES/DELIRIOS**
**Actual (líneas 188-193):**
```javascript
<option value="ansiedad">Ansiedad alta</option>
<option value="rumiacion">Rumiación</option>
<option value="tristeza">Tristeza / apagamiento</option>
<option value="irritabilidad">Irritabilidad</option>
<option value="insomnio">Insomnio</option>
```

**Problema**: Personas con esquizofrenia tienen síntomas específicos no representados.

**Solución**: Agregar:
- "Escucho voces o tengo pensamientos intrusivos"
- "No sé si algo es real o no (confusión)"
- "Me cuesta pensar o concentrarme"

---

### 4. **DISCLAIMER: NO MENCIONA MEDICACIÓN**
**Actual (línea 230-232):**
```
"Esta aplicación es una herramienta de apoyo para la autorregulación emocional.
No sustituye la atención médica o psicológica profesional."
```

**Problema**: Para esquizofrenia, la medicación es ESENCIAL. Debe ser explícito.

**Solución**: Agregar línea:
```
"Esta app es un apoyo. Nunca reemplaza medicación o atención profesional."
```

---

### 5. **GATE: MUY GENÉRICO, SIN CONTEXTO DE ESQUIZOFRENIA**
**Actual (líneas 66-79):**
Preguntas genéricas sobre límites.

**Solución**: Incluir pregunta sobre:
- Consulta con profesional de salud mental (sí/no)
- Comprensión de que síntomas severos requieren emergencia inmediata

---

### 6. **NOMBRES DE HERRAMIENTAS: "STEAM OUT" BIEN, PERO TRADUCCIONES PODRÍAN MEJORAR**
- "Tomar Distancia (ACT)" ✓ claro
- "Cambio de Estado (DBT)" ✓ claro
- Resto está bien

---

## 🟡 MEJORAS RECOMENDADAS (NO CRÍTICAS)

### 1. Agregar referencia sobre medicación en ACT/DBT
```
"Estas técnicas apoyan tu vida mientras tomas medicación si la tienes."
```

### 2. Cambiar ejemplos de "rumiación" a más accesibles
Actual: técnico
Propuesta: "Doy vueltas al mismo pensamiento una y otra vez"

### 3. En "Nivel 3" de cuidado, especificar mejor
"Nivel 3: síntomas más severos o primeros episodios - acompañamiento profesional recomendado."

### 4. Agregar en footer información de recursos México
```
Recursos en México: XXXXXXXXX
Línea de apoyo: XXXXXXXXX
```

### 5. Clarificar "se aplicará gating de seguridad automáticamente"
→ "Se simplificará para mayor seguridad"

---

## CAMBIOS ESPECÍFICOS POR ARCHIVO

### `index.html`:
- [ ] Cambiar números de emergencia (024 → 911, agregar 988 si existe)
- [ ] Reemplazar "desrealización" con lenguaje accesible
- [ ] Agregar opciones de síntomas psicóticos en menú de estado
- [ ] Mejorar disclaimer sobre medicación
- [ ] Cambiar referencias a "España" por "México"

### `app.js`:
- [ ] Actualizar rutas de números de crisis
- [ ] Mejorar textos de gate/onboarding
- [ ] Agregar recomendaciones sobre medicación en herramientas
- [ ] Actualizar quickMenu con opciones relevantes para esquizofrenia

---

## PRINCIPIOS APLICADOS

✅ **Claridad**: Sin jerga médica innecesaria
✅ **Respeto**: No devaluador ni discriminatorio
✅ **Seguridad**: Información de emergencia precisa y accesible
✅ **Inclusión**: Reconoce síntomas específicos de esquizofrenia
✅ **Autonomía**: Apoya sin sustituir decisiones médicas

---

## PRIORIDAD DE CAMBIOS

1. 🔴 **CRÍTICO**: Números de emergencia México
2. 🔴 **CRÍTICO**: Medicación en disclaimer
3. 🟡 **ALTO**: Agregar síntomas psicóticos a menú
4. 🟡 **ALTO**: Reemplazar "desrealización" con lenguaje simple
5. 🟢 **MEDIO**: Mejorar ejemplos y recursos locales
