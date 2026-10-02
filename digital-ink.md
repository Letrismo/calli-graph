ink-graff.js
Motor para guardar tinta digital sin reducirla a imagen
1. Idea central
ink-graff.js es un motor para capturar, normalizar y reproducir tinta digital cruda.
Su objetivo no es generar una imagen final, sino conservar el trazo como datos: trayectoria, tiempo, presión, velocidad, dirección, pausas, herramienta y contexto.
La imagen es una salida posible.
La tinta cruda es el material base.
2. Punto de partida: de eQuills a tinta normalizada
eQuills funciona como antecedente conceptual: herramientas digitales de escritura capaces de producir marcas que no imitan instrumentos físicos.
ink-graff.js sería una capa más elemental:
- no define todavía una estética;
- no impone una salida visual;
- no depende de una técnica caligráfica específica;
- captura el gesto antes de interpretarlo.
La evolución sería:
eQuills → herramientas expresivas
ink-graff.js → motor de captura y normalización de tinta

3. Problema técnico
¿Cómo guardar tinta digital sin reducirla a una imagen?
Guardar PNG, JPG o SVG final conserva la apariencia.
Guardar tinta como datos conserva el gesto.
Eso permite saber:
- dónde inicia y termina un trazo;
- en qué orden fue escrito;
- cuánto tiempo tomó;
- dónde hubo presión, pausa o cambio de dirección;
- cómo se puede reconstruir, analizar o transformar.
4. Alcance del core
El core debe resolver solo tres cosas:
Capa	Responsabilidad
Captura	Registrar eventos de entrada: pen, mouse, touch o stylus
Normalización	Convertir eventos variables del navegador en una estructura estable
Reproducción	Reconstruir el trazo desde los datos guardados

Todo lo demás debe vivir fuera del core.
5. Captura
La captura puede partir de eventos JavaScript, especialmente Pointer Events:
- pointerdown
- pointermove
- pointerup
- pointercancel
Datos posibles:
- posición x, y;
- tiempo t;
- presión pressure;
- inclinación tiltX, tiltY;
- rotación twist;
- tipo de entrada pen, mouse, touch;
- identificador de trazo;
- estado del gesto.
No todos los dispositivos dan la misma información. Por eso el motor debe normalizar, no asumir.
6. Modelo de datos
La unidad mínima no es la imagen, sino el punto registrado dentro de un trazo.
{
  id: "stroke_001",
  tool: "pen",
  points: [
    {
      x: 120,
      y: 340,
      t: 0,
      pressure: 0.42,
      tiltX: 12,
      tiltY: -4
    }
  ]
}

Datos derivados como velocidad, dirección o distancia pueden calcularse después:
- velocidad;
- aceleración;
- dirección;
- longitud;
- pausas;
- segmentos;
- nodos estructurales;
- relaciones entre trazos.
7. Relación con InkML
InkML puede funcionar como referencia para normalizar tinta digital.
No necesariamente tiene que ser el formato interno único, pero sí puede ayudar a definir:
- qué es un trazo;
- cómo se agrupan trazos;
- cómo se describen canales como x, y, time, pressure;
- cómo separar captura, contexto e interpretación.
Propuesta:
Eventos JS → Raw Events → Normalized Ink Object → Exportadores / Plugins

8. Grafo del trazo
El grafo no tiene que ser la primera capa de captura, pero sí puede ser una capa estructural encima de la tinta normalizada.
Un trazo puede entenderse como:
- una secuencia de puntos;
- una trayectoria temporal;
- una red de nodos y conexiones;
- una estructura editable.
Ahí aparece la relación con caligrafía, ductus y escritura computacional.
9. Plugins y extensiones
Todo lo que interpreta o transforma tinta debe vivir como extensión.
Plugin	Función
Renderer	Dibuja la tinta en canvas, SVG o WebGL
Analyzer	Calcula ritmo, presión, velocidad, pausas o ductus
Recognizer	Reconoce letras, palabras, gestos o formas
Transformer	Deforma, interpola, ramifica o reinterpreta trazos
Exporter	Genera SVG, Lottie, PDF, InkML, JSON u otros formatos
ML Adapter	Conecta con Google ML Kit u otros sistemas externos

10. ML Kit como extensión
Google ML Kit no debería formar parte del core.
Puede ser un plugin porque interpreta la tinta, pero no la define.
Su lugar sería:
Normalized Ink Object → ML Kit Adapter → Recognition Result

Puede servir para explorar:
- reconocimiento de escritura;
- clasificación de gestos;
- respuestas visuales a partir de lo escrito;
- lectura computacional de trazos humanos.
11. Principio de diseño
El principio puede quedar muy fuerte así:
El core captura tinta.
La normalización conserva el gesto.
Los plugins interpretan.
Los renderers traducen.
La experiencia decide qué significa.

12. Frase base del proyecto
Yo dejaría esta como eje:
ink-graff.js propone guardar la escritura como tinta digital cruda: una estructura de datos capaz de conservar trayectoria, tiempo, presión y gesto, antes de reducirla a una imagen.

Y esta como pregunta técnica:
¿Cómo se guarda una letra sin guardar solo su apariencia?

Ahí ya tienes una base más clara: core primero, estética después.