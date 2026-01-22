'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Location {
  name: string;
  lat: number;
  lon: number;
}

interface RouteData {
  coordinates: Array<[number, number]>;
  distance: number;
  duration: number;
}

interface RouteSelectorProps {
  onChange?: (route: { pointA: Location | null; pointB: Location | null; routeData: RouteData | null }) => void;
}

const ACAPULCO_BOUNDS = {
  south: 16.7500,
  north: 16.9200,
  west: -99.9500,
  east: -99.7800,
};

export function RouteSelector({ onChange }: RouteSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  
  const [pointA, setPointA] = useState<Location | null>(null);
  const [pointB, setPointB] = useState<Location | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  
  // Para búsqueda de direcciones
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [suggestionsA, setSuggestionsA] = useState<Location[]>([]);
  const [suggestionsB, setSuggestionsB] = useState<Location[]>([]);
  const [loadingSearchA, setLoadingSearchA] = useState(false);
  const [loadingSearchB, setLoadingSearchB] = useState(false);
  const [showSuggestionsA, setShowSuggestionsA] = useState(false);
  const [showSuggestionsB, setShowSuggestionsB] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const markerARef = useRef<any>(null);
  const markerBRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);

  // Cargar Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setMapLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js';
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!isModalOpen || !mapLoaded || !mapContainer.current) return;

    const L = (window as any).L;
    if (!L) return;

    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    setTimeout(() => {
      if (!mapContainer.current) return;
      
      map.current = L.map(mapContainer.current, {
        center: [16.8531, -99.8800],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(map.current);

      // Crear marcadores arrastrables
      createDraggableMarkers();
    }, 100);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isModalOpen, mapLoaded]);

  const createDraggableMarkers = () => {
    if (!map.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Icono para punto A (verde)
    const iconA = L.divIcon({
      className: 'custom-marker-a',
      html: `<div style="background: #22c55e; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.4); cursor: grab;">A</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Icono para punto B (rojo)
    const iconB = L.divIcon({
      className: 'custom-marker-b',
      html: `<div style="background: #ef4444; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.4); cursor: grab;">B</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Posiciones iniciales (o las guardadas)
    const posA = pointA ? [pointA.lat, pointA.lon] : [16.8600, -99.8900];
    const posB = pointB ? [pointB.lat, pointB.lon] : [16.8450, -99.8700];

    // Crear marcador A arrastrabe
    markerARef.current = L.marker(posA, { 
      icon: iconA, 
      draggable: true,
      autoPan: true,
    }).addTo(map.current);

    markerARef.current.bindTooltip('Arrastra para mover el origen', { 
      permanent: false, 
      direction: 'top',
      offset: [0, -25]
    });

    markerARef.current.on('dragend', async () => {
      const pos = markerARef.current.getLatLng();
      const name = await reverseGeocode(pos.lat, pos.lng);
      const newPoint = { lat: pos.lat, lon: pos.lng, name };
      setPointA(newPoint);
      setSearchA(name);
    });

    // Crear marcador B arrastrable
    markerBRef.current = L.marker(posB, { 
      icon: iconB, 
      draggable: true,
      autoPan: true,
    }).addTo(map.current);

    markerBRef.current.bindTooltip('Arrastra para mover el destino', { 
      permanent: false, 
      direction: 'top',
      offset: [0, -25]
    });

    markerBRef.current.on('dragend', async () => {
      const pos = markerBRef.current.getLatLng();
      const name = await reverseGeocode(pos.lat, pos.lng);
      const newPoint = { lat: pos.lat, lon: pos.lng, name };
      setPointB(newPoint);
      setSearchB(name);
    });

    // Si ya hay puntos guardados, actualizar estado
    if (!pointA) {
      reverseGeocode(posA[0], posA[1]).then(name => {
        setPointA({ lat: posA[0], lon: posA[1], name });
        setSearchA(name);
      });
    }
    if (!pointB) {
      reverseGeocode(posB[0], posB[1]).then(name => {
        setPointB({ lat: posB[0], lon: posB[1], name });
        setSearchB(name);
      });
    }

    // Ajustar vista para mostrar ambos marcadores
    const bounds = L.latLngBounds([posA, posB]);
    map.current.fitBounds(bounds, { padding: [60, 60] });
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 2).join(', ');
      }
    } catch {}
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  };

  // Calcular ruta cuando cambian los puntos
  useEffect(() => {
    if (pointA && pointB) {
      calculateRoute();
    } else {
      setRouteData(null);
      if (routeLayerRef.current && map.current) {
        map.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
    }
  }, [pointA, pointB]);

  // Notificar cambios
  useEffect(() => {
    onChange?.({ pointA, pointB, routeData });
  }, [pointA, pointB, routeData, onChange]);

  const calculateRoute = async () => {
    if (!pointA || !pointB) return;
    
    setLoadingRoute(true);
    setRouteError(null);

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pointA.lon},${pointA.lat};${pointB.lon},${pointB.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.code !== 'Ok' || !data.routes?.length) {
        setRouteError('No se encontró una ruta válida');
        return;
      }

      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
      
      setRouteData({ coordinates, distance: route.distance, duration: route.duration });
      
      // Dibujar ruta
      if (!map.current) return;
      const L = (window as any).L;
      if (routeLayerRef.current) map.current.removeLayer(routeLayerRef.current);
      
      routeLayerRef.current = L.polyline(coordinates, {
        color: '#00BCD4',
        weight: 5,
        opacity: 0.8,
      }).addTo(map.current);
    } catch {
      setRouteError('Error al calcular la ruta');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Búsqueda de direcciones
  const searchLocations = useCallback(async (query: string, isPointA: boolean) => {
    if (query.length < 3) {
      if (isPointA) setSuggestionsA([]);
      else setSuggestionsB([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (isPointA) setLoadingSearchA(true);
      else setLoadingSearchB(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Acapulco Guerrero Mexico')}&limit=5&bounded=1&viewbox=${ACAPULCO_BOUNDS.west},${ACAPULCO_BOUNDS.north},${ACAPULCO_BOUNDS.east},${ACAPULCO_BOUNDS.south}`
        );
        const data = await response.json();
        
        const locations: Location[] = data.map((item: any) => ({
          name: item.display_name.split(',').slice(0, 3).join(', '),
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }));

        if (isPointA) {
          setSuggestionsA(locations);
          setShowSuggestionsA(locations.length > 0);
        } else {
          setSuggestionsB(locations);
          setShowSuggestionsB(locations.length > 0);
        }
      } catch (error) {
        console.error('Error en búsqueda:', error);
      } finally {
        if (isPointA) setLoadingSearchA(false);
        else setLoadingSearchB(false);
      }
    }, 300);
  }, []);

  const selectSuggestion = (location: Location, isPointA: boolean) => {
    if (isPointA) {
      setPointA(location);
      setSearchA(location.name);
      setSuggestionsA([]);
      setShowSuggestionsA(false);
      // Mover marcador
      if (markerARef.current) {
        markerARef.current.setLatLng([location.lat, location.lon]);
      }
    } else {
      setPointB(location);
      setSearchB(location.name);
      setSuggestionsB([]);
      setShowSuggestionsB(false);
      // Mover marcador
      if (markerBRef.current) {
        markerBRef.current.setLatLng([location.lat, location.lon]);
      }
    }

    // Centrar mapa
    if (map.current) {
      map.current.setView([location.lat, location.lon], 15);
    }
  };

  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const formatDuration = (s: number) => {
    const mins = Math.round(s / 60);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}min` : `${mins} min`;
  };

  const hasRoute = pointA && pointB && routeData;

  return (
    <div className="space-y-3">
      {/* Botón para abrir */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full p-4 rounded-xl border-2 border-dashed border-cmyk-cyan/50 bg-cmyk-black/30 hover:bg-cmyk-cyan/10 hover:border-cmyk-cyan transition-all group"
      >
        <div className="flex items-center justify-center gap-3">
          <svg className="w-8 h-8 text-cmyk-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <div className="text-left">
            <p className="font-semibold text-white group-hover:text-cmyk-cyan">
              {hasRoute ? 'Ruta configurada' : 'Configurar ruta del recorrido'}
            </p>
            <p className="text-xs text-gray-400">
              {hasRoute ? `${formatDistance(routeData.distance)} • ${formatDuration(routeData.duration)}` : 'Arrastra los marcadores en el mapa'}
            </p>
          </div>
        </div>
      </button>

      {/* Resumen si hay ruta */}
      {hasRoute && (
        <div className="p-3 rounded-lg bg-cmyk-cyan/10 border border-cmyk-cyan/30">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">A</div>
              <div className="w-0.5 h-4 bg-gray-500"></div>
              <div className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">B</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{pointA?.name}</p>
              <p className="text-xs text-gray-500 my-1">↓ {formatDistance(routeData.distance)}</p>
              <p className="text-sm text-white truncate">{pointB?.name}</p>
            </div>
            <button type="button" onClick={() => setIsModalOpen(true)} className="text-cmyk-cyan text-xs">Editar</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl h-[85vh] bg-cmyk-black rounded-2xl border-2 border-cmyk-cyan/30 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex-shrink-0 bg-cmyk-black border-b border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white">Configura la ruta</h3>
                  <p className="text-sm text-gray-400">Arrastra los marcadores o escribe las direcciones</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 rounded-full bg-gray-800 hover:bg-red-600 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Campos de búsqueda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Punto A */}
                <div className="relative">
                  <div className="flex items-center gap-2 bg-gray-800 rounded-lg border border-gray-600 focus-within:border-green-500 transition-colors">
                    <div className="w-8 h-8 ml-2 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      A
                    </div>
                    <input
                      type="text"
                      value={searchA}
                      onChange={(e) => {
                        setSearchA(e.target.value);
                        searchLocations(e.target.value, true);
                      }}
                      onFocus={() => suggestionsA.length > 0 && setShowSuggestionsA(true)}
                      placeholder="Buscar origen..."
                      className="flex-1 bg-transparent text-white py-2.5 pr-2 outline-none placeholder-gray-500 text-sm"
                    />
                    {loadingSearchA && (
                      <div className="p-2">
                        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  {/* Sugerencias A */}
                  {showSuggestionsA && suggestionsA.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-green-500/50 rounded-lg overflow-hidden z-[100] max-h-40 overflow-y-auto shadow-xl">
                      {suggestionsA.map((loc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectSuggestion(loc, true)}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-green-900/30 transition-colors border-b border-gray-700 last:border-0"
                        >
                          📍 {loc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Punto B */}
                <div className="relative">
                  <div className="flex items-center gap-2 bg-gray-800 rounded-lg border border-gray-600 focus-within:border-red-500 transition-colors">
                    <div className="w-8 h-8 ml-2 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      B
                    </div>
                    <input
                      type="text"
                      value={searchB}
                      onChange={(e) => {
                        setSearchB(e.target.value);
                        searchLocations(e.target.value, false);
                      }}
                      onFocus={() => suggestionsB.length > 0 && setShowSuggestionsB(true)}
                      placeholder="Buscar destino..."
                      className="flex-1 bg-transparent text-white py-2.5 pr-2 outline-none placeholder-gray-500 text-sm"
                    />
                    {loadingSearchB && (
                      <div className="p-2">
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  {/* Sugerencias B */}
                  {showSuggestionsB && suggestionsB.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-red-500/50 rounded-lg overflow-hidden z-[100] max-h-40 overflow-y-auto shadow-xl">
                      {suggestionsB.map((loc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectSuggestion(loc, false)}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-red-900/30 transition-colors border-b border-gray-700 last:border-0"
                        >
                          📍 {loc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mapa */}
            <div className="flex-1 relative">
              <div ref={mapContainer} className="w-full h-full" />
              
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-cmyk-black">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cmyk-cyan mx-auto mb-3"></div>
                    <p className="text-cmyk-cyan">Cargando mapa...</p>
                  </div>
                </div>
              )}

              {loadingRoute && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cmyk-cyan"></div>
                    <p className="text-white">Calculando ruta...</p>
                  </div>
                </div>
              )}

              {/* Instrucción */}
              <div className="absolute top-4 left-4 right-4 bg-gray-800/90 backdrop-blur rounded-lg p-3 z-10">
                <p className="text-sm text-gray-300 text-center">
                  🖐️ <strong>Arrastra los marcadores</strong> A y B para definir el recorrido
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 bg-cmyk-black border-t border-gray-700 p-4">
              {routeError && (
                <div className="mb-3 p-3 bg-red-900/30 border border-red-600 rounded-lg">
                  <p className="text-sm text-red-400">{routeError}</p>
                </div>
              )}

              {routeData && (
                <div className="mb-3 p-3 bg-cmyk-cyan/10 border border-cmyk-cyan/30 rounded-lg flex items-center justify-between">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-2xl font-bold text-cmyk-cyan">{formatDistance(routeData.distance)}</p>
                      <p className="text-xs text-gray-400">Distancia</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-cmyk-cyan">{formatDuration(routeData.duration)}</p>
                      <p className="text-xs text-gray-400">Tiempo</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3 px-6 font-bold rounded-lg transition-all bg-cmyk-cyan hover:bg-cmyk-cyan/80 text-cmyk-black"
              >
                {hasRoute ? 'Confirmar ruta' : 'Guardar posición'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
