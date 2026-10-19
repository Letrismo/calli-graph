const container = document.querySelector('#venue-map');

async function initializeMap() {
  const status = document.querySelector('[data-map-status]');
  let map;

  try {
    const [{ Map, Marker, NavigationControl, setWorkerUrl }, { default: workerUrl }] = await Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    ]);

    setWorkerUrl(workerUrl);

    // Exact venue coordinates from the existing Google Maps place link, [lng, lat].
    const centro = [-99.2039353, 19.4048025];
    map = new Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: centro,
      zoom: 15,
      scrollZoom: false,
      dragRotate: false,
      touchPitch: false,
      cooperativeGestures: true,
      locale: {
        'NavigationControl.ZoomIn': 'Acercar',
        'NavigationControl.ZoomOut': 'Alejar',
        'CooperativeGesturesHandler.TouchPanHelp': 'Usa dos dedos para mover el mapa',
      },
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    const marker = document.createElement('a');
    marker.className = 'block h-12 w-11 text-orange drop-shadow-lg';
    marker.href = document.querySelector('[data-map-link]').href;
    marker.target = '_blank';
    marker.rel = 'noopener noreferrer';
    marker.setAttribute('aria-label', 'Abrir ubicación de CENTRO en Google Maps');
    marker.innerHTML = '<svg class="block size-full" viewBox="0 0 44 48" aria-hidden="true"><path d="M22 46S4 28 4 20a18 18 0 1 1 36 0c0 8-18 26-18 26Z" fill="currentColor" stroke="#121212" stroke-width="2"/><circle cx="22" cy="20" r="6" fill="#121212"/></svg>';
    new Marker({ element: marker, anchor: 'bottom' }).setLngLat(centro).addTo(map);

    map.on('error', () => {
      if (!map.isStyleLoaded()) {
        status.hidden = false;
        status.textContent = 'No se pudo cargar el mapa. Abre la ubicación en Google Maps.';
      }
    });
    map.on('idle', () => { status.hidden = true; });
  } catch {
    map?.remove();
    status.hidden = false;
    status.textContent = 'No se pudo cargar el mapa. Abre la ubicación en Google Maps.';
  }
}

if (container) {
  // Fetch the map library and tiles only as the location section approaches.
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      initializeMap();
    }
  }, { rootMargin: '300px' });
  observer.observe(container);
}
