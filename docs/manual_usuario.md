# Manual de Usuario — Inspector de Campo

## 1. Abrir la herramienta

Abre la URL de la aplicación en el navegador de tu celular, tablet o computador — entras directamente al
**Panel**, sin necesidad de crear una cuenta ni iniciar sesión. Tu nombre como evaluador se pide en el
primer paso de cada inspección (y la app lo recuerda para la siguiente, para no volver a escribirlo). Si
vas a instalar la app en la pantalla de inicio (recomendado para campo), ver la sección 8.

## 2. Panel

Al ingresar verás el **Panel**, con:

- Número de inspecciones totales, pendientes/en proceso, finalizadas y fotografías registradas.
- Clasificación de habitabilidad de las inspecciones ya clasificadas.
- Últimas inspecciones, con acceso directo para continuar.
- Botón **+ Nueva inspección** para empezar un levantamiento.

## 3. Inspecciones

El listado (menú "Inspecciones") muestra todas las evaluaciones con su estado:

- **Borrador**: recién creada, sin avanzar.
- **En proceso**: tiene información pero no se ha marcado como finalizada.
- **Finalizada**: el inspector confirmó que la información está completa.
- **Informe generado**: ya se descargó al menos un PDF.

Puedes filtrar por estado y continuar cualquier inspección donde la dejaste — toda la información se
guarda automáticamente al pasar de un paso a otro.

## 4. El formulario (8 pasos)

Cada inspección se completa en 8 pasos, mostrados en la barra superior con el progreso. Puedes saltar
directamente a cualquier paso ya visitado tocando su número.

1. **Identificación** — datos del evaluador, fecha/hora, entidad, tipo de amenaza que originó la
   inspección (sismo, inundación, movimiento en masa, etc.) y **víctimas y afectación humana** (muertos,
   heridos, desaparecidos, damnificados) — deja en blanco lo que no aplique.
2. **Ubicación** — toca "📍 Obtener ubicación GPS actual" para capturar las coordenadas automáticamente;
   si no hay señal GPS, puedes escribirlas a mano. El mapa se actualiza para que verifiques el punto.
3. **Edificación** — dirección, uso, número de pisos, y el sistema estructural, de entrepiso y de
   cubierta (marca todas las casillas que apliquen).
4. **Condiciones y peligros** — morfología del sitio, amenaza por cuerpos hídricos, y los peligros
   globales y geotécnicos (colapso, inclinación, licuación, etc.). Las preguntas 6.3-6.5 (piso débil,
   columna corta, cambios de rigidez) solo aparecen si marcaste "Sismo" como tipo de amenaza.
5. **Daños en elementos** — para cada elemento estructural (columnas, muros portantes, vigas, nodos,
   riostras, entrepiso) y no estructural (fachadas, instalaciones, escaleras, etc.), marca la severidad:
   **N/L** (Ninguno/Leve), **M** (Moderado) o **S** (Severo). Toca el ícono **📖** junto al nombre del
   elemento para abrir la **guía visual de patologías**: diagramas de los patrones de fisura/daño más
   comunes de ese elemento (estructural o no estructural — los 18 elementos tienen su propia guía), para
   ayudarte a reconocerlos antes de calificar. Si marcas M o S, aparece
   además un botón "＋ Detalle con foto" para registrar la ubicación exacta, descripción, extensión,
   recomendación y **fotografías** de ese daño en particular. En "Tipo de daño", toca **🔍 Elegir** para
   seleccionar con un clic el patrón que corresponda de la misma guía visual (o "Otro" para escribirlo).
   Puedes tomar/elegir varias fotos antes de guardar — se suben todas juntas al tocar **"Guardar daño"**,
   y el modal se cierra solo para que sigas cargando el siguiente daño.
6. **Esquema y clasificación** — fotografía el esquema de planta y elevación que dibujaste a mano. Luego
   toca "🧮 Calcular sugerencia" para que la app proponga una clasificación de habitabilidad (🟢 Habitable
   / 🟡 Uso restringido / 🔴 No habitable) y nivel de daño, basada en los peligros que registraste. **La
   sugerencia es solo eso — una sugerencia**: revísala y confirma o cambia el valor final según tu
   criterio profesional.
7. **Recomendaciones** — ocupación de la edificación y medidas de seguridad. Según la clasificación, la
   app preselecciona algunas recomendaciones habituales; agrégalas o quítalas según el caso.
8. **Finalizar** — comentarios finales, tus datos como evaluador, y un **resumen de la inspección** que
   te avisa si falta información importante antes de cerrar. Desde aquí puedes generar dos tipos de
   informe en PDF (puedes descargar los dos, no es necesario elegir uno solo):
   - **📄 Generar informe PDF**: el informe rediseñado de esta herramienta, con foto de portada, semáforo
     de clasificación y créditos institucionales — el más fácil de leer y compartir.
   - **📋 Generar formato oficial (PDF)**: réplica exacta del formulario impreso oficial ("2A - Formulario
     regional homogenizado"), diligenciada con los datos de la inspección en sus mismas 16 secciones y
     casillas. Úsalo cuando el organismo de atención de desastres exija recibir la información en su propio
     formato oficial.
   - **⬇ Exportar datos (CSV)**: descarga la información estructurada de la inspección.
   - **Finalizar →** (botón inferior): guarda todo, marca la inspección como finalizada y te lleva de
     vuelta al Panel. Puedes reabrirla después desde "Inspecciones" si necesitas corregir algo.

## 5. Fotografías

En cualquier punto donde veas el botón "📷", puedes tomar una foto directamente con la cámara del
dispositivo o elegir una existente de la galería. Las fotos se comprimen automáticamente antes de subirse
para no consumir datos móviles innecesarios. Puedes eliminar una foto tocando la "✕" sobre su miniatura.

## 6. Trabajar sin conexión

Si pierdes la señal en campo, la aplicación sigue funcionando: verás un indicador "Sin conexión" en la
parte superior. Todo lo que hagas (avanzar de paso, marcar severidades, crear daños) se guarda localmente
en el dispositivo y se sincroniza automáticamente en cuanto vuelva la conexión — no necesitas hacer nada
manualmente. El indicador mostrará "Sincronizando…" mientras se envían los cambios pendientes.

## 7. Guía visual de patologías

Reconocer el tipo de fisura o daño correcto es la parte más difícil de una inspección rápida. Por eso,
junto a cada elemento estructural del paso 5 hay un botón **📖** con diagramas de referencia: fisuras
diagonales por cortante, fisuras horizontales por flexión, aplastamiento de refuerzo, columna corta, etc.
— organizados según los mecanismos de falla descritos en la *Guía de Patologías Constructivas,
Estructurales y No Estructurales* (FOPAE-AIS, 2011). Úsala como apoyo, no como sustituto de tu criterio
profesional.

## 8. Instalar en la pantalla de inicio (recomendado)

- **Android (Chrome)**: menú (⋮) → "Instalar aplicación" o "Añadir a pantalla de inicio".
- **iPhone/iPad (Safari)**: botón compartir (□↑) → "Añadir a pantalla de inicio".

Una vez instalada, la app se abre como una aplicación normal (sin la barra de direcciones del navegador)
y sigue funcionando sin conexión gracias a la caché local.

## 9. Consejos para el trabajo en campo

- Completa primero la identificación y ubicación apenas llegues al sitio, antes de que se te olviden los
  datos de contacto o la hora exacta.
- Si hay víctimas, regístralas cuanto antes en el paso 1 — es información crítica para la coordinación de
  la emergencia.
- Toma varias fotos de cada daño relevante: una de contexto (para ubicarlo en la fachada/planta) y una de
  detalle (para ver el daño de cerca).
- Si la evaluación es por sismo, no olvides revisar los campos 6.3-6.5 (piso débil, columna corta,
  cambios de rigidez) — son indicadores importantes de vulnerabilidad sísmica.
- Antes de irte del sitio, revisa el "Resumen de la inspección" en el paso 8 para confirmar que no falta
  información crítica.
