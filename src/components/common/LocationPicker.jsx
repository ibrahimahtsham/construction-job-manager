import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's broken default icon URLs in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng]);
  return null;
}

function LocationPicker({ lat, lng, onChange }) {
  if (!lat || !lng) return null;

  const handleDragEnd = async (e) => {
    const { lat: newLat, lng: newLng } = e.target.getLatLng();
    let displayName = null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      displayName = data.display_name || null;
    } catch {
      // ignore reverse geocode failure
    }
    onChange(newLat, newLng, displayName);
  };

  return (
    <div style={{
      height: 200,
      borderRadius: 4,
      overflow: 'hidden',
      border: '1px solid #2e3550',
      marginTop: 8,
    }}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap lat={lat} lng={lng} />
        <Marker
          position={[lat, lng]}
          draggable
          eventHandlers={{ dragend: handleDragEnd }}
        />
      </MapContainer>
    </div>
  );
}

export default LocationPicker;
