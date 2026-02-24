import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para el ícono por defecto de Leaflet (no carga en bundlers como Vite)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ── Tipos ──

interface Coordenadas {
  lat: number;
  lng: number;
}

interface Props {
  /** Latitud inicial (o actual) */
  latitud?: number | null;
  /** Longitud inicial (o actual) */
  longitud?: number | null;
  /** Callback cuando cambian las coordenadas (solo en modo editable) */
  alCambiar?: (lat: number, lng: number) => void;
  /** Si es false, el mapa es solo lectura (libro público) */
  editable?: boolean;
  /** Altura del mapa en px */
  altura?: number;
  /** Nombre de la sede para el tooltip del marker */
  nombreSede?: string;
}

// Perú como centro default
const CENTRO_DEFAULT: Coordenadas = { lat: -12.0464, lng: -77.0428 };
const ZOOM_DEFAULT = 13;
const ZOOM_CON_PIN = 16;

// ── Subcomponentes internos ──

/** Escucha clicks en el mapa para mover el pin */
function ClickHandler({ alCambiar }: { alCambiar: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      alCambiar(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Centra el mapa cuando cambian las coordenadas */
function CentrarMapa({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.8 });
  }, [lat, lng, zoom, map]);
  return null;
}

// ── Componente principal ──

export default function MapaUbicacion({
  latitud,
  longitud,
  alCambiar,
  editable = true,
  altura = 300,
  nombreSede,
}: Props) {
  const [posicion, setPosicion] = useState<Coordenadas | null>(
    latitud && longitud ? { lat: latitud, lng: longitud } : null
  );
  const [detectandoGPS, setDetectandoGPS] = useState(false);
  const mapRef = useRef<any>(null);

  // Sincronizar props → estado local
  useEffect(() => {
    if (latitud && longitud) {
      setPosicion({ lat: latitud, lng: longitud });
    }
  }, [latitud, longitud]);

  const manejarClick = (lat: number, lng: number) => {
    if (!editable) return;
    const coords = {
      lat: Math.round(lat * 10000000) / 10000000,
      lng: Math.round(lng * 10000000) / 10000000,
    };
    setPosicion(coords);
    alCambiar?.(coords.lat, coords.lng);
  };

  const detectarUbicacion = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    setDetectandoGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000000) / 10000000;
        const lng = Math.round(pos.coords.longitude * 10000000) / 10000000;
        setPosicion({ lat, lng });
        alCambiar?.(lat, lng);
        setDetectandoGPS(false);
      },
      (err) => {
        console.error('Error GPS:', err);
        alert('No se pudo obtener la ubicación. Verifica los permisos del navegador.');
        setDetectandoGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const centro = posicion || CENTRO_DEFAULT;
  const zoom = posicion ? ZOOM_CON_PIN : ZOOM_DEFAULT;

  return (
    <div style={{ position: 'relative' }}>
      {/* Mapa */}
      <div
        style={{
          height: altura,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
        }}
      >
        <MapContainer
          center={[centro.lat, centro.lng]}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          scrollWheelZoom={editable}
          dragging={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {posicion && (
            <Marker position={[posicion.lat, posicion.lng]} />
          )}

          {editable && <ClickHandler alCambiar={manejarClick} />}

          {posicion && <CentrarMapa lat={posicion.lat} lng={posicion.lng} zoom={zoom} />}
        </MapContainer>
      </div>

      {/* Controles (solo en modo editable) */}
      {editable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={detectarUbicacion}
            disabled={detectandoGPS}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#2563eb',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 6,
              cursor: detectandoGPS ? 'wait' : 'pointer',
              opacity: detectandoGPS ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {detectandoGPS ? (
              <svg
                style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="3" opacity="0.25" />
                <path d="M4 12a8 8 0 018-8" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
            {detectandoGPS ? 'Detectando...' : 'Usar mi ubicación'}
          </button>

          {posicion && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>
              {posicion.lat}, {posicion.lng}
            </span>
          )}

          {!posicion && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Haz click en el mapa para marcar la ubicación
            </span>
          )}
        </div>
      )}

      {/* Info read-only (libro público) */}
      {!editable && nombreSede && (
        <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
          📍 {nombreSede}
        </div>
      )}

      {/* CSS para animación del spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}