'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MapPin, Leaf, Award, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface MapPlot {
  id: string;
  plotId: string;
  coordinates: [number, number][]; // [[lat, lon], ...]
  trackType: string;
  status: string;
  ownerInfo: string;
  projectId: string;
  projectName: string;
  credits: number;
  certificates: number;
}

export interface MapProject {
  id: string;
  name: string;
  methodology: string;
  status: string;
  areaHa: number;
  location: string;
  center: [number, number];
  plots: MapPlot[];
  totalCredits: number;
  totalCertificates: number;
}

interface ProjectMapProps {
  projects: MapProject[];
  loading?: boolean;
  onProjectClick?: (projectId: string) => void;
}

const trackTypeColors: Record<string, string> = {
  forest: '#10b981',
  biochar: '#f59e0b',
  awd: '#3b82f6',
  biogas: '#8b5cf6',
  solar: '#ef4444',
  '': '#6b7280',
};

const trackTypeLabels: Record<string, string> = {
  forest: 'Blue Carbon / Forest',
  biochar: 'Biochar',
  awd: 'AWD Rice',
  biogas: 'Biogas',
  solar: 'Solar PV',
  '': 'Unknown',
};

const statusColors: Record<string, string> = {
  REGISTERED: '#10b981',
  VERIFIED: '#3b82f6',
  ACTIVE: '#10b981',
};

function ProjectMapInner({ projects, onProjectClick }: ProjectMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const [selectedProject, setSelectedProject] = useState<MapProject | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    // Dynamic import of Leaflet
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
    ]).then(([L, RL]) => {
      // Fix default marker icon issue with webpack
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!mapRef.current || mapInstanceRef.current) return;

      // Create map centered on Thailand
      const map = L.map(mapRef.current, {
        center: [13.75, 100.5],
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add project markers and plot polygons
      projects.forEach((project) => {
        // Create custom marker icon with project color
        const markerColor = project.plots.length > 0
          ? trackTypeColors[project.plots[0].trackType] || '#10b981'
          : '#10b981';

        const markerIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${markerColor};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 11px;
            cursor: pointer;
          ">${project.plots.length}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(project.center, { icon: markerIcon }).addTo(map);

        // Popup content
        const popupContent = `
          <div style="min-width: 200px; font-family: system-ui;">
            <h3 style="font-size: 14px; font-weight: 700; margin: 0 0 8px; color: #1f2937;">${project.name}</h3>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
              <span style="background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500;">${project.methodology}</span>
              <span style="background: ${project.status === 'Active' ? '#ecfdf5' : '#fef3c7'}; color: ${project.status === 'Active' ? '#047857' : '#b45309'}; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500;">${project.status}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
              <div style="background: #f9fafb; padding: 6px; border-radius: 6px;">
                <div style="color: #6b7280; font-size: 10px;">Area</div>
                <div style="font-weight: 600; color: #374151;">${project.areaHa.toLocaleString()} ha</div>
              </div>
              <div style="background: #f9fafb; padding: 6px; border-radius: 6px;">
                <div style="color: #6b7280; font-size: 10px;">Plots</div>
                <div style="font-weight: 600; color: #374151;">${project.plots.length}</div>
              </div>
              <div style="background: #ecfdf5; padding: 6px; border-radius: 6px;">
                <div style="color: #047857; font-size: 10px;">Credits</div>
                <div style="font-weight: 600; color: #047857;">${project.totalCredits.toLocaleString()} tCO2e</div>
              </div>
              <div style="background: #fffbeb; padding: 6px; border-radius: 6px;">
                <div style="color: #b45309; font-size: 10px;">Certificates</div>
                <div style="font-weight: 600; color: #b45309;">${project.totalCertificates}</div>
              </div>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #6b7280;">
              📍 ${project.location}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 280,
          className: 'custom-popup',
        });

        marker.on('click', () => {
          setSelectedProject(project);
        });

        // Add plot polygons
        project.plots.forEach((plot) => {
          if (plot.coordinates.length > 0) {
            const plotColor = trackTypeColors[plot.trackType] || '#6b7280';
            const polygon = L.polygon(
              plot.coordinates,
              {
                color: plotColor,
                weight: 2,
                opacity: 0.8,
                fillColor: plotColor,
                fillOpacity: 0.25,
                dashArray: '5, 5',
              }
            ).addTo(map);

            polygon.bindPopup(`
              <div style="font-family: system-ui; min-width: 160px;">
                <h4 style="font-size: 13px; font-weight: 600; margin: 0 0 6px;">${plot.plotId}</h4>
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
                  <span style="background: ${plotColor}22; color: ${plotColor}; padding: 1px 6px; border-radius: 4px;">${trackTypeLabels[plot.trackType] || plot.trackType}</span>
                </div>
                <div style="font-size: 11px; color: #6b7280;">Owner: ${plot.ownerInfo}</div>
                <div style="font-size: 11px;">
                  Status: <span style="color: ${statusColors[plot.status] || '#6b7280'}; font-weight: 500;">${plot.status}</span>
                </div>
              </div>
            `);
          }
        });
      });

      // Fit bounds if projects exist
      if (projects.length > 0) {
        const bounds = L.latLngBounds(projects.map((p) => p.center));
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      setLeafletLoaded(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [projects, onProjectClick]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: 400 }} />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-2">Plot Types</p>
        <div className="space-y-1.5">
          {Object.entries(trackTypeLabels).filter(([k]) => k).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ background: trackTypeColors[key] }}
              />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Project Info */}
      {selectedProject && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border p-4 max-w-[240px]">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-gray-900 leading-tight">{selectedProject.name}</h4>
            <button
              onClick={() => setSelectedProject(null)}
              className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">{selectedProject.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Leaf className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-700 font-medium">{selectedProject.totalCredits.toLocaleString()} tCO2e</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-amber-700">{selectedProject.totalCertificates} certificates</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedProject.plots.map((p) => (
              <Badge
                key={p.id}
                variant="secondary"
                className="text-[9px] h-4"
                style={{
                  background: `${trackTypeColors[p.trackType] || '#6b7280'}20`,
                  color: trackTypeColors[p.trackType] || '#6b7280',
                }}
              >
                {p.plotId}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const emptySubscribe = () => () => {};

export default function ProjectMap(props: ProjectMapProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden">
        <Skeleton className="w-full h-full" style={{ minHeight: 400 }} />
      </div>
    );
  }

  return <ProjectMapInner {...props} />;
}
