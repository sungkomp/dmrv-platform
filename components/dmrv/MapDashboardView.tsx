'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin, Satellite, Radio, Leaf, TreePine, Flame, Droplets, Zap, Sun,
  RefreshCw, Layers, Eye, EyeOff, ChevronDown, ChevronRight, Battery,
  Activity, Thermometer, Droplet, Wind, Gauge, CloudRain,
  ArrowUpRight, X, Maximize2, Minimize2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';

const DmrvMap = dynamic(() => import('./DmrvMap'), { ssr: false });

// Types
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

interface MapData {
  projects: MapProject[];
  stats: {
    totalProjects: number;
    activeProjects: number;
    totalAreaHa: number;
    totalCredits: number;
    totalSensors: number;
    onlineSensors: number;
    totalPlots: number;
  };
  sensorSummary: {
    byType: Record<string, { count: number; online: number; avgReading: number }>;
    recentAlerts: Array<{ sensorId: string; type: string; message: string; timestamp: string }>;
  };
}

// Config
const TRACK_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  forest: { label: 'Blue Carbon / Forest', icon: TreePine, color: '#10b981', bgColor: 'bg-emerald-50' },
  biochar: { label: 'Biochar', icon: Flame, color: '#f59e0b', bgColor: 'bg-amber-50' },
  awd: { label: 'AWD Rice', icon: Droplets, color: '#3b82f6', bgColor: 'bg-blue-50' },
  biogas: { label: 'Biogas', icon: Zap, color: '#8b5cf6', bgColor: 'bg-violet-50' },
  solar: { label: 'Solar PV', icon: Sun, color: '#ef4444', bgColor: 'bg-red-50' },
};

const SENSOR_CONFIG: Record<string, { label: string; icon: React.ElementType; unit: string; color: string }> = {
  soil_moisture: { label: 'Soil Moisture', icon: Droplet, unit: '%', color: '#3b82f6' },
  temperature: { label: 'Temperature', icon: Thermometer, unit: '°C', color: '#ef4444' },
  humidity: { label: 'Humidity', icon: CloudRain, unit: '%', color: '#06b6d4' },
  ch4: { label: 'CH₄', icon: Wind, unit: 'ppm', color: '#8b5cf6' },
  co2: { label: 'CO₂', icon: Gauge, unit: 'ppm', color: '#6b7280' },
  water_level: { label: 'Water Level', icon: Droplets, unit: 'cm', color: '#0ea5e9' },
  ph: { label: 'pH', icon: Gauge, unit: 'pH', color: '#22c55e' },
  wind_speed: { label: 'Wind Speed', icon: Wind, unit: 'm/s', color: '#94a3b8' },
  solar_irradiance: { label: 'Solar Irradiance', icon: Sun, unit: 'W/m²', color: '#f59e0b' },
};

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MapDashboardView() {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<MapProject | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<MapSensor | null>(null);
  const [showZones, setShowZones] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showSatellite, setShowSatellite] = useState(true);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'projects' | 'sensors' | 'layers'>('projects');
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dmrv/map');
      if (!res.ok) throw new Error('Failed to load map data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProjectClick = useCallback((project: MapProject) => {
    setSelectedProject(project);
    setSelectedSensor(null);
    setFlyTo({ center: [project.centerLat, project.centerLng], zoom: 10 });
  }, []);

  const handleSensorClick = useCallback((sensor: MapSensor) => {
    setSelectedSensor(sensor);
    setFlyTo({ center: [sensor.lat, sensor.lng], zoom: 14 });
  }, []);

  const allSensors = useMemo(() => {
    if (!data) return [];
    return data.projects.flatMap(p => p.iotSensors.map(s => ({ ...s, projectName: p.name, projectId: p.id })));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error: {error}</p>
          <Button onClick={fetchData} variant="outline" size="sm"><RefreshCw className="h-3 w-3 mr-1" />Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${mapFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Stats Bar */}
      {!mapFullscreen && data && (
        <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-none">
          {[
            { icon: MapPin, label: 'Projects', value: data.stats.totalProjects, sub: `${data.stats.activeProjects} active`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: Leaf, label: 'Credits (tCO₂e)', value: formatNumber(data.stats.totalCredits), sub: 'Total quantified', color: 'text-green-600', bg: 'bg-green-50' },
            { icon: Radio, label: 'IoT Sensors', value: data.stats.totalSensors, sub: `${data.stats.onlineSensors} online`, color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: Satellite, label: 'Total Area', value: `${formatNumber(data.stats.totalAreaHa)} ha`, sub: `${data.stats.totalPlots} plots`, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => (
            <Card key={s.label} className="min-w-[160px] shadow-none border-dashed">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-lg font-bold leading-none">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground/70">{s.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Map Area */}
      <div className="flex-1 flex gap-4 min-h-0" style={{ minHeight: mapFullscreen ? '100vh' : 560 }}>
        {/* Map */}
        <div className="flex-1 relative rounded-xl overflow-hidden border shadow-sm">
          <DmrvMap
            projects={data?.projects || []}
            showZones={showZones}
            showSensors={showSensors}
            showSatellite={showSatellite}
            selectedProject={selectedProject}
            selectedSensor={selectedSensor}
            flyTo={flyTo}
            onFlyComplete={() => setFlyTo(null)}
            onProjectClick={handleProjectClick}
            onSensorClick={handleSensorClick}
          />

          {/* Map Controls */}
          <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
            <Button size="sm" variant="secondary" className="h-8 gap-1.5 shadow-md text-xs backdrop-blur-xl"
              onClick={() => setShowSatellite(!showSatellite)}>
              {showSatellite ? <Satellite className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              {showSatellite ? 'Satellite' : 'Street'}
            </Button>
            <Button size="sm" variant="secondary" className="h-8 gap-1.5 shadow-md text-xs backdrop-blur-xl"
              onClick={() => setShowZones(!showZones)}>
              {showZones ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              Zones
            </Button>
            <Button size="sm" variant="secondary" className="h-8 gap-1.5 shadow-md text-xs backdrop-blur-xl"
              onClick={() => setShowSensors(!showSensors)}>
              {showSensors ? <Radio className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              IoT
            </Button>
          </div>

          {/* Fullscreen Toggle */}
          <Button size="sm" variant="secondary" className="absolute top-3 right-3 z-[1000] h-8 w-8 p-0 shadow-md backdrop-blur-xl"
            onClick={() => setMapFullscreen(!mapFullscreen)}>
            {mapFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-background/95 backdrop-blur-xl rounded-lg shadow-lg border p-3 text-xs">
            <p className="font-semibold text-muted-foreground mb-2 text-[10px] uppercase tracking-wider">Activity Types</p>
            <div className="space-y-1.5">
              {Object.entries(TRACK_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full shadow-sm" style={{ background: cfg.color }} />
                  <span className="text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
            </div>
            {showSensors && (
              <>
                <Separator className="my-2" />
                <p className="font-semibold text-muted-foreground mb-1.5 text-[10px] uppercase tracking-wider">IoT Sensors</p>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
                  <span className="text-muted-foreground">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500 shadow-sm" />
                  <span className="text-muted-foreground">Offline</span>
                </div>
              </>
            )}
          </div>

          {/* Selected Project Info Overlay */}
          {selectedProject && !mapFullscreen && (
            <div className="absolute top-3 right-14 z-[1000] bg-background/95 backdrop-blur-xl rounded-lg shadow-lg border p-4 max-w-[280px]">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm leading-tight">{selectedProject.name}</h4>
                <button onClick={() => setSelectedProject(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{selectedProject.province} · {selectedProject.region}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-50 text-emerald-700">{selectedProject.status}</Badge>
                <Badge variant="outline" className="text-[9px] h-4">{selectedProject.methodology}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Area</p>
                  <p className="text-sm font-bold">{selectedProject.areaHa.toLocaleString()} ha</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-emerald-600">Credits</p>
                  <p className="text-sm font-bold text-emerald-700">{selectedProject.credits.reduce((s, c) => s + c.amount, 0).toLocaleString()}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Plots</p>
                  <p className="text-sm font-bold">{selectedProject.plots.length}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-blue-600">Sensors</p>
                  <p className="text-sm font-bold text-blue-700">{selectedProject.iotSensors.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {!mapFullscreen && (
          <div className="w-[320px] shrink-0 flex flex-col gap-4 max-lg:hidden">
            <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as typeof sidebarTab)}>
              <TabsList className="w-full h-8">
                <TabsTrigger value="projects" className="text-xs flex-1 h-6 gap-1">
                  <MapPin className="h-3 w-3" /> Projects
                </TabsTrigger>
                <TabsTrigger value="sensors" className="text-xs flex-1 h-6 gap-1">
                  <Radio className="h-3 w-3" /> IoT
                </TabsTrigger>
                <TabsTrigger value="layers" className="text-xs flex-1 h-6 gap-1">
                  <Layers className="h-3 w-3" /> Layers
                </TabsTrigger>
              </TabsList>

              {/* Projects Tab */}
              <TabsContent value="projects" className="mt-3">
                <ScrollArea className="h-[480px]">
                  <div className="space-y-2 pr-2">
                    {data?.projects.map(project => {
                      const trackType = project.plots[0]?.trackType || 'forest';
                      const trackCfg = TRACK_CONFIG[trackType] || TRACK_CONFIG.forest;
                      const Icon = trackCfg.icon;
                      const isSelected = selectedProject?.id === project.id;
                      const onlineSensors = project.iotSensors.filter(s => s.status === 'online').length;
                      return (
                        <button key={project.id}
                          className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-sm ${isSelected ? 'border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20' : 'border-border/50'}`}
                          onClick={() => handleProjectClick(project)}>
                          <div className="flex items-start gap-2.5">
                            <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${trackCfg.color}15` }}>
                              <Icon className="h-4 w-4" style={{ color: trackCfg.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{project.name}</p>
                              <p className="text-[11px] text-muted-foreground">{project.province} · {project.areaHa.toLocaleString()} ha</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                  {project.status}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Radio className="h-2.5 w-2.5" /> {onlineSensors}/{project.iotSensors.length}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                                  <Leaf className="h-2.5 w-2.5" /> {project.credits.reduce((s, c) => s + c.amount, 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Sensors Tab */}
              <TabsContent value="sensors" className="mt-3">
                <ScrollArea className="h-[480px]">
                  <div className="space-y-2 pr-2">
                    {/* Sensor Summary */}
                    {data?.sensorSummary.byType && Object.entries(data.sensorSummary.byType).map(([type, info]) => {
                      const cfg = SENSOR_CONFIG[type];
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return (
                        <div key={type} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                          <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `${cfg.color}15` }}>
                            <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{cfg.label}</p>
                            <p className="text-[10px] text-muted-foreground">{info.online}/{info.count} online · avg {info.avgReading.toFixed(1)} {cfg.unit}</p>
                          </div>
                        </div>
                      );
                    })}
                    <Separator className="my-2" />
                    {/* Individual Sensors */}
                    {allSensors.map(sensor => {
                      const cfg = SENSOR_CONFIG[sensor.sensorType] || SENSOR_CONFIG.temperature;
                      const Icon = cfg.icon;
                      const isOnline = sensor.status === 'online';
                      const isSelected = selectedSensor?.id === sensor.id;
                      return (
                        <button key={sensor.id}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all hover:shadow-sm ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-border/50'}`}
                          onClick={() => handleSensorClick(sensor)}>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `${cfg.color}15` }}>
                                <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-medium truncate">{sensor.sensorId}</p>
                                <span className="text-[9px] text-muted-foreground">{cfg.label}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold" style={{ color: cfg.color }}>{sensor.lastReading}{cfg.unit}</span>
                                <span className="text-[9px] text-muted-foreground">
                                  <Battery className="h-2.5 w-2.5 inline mr-0.5" />{sensor.battery}%
                                </span>
                                <span className="text-[9px] text-muted-foreground">{timeAgo(sensor.lastSeen)}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Layers Tab */}
              <TabsContent value="layers" className="mt-3">
                <div className="space-y-3 pr-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Map Style</p>
                    {[
                      { label: 'Satellite Imagery', icon: Satellite, active: showSatellite, toggle: () => setShowSatellite(true) },
                      { label: 'Street Map', icon: MapPin, active: !showSatellite, toggle: () => setShowSatellite(false) },
                    ].map(item => (
                      <button key={item.label}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-sm transition-all ${item.active ? 'border-primary/40 bg-primary/5' : 'border-border/50 hover:border-border'}`}
                        onClick={item.toggle}>
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{item.label}</span>
                        {item.active && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Overlays</p>
                    {[
                      { label: 'Project Zones', icon: Layers, active: showZones, toggle: () => setShowZones(!showZones) },
                      { label: 'IoT Sensors', icon: Radio, active: showSensors, toggle: () => setShowSensors(!showSensors) },
                    ].map(item => (
                      <button key={item.label}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-sm transition-all ${item.active ? 'border-primary/40 bg-primary/5' : 'border-border/50 hover:border-border'}`}
                        onClick={item.toggle}>
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{item.label}</span>
                        {item.active ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Activity Types</p>
                    {Object.entries(TRACK_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const count = data?.projects.filter(p => p.plots[0]?.trackType === key).length || 0;
                      return (
                        <div key={key} className="flex items-center gap-2.5 p-2 text-sm">
                          <div className="h-3 w-3 rounded-full" style={{ background: cfg.color }} />
                          <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                          <span className="flex-1">{cfg.label}</span>
                          <Badge variant="secondary" className="text-[9px] h-4">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
