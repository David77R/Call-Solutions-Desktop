import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { REMARKETING_ZONES } from '../../data/remarketingZones';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/{layer}/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAX_TILE_ERRORS = 4;
const LABEL_ZOOM = 11.5;
const META = Object.fromEntries(REMARKETING_ZONES.map((z) => [z.zip, z]));
const ALL_BOUNDS = L.latLngBounds(REMARKETING_ZONES.map((z) => [z.lat, z.lng]));

function regionBounds(layers, region) {
  const picked = Object.entries(layers).filter(([zip]) => region === 'all' || META[zip]?.region === region);
  if (!picked.length) return ALL_BOUNDS;
  return picked.reduce((b, [, layer]) => b.extend(layer.getBounds()), L.latLngBounds(picked[0][1].getBounds()));
}

export default function ZoneMap({ zips, region, focus, hoverZip, onToggle, onHover }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const layers = useRef({});
  const handlers = useRef({ onToggle, onHover });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlers.current = { onToggle, onHover };
  }, [onToggle, onHover]);

  useEffect(() => {
    const map = L.map(el.current, {
      zoomControl: false,
      minZoom: 8,
      maxZoom: 16,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 110,
    });
    mapRef.current = map;
    map.fitBounds(ALL_BOUNDS, { padding: [24, 24] });
    map.attributionControl.setPrefix(false);
    L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);

    map.createPane('zones').style.zIndex = 410;
    const places = map.createPane('places');
    places.style.zIndex = 420;
    places.style.pointerEvents = 'none';
    const zipPane = map.createPane('zipLabels');
    zipPane.style.zIndex = 430;
    zipPane.style.pointerEvents = 'none';

    const base = L.tileLayer(ESRI, { layer: 'World_Dark_Gray_Base', maxNativeZoom: 16, maxZoom: 19, attribution: ESRI_ATTRIBUTION, className: 'rmk-tiles' }).addTo(map);
    const reference = L.tileLayer(ESRI, { layer: 'World_Dark_Gray_Reference', maxNativeZoom: 16, maxZoom: 19, pane: 'places', className: 'rmk-tiles-labels' }).addTo(map);
    let tileErrors = 0;
    base.on('tileerror', () => {
      tileErrors += 1;
      if (tileErrors !== MAX_TILE_ERRORS) return;
      base.remove();
      reference.remove();
      L.tileLayer(OSM, { maxZoom: 19, attribution: OSM_ATTRIBUTION, className: 'rmk-tiles-osm' }).addTo(map);
    });

    const zipLabels = L.layerGroup(
      REMARKETING_ZONES.map((z) =>
        L.marker([z.lat, z.lng], {
          pane: 'zipLabels',
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: 'rmk-zip', html: `<span>${z.zip}</span>`, iconSize: null }),
        })
      )
    );
    const syncLabels = () => {
      if (map.getZoom() >= LABEL_ZOOM) zipLabels.addTo(map);
      else zipLabels.remove();
    };
    map.on('zoomend', syncLabels);
    syncLabels();

    let cancelled = false;
    fetch('/zonas-remarketing.geojson')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        L.geoJSON(data, {
          pane: 'zones',
          style: () => ({ className: 'rmk-zone', weight: 1.4 }),
          onEachFeature: (feature, layer) => {
            const zone = META[feature.properties.zip];
            if (!zone) return;
            layers.current[zone.zip] = layer;
            layer.on({
              click: () => handlers.current.onToggle(zone),
              mouseover: () => {
                layer.bringToFront();
                handlers.current.onHover(zone);
              },
              mouseout: () => handlers.current.onHover(null),
            });
          },
        }).addTo(map);
        setReady(true);
      })
      .catch(() => {});

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el.current);

    return () => {
      cancelled = true;
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      layers.current = {};
      setReady(false);
    };
  }, []);

  useEffect(() => {
    for (const [zip, layer] of Object.entries(layers.current)) {
      const path = layer.getElement();
      if (!path) continue;
      path.classList.toggle('is-done', !!zips[zip]?.done);
      path.classList.toggle('is-dim', region !== 'all' && META[zip]?.region !== region);
    }
  }, [zips, region, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.flyToBounds(regionBounds(layers.current, region), { padding: [28, 28], duration: 0.9 });
  }, [region, ready]);

  useEffect(() => {
    const layer = hoverZip && layers.current[hoverZip];
    const path = layer?.getElement();
    if (!path) return undefined;
    layer.bringToFront();
    path.classList.add('is-hover');
    return () => path.classList.remove('is-hover');
  }, [hoverZip, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = focus && layers.current[focus.zip];
    const path = layer?.getElement();
    if (!map || !path) return undefined;
    map.flyToBounds(layer.getBounds(), { padding: [80, 80], maxZoom: 13, duration: 0.9 });
    layer.bringToFront();
    path.classList.remove('is-focus');
    void path.getBoundingClientRect();
    path.classList.add('is-focus');
    const t = setTimeout(() => path.classList.remove('is-focus'), 2400);
    return () => clearTimeout(t);
  }, [focus, ready]);

  return <div ref={el} className="rmk__map" role="region" aria-label="Mapa de zonas de remarketing" />;
}
