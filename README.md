
*Processing Community Day 2026 · CDMX*

# calligraph.js | eQuills v2.0
**Calligraphy meets code**

Un encuentro sobre **caligrafía digital**: cómo el **gesto, el trazo y el código** construyen nuevas formas de escribir en pantalla.

*<calli—graph> = caligrafía + grafo matemático*

Un grafo matemático es un conjunto de nodos enlazados por aristas que permiten representar relaciones entre elementos. Esta matemática es utilizada por ejemplo, para encontrar el recorrido más eficiente entre dos puntos en los mapas de navegación de nuestros teléfonos.

En el caso de la caligrafía, cuando un trazo queda registrado computacionalmente como un grafo, deja de ser una imagen estática y se convierte en una trayectoria operable: puede medirse, deformarse, animarse y reescribirse.

Un trazo caligráfico registrado como grafo es una trayectoria computacional formada por nodos, relaciones y atributos temporales. Cada nodo conserva una muestra del gesto; cada arista conserva la relación entre una muestra y la siguiente. Eso permite analizar el ductus, reconstruir el movimiento, alterar la forma y generar salidas visuales que no dependen de imitar una herramienta física.

## Del píxel al gesto vectorial

La forma de las letras siempre ha estado definida por las herramientas con las que se escriben. Uno de los últimos grandes quiebres ocurrió en los años setenta con el graffiti contemporáneo: la pared como soporte y el aerosol como herramienta.

Desde entonces, buena parte del software ha buscado replicar cada instrumento analógico imaginable. Añade capas, historial y tinta inagotable; pero la imitación limita la experimentación y, sin experimentación, no hay evolución.

Los eQuills son nuestras herramientas de caligrafía digital: pinceles construidos con código para dejar marcas imposibles en el mundo físico.

En la primera edición, el trazo quedaba fijado en mapas de bits. En este segundo volumen, un nuevo motor registra el gesto —presión, velocidad y tiempo— y lo convierte en una trayectoria vectorial que puede seguir transformándose.

## Edición 2026: La gótica digital

Esta edición toma la caligrafía gótica como campo de exploración. Invitamos a calígrafos especializados en *blackletter* a probar los eQuills y observar qué ocurre al codificar el ductus, qué podemos aprender de él y a qué conclusiones nos puede llevar registrar la presión, velocidad y tiempo de su ejecución.

De la caligrafía al código: ¿Qué sucede cuando la tradición y el algoritmo escriben juntos?

---
## Requerimientos para el evento.

### Charla.
Un foro o espacio apto para dar pláticas o talleres para N número de personas:
- 1 Pantalla.
- "N" Sillas.

### Jam.
Espacio de taller con mesas de trabajo (idealmente mesas para mínimo 2 personas) y conexiones eléctricas para laptops y tabletas gráficas; además de papel, lápices, borradores, plumas que faciliten el intercambio de ideas:
- "N" mesas.
- "N x 2" sillas.
- Conexiones / extensiones eléctricas.
- Hojas de papel, lápices, borradores, plumas, plumones, etc.


---
## Ideales y deseos para mejorar la experiencia.

### Jam.
#### Stage / Display.
*[Escenario / Proyección / Pantalla principal]* con estación de trabajo donde se pueda mostrar a mayor escala lo que desarrolla cada "equipo" o "dupla" al final de la sesión. Imaginamos que este escenario cuente con una proyección de mayor tamaño a una televisión (p. ej. 4m de ancho x 2.25m de alto).

https://github.com/user-attachments/assets/4ae55d7c-d63e-4354-8104-9e17d8bfc989

#### Estaciones de trabajo.
Podemos realizar el taller haciendo que cada persona traiga su computadora y/o tableta gráfica según corresponda (letrista / programador); pero en caso de contar con el material necesario y de acuerdo a la cantidad deseada de asistentes, podríamos mejorar la experiencia brindando una estación de trabajo a cada "equipo" con pantallas medianas que faciliten la colaboración entre todos los equipos y aumenten la visibilidad de lo que se está realizando.

https://github.com/user-attachments/assets/70282869-f0a6-4688-9eeb-7901b2cbeaaa
## Registro y protección contra bots

El formulario carga el script oficial de Cloudflare Turnstile directamente desde
`https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`.
No requiere dependencias npm adicionales. La site key pública está configurada en `js/turnstile.js`;
`VITE_TURNSTILE_SITE_KEY` permite sustituirla al compilar.
Nunca colocar la secret key en variables `VITE_*` ni en este repositorio.

El POST a `https://centro.juanfuent.es/api/events/caligraf-2026/registrations`
envía este contrato, compatible con `Api::EventRegistrationsController` de CENTRO:

```json
{
  "registration": { "full_name": "Nombre completo", "email": "persona@example.com" },
  "turnstile_token": "TOKEN_DEL_WIDGET"
}
```

El widget usa la acción `event_registration`. El botón espera un token;
si caduca o falla la verificación, bloquea el envío. Cada POST fallido renueva
el desafío porque el servidor puede haber consumido el token. Un registro
confirmado permanece confirmado aunque falle la consulta posterior de cupo.

### Producción

1. En Cloudflare, autorizar `calli-graph.letrismo.com` en el widget correspondiente
   a esta site key (preferentemente modo Managed). Autorizar también cualquier
   otro dominio desde el que se publique el formulario.
2. En el entorno de producción Rails configurar y reiniciar:

   ```sh
   TURNSTILE_SECRET_KEY=<secret_del_mismo_widget>
   TURNSTILE_HOSTNAMES=calli-graph.letrismo.com
   ```

   Para varios dominios, separarlos con comas, sin protocolo ni rutas.
   Deben ser los dominios del formulario, no el dominio de la API.
3. Desplegar ambos proyectos. CENTRO ya contiene `Turnstile::Verify`, que llama
   Siteverify antes de crear el registro o enviar correo. Comprueba `success`,
   hostname y acción; rechaza tokens ausentes/inválidos con
   `422 { "error": "invalid_turnstile_token" }` y fallos de configuración o
   proveedor con `503 { "error": "turnstile_unavailable" }`.
4. Verificar un registro desde el dominio publicado y confirmar el correo.
   Comprobar que un POST sin token no crea registros. No se ha ejecutado un
   registro real como parte de esta integración.

El frontend maneja ambos errores sin borrar nombre ni correo. La protección
requiere que esa versión del backend esté desplegada: configurar la secret key
por sí sola no agrega validación a un controlador antiguo.

Si el hosting añade CSP, permitir `https://challenges.cloudflare.com` en
`script-src` y `frame-src`; conservar el dominio de la API en `connect-src`.
CORS en Rails debe autorizar el origen del formulario. El script de Turnstile
se carga desde Cloudflare, sin copiarlo ni almacenarlo en el build.

### Desarrollo y pruebas

Ejecutar `npm test` y `npm run build`. El despliegue de Pages ejecuta las pruebas
antes de compilar. Para probar el widget localmente se puede usar la site key de
pruebas indicada en `.env.example`, emparejada con una secret de pruebas de
Cloudflare **en un backend de desarrollo** y su hostname de prueba autorizado.
Vite usa la API de producción como proxy por defecto; para pruebas completas,
apuntar `VITE_REGISTRATION_URL` y `VITE_REGISTRATION_AVAILABILITY_URL` al backend
de desarrollo y habilitar allí el origen local. No enviar tokens de prueba al
backend de producción.

Referencias: [widget y script oficial](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/),
[validación obligatoria en servidor y tokens de un solo uso](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
