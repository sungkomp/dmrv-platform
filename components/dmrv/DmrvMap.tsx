'use client';

import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import L from 'leaflet';

// Types matching parent
interface MapPlot {
  id: string;
  plotId: string;
  coordinates: string;
  trackType: string;
  areaHa: number;
  status: string;
  ownerInfo: string;
}

interface MapSensor {
  id: string;
  sensorId: string;
  sensorType: string;
  lat: number;
  lng: number;
  status: string;
  lastReading: number;
  unit: string;
  battery: number;
  lastSeen: string;
}

interface MapProject {
  id: string;
  name: string;
  description: string;
  methodology: string;
  status: string;
  areaHa: number;
  location: string;
  region: string;
  centerLat: number;
  centerLng: number;
  province: string;
  plots: MapPlot[];
  credits: Array<{ amount: number; status: string }>;
  certificates: Array<{ status: string }>;
  iotSensors: MapSensor[];
}

interface DmrvMapProps {
  projects: MapProject[];
  showZones: boolean;
  showSensors: boolean;
  showSatellite: boolean;
  selectedProject: MapProject | null;
  selectedSensor: MapSensor | null;
  flyTo: { center: [number, number]; zoom: number } | null;
  onFlyComplete: () => void;
  onProjectClick: (project: MapProject) => void;
  onSensorClick: (sensor: MapSensor) => void;
}

const TRACK_COLORS: Record<string, string> = {
  forest: '#10b981',
  biochar: '#f59e0b',
  awd: '#3b82f6',
  biogas: '#8b5cf6',
  solar: '#ef4444',
};

const SENSOR_ICONS: Record<string, string> = {
  soil_moisture: '💧',
  temperature: '🌡️',
  humidity: '🌧️',
  ch4: '💨',
  co2: '🏭',
  water_level: '🌊',
  ph: '⚗️',
  wind_speed: '🌬️',
  solar_irradiance: '☀️',
};

const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const STREET_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

function useMounted() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export default function DmrvMap({
  projects, showZones, showSensors, showSatellite,
  selectedProject, selectedSensor, flyTo, onFlyComplete,
  onProjectClick, onSensorClick,
}: DmrvMapProps) {
  const mounted = useMounted();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);
  const zoneGroupRef = useRef<L.LayerGroup | null>(null);
  const sensorGroupRef = useRef<L.LayerGroup | null>(null);
  const prevTileMode = useRef<boolean>(showSatellite);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [14.0, 100.8],
      zoom: 6,
      zoomControl: false,
    });

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer (satellite)
    tileLayerRef.current = L.tileLayer(SATELLITE_URL, {
      attribution: '© Esri',
      maxZoom: 19,
    }).addTo(map);

    labelLayerRef.current = L.tileLayer(SATELLITE_LABELS_URL, {
      maxZoom: 19,
    }).addTo(map);

    zoneGroupRef.current = L.layerGroup().addTo(map);
    sensorGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle satellite/street
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    if (prevTileMode.current === showSatellite) return;
    prevTileMode.current = showSatellite;

    mapRef.current.removeLayer(tileLayerRef.current);
    if (labelLayerRef.current) mapRef.current.removeLayer(labelLayerRef.current);

    if (showSatellite) {
      tileLayerRef.current = L.tileLayer(SATELLITE_URL, {
        attribution: '© Esri',
        maxZoom: 19,
      }).addTo(mapRef.current);
      labelLayerRef.current = L.tileLayer(SATELLITE_LABELS_URL, {
        maxZoom: 19,
      }).addTo(mapRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(STREET_URL, {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapRef.current);
      labelLayerRef.current = null;
    }
  }, [showSatellite]);

  // Draw project zones
  useEffect(() => {
    if (!zoneGroupRef.current) return;
    zoneGroupRef.current.clearLayers();

    if (!showZones) return;

    projects.forEach(project => {
      const trackType = project.plots[0]?.trackType || 'forest';
      const color = TRACK_COLORS[trackType] || '#10b981';

      // Draw plot polygons
      project.plots.forEach(plot => {
        try {
          const coords = JSON.parse(plot.coordinates);
          if (!Array.isArray(coords) || coords.length < 3) return;
          const latLngs: L.LatLngExpression[] = coords.map((c: number[]) => [c[0], c[1]] as L.LatLngExpression);

          const polygon = L.polygon(latLngs, {
            color: color,
            weight: 2,
            opacity: 0.9,
            fillColor: color,
            fillOpacity: 0.2,
            dashArray: '6, 3',
          });

          polygon.bindPopup(`
            <div style="min-width: 180px; font-family: system-ui;">
              <h4 style="font-size: 13px; font-weight: 700; margin: 0 0 6px; color: #1f2937;">${plot.plotId}</h4>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;">
                <span style="background: ${color}20; color: ${color}; padding: 1px 8px; border-radius: 99px; font-size: 10px; font-weight: 500;">${trackType}</span>
                <span style="background: #ecfdf5; color: #047857; padding: 1px 8px; border-radius: 99px; font-size: 10px;">${plot.status}</span>
              </div>
              <div style="font-size: 11px; color: #6b7280;">Owner: ${plot.ownerInfo}</div>
              <div style="font-size: 11px; color: #6b7280;">Area: ${plot.areaHa.toLocaleString()} ha</div>
            </div>
          `, { className: 'custom-popup' });

          zoneGroupRef.current!.addLayer(polygon);
        } catch { /* ignore parse errors */ }
      });

      // Project center marker
      const totalCredits = project.credits.reduce((s, c) => s + c.amount, 0);
      const plotCount = project.plots.length;
      const sensorOnline = project.iotSensors.filter(s => s.status === 'online').length;

      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 40px; height: 40px; border-radius: 50%;
          background: ${color}; border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: bold; font-size: 12px;
          cursor: pointer; transition: transform 0.15s;
        " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
          ${plotCount}
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -22],
      });

      const marker = L.marker([project.centerLat, project.centerLng], { icon: markerIcon });
      marker.bindPopup(`
        <div style="min-width: 240px; font-family: system-ui;">
          <h3 style="font-size: 14px; font-weight: 700; margin: 0 0 8px; color: #1f2937;">${project.name}</h3>
          <p style="font-size: 11px; color: #6b7280; margin: 0 0 8px;">${project.description.substring(0, 80)}...</p>
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
            <span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 500;">${project.methodology}</span>
            <span style="background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 99px; font-size: 10px;">${project.status}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
            <div style="background: #f9fafb; padding: 6px; border-radius: 6px;">
              <div style="color: #6b7280; font-size: 10px;">Area</div>
              <div style="font-weight: 600;">${project.areaHa.toLocaleString()} ha</div>
            </div>
            <div style="background: #f9fafb; padding: 6px; border-radius: 6px;">
              <div style="color: #6b7280; font-size: 10px;">Plots</div>
              <div style="font-weight: 600;">${plotCount}</div>
            </div>
            <div style="background: #ecfdf5; padding: 6px; border-radius: 6px;">
              <div style="color: #047857; font-size: 10px;">Credits</div>
              <div style="font-weight: 600; color: #047857;">${totalCredits.toLocaleString()} tCO₂e</div>
            </div>
            <div style="background: #eff6ff; padding: 6px; border-radius: 6px;">
              <div style="color: #1d4ed8; font-size: 10px;">Sensors</div>
              <div style="font-weight: 600; color: #1d4ed8;">${sensorOnline}/${project.iotSensors.length}</div>
            </div>
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #6b7280;">
            📍 ${project.province}, ${project.region}
          </div>
        </div>
      `, { className: 'custom-popup', maxWidth: 280 });

      marker.on('click', () => onProjectClick(project));
      zoneGroupRef.current!.addLayer(marker);
    });
  }, [projects, showZones, onProjectClick]);

  // Draw IoT sensors
  useEffect(() => {
    if (!sensorGroupRef.current) return;
    sensorGroupRef.current.clearLayers();

    if (!showSensors) return;

    projects.forEach(project => {
      project.iotSensors.forEach(sensor => {
        const isOnline = sensor.status === 'online';
        const emoji = SENSOR_ICONS[sensor.sensorType] || '📡';

        const sensorIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 28px; height: 28px; border-radius: 8px;
            background: ${isOnline ? '#ecfdf5' : '#fef2f2'};
            border: 2px solid ${isOnline ? '#10b981' : '#ef4444'};
            box-shadow: 0 1px 6px rgba(0,0,0,0.15);
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; cursor: pointer;
            ${isOnline ? 'animation: sensorPulse 2s infinite;' : ''}
          " title="${sensor.sensorId}">${emoji}</div>
          <style>
            @keyframes sensorPulse {
              0%, 100% { box-shadow: 0 0 0 0 ${isOnline ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}; }
              50% { box-shadow: 0 0 0 4px ${isOnline ? 'rgba(16,185,129,0)' : 'rgba(239,68,68,0)'}; }
            }
          </style>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });

        const marker = L.marker([sensor.lat, sensor.lng], { icon: sensorIcon });
        const timeAgo = (() => {
          const diff = Date.now() - new Date(sensor.lastSeen).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 60) return `${mins}m ago`;
          return `${Math.floor(mins / 60)}h ago`;
        })();

        marker.bindPopup(`
          <div style="min-width: 200px; font-family: system-ui;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 20px;">${emoji}</span>
              <div>
                <h4 style="font-size: 13px; font-weight: 700; margin: 0; color: #1f2937;">${sensor.sensorId}</h4>
                <p style="font-size: 10px; color: #6b7280; margin: 0;">${sensor.sensorType.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
              <span style="margin-left: auto; background: ${isOnline ? '#ecfdf5' : '#fef2f2'}; color: ${isOnline ? '#047857' : '#dc2626'}; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 500;">
                ${isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div style="background: #f9fafb; border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 8px;">
              <div style="font-size: 24px; font-weight: 700; color: ${isOnline ? '#047857' : '#dc2626'};">${sensor.lastReading}</div>
              <div style="font-size: 11px; color: #6b7280;">${sensor.unit}</div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #6b7280;">
              <span>🔋 ${sensor.battery}%</span>
              <span>⏱ ${timeAgo}</span>
            </div>
            <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">📍 ${project.name}</div>
          </div>
        `, { className: 'custom-popup' });

        marker.on('click', () => onSensorClick(sensor));
        sensorGroupRef.current!.addLayer(marker);
      });
    });
  }, [projects, showSensors, onSensorClick]);

  // Fly-to
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo(flyTo.center, flyTo.zoom, { duration: 1.2 });
    const timer = setTimeout(onFlyComplete, 1500);
    return () => clearTimeout(timer);
  }, [flyTo, onFlyComplete]);

  if (!mounted) {
    return <div className="w-full h-full bg-muted/30 animate-pulse" />;
  }

  return (
    <div ref={containerRef} className="w-full h-full" style={{ minHeight: 400, background: '#1a1a2e' }} />
  );
}
