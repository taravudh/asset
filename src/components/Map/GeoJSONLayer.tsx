
import React from 'react';
import { GeoJSON } from 'react-leaflet';
import L, { LatLng, PathOptions } from 'leaflet';

interface GeoJSONLayerProps {
  layerId: string;
  data: any;
  color?: string;
  weight?: number;
  opacity?: number;
  fillOpacity?: number;
  onFeatureClick?: (feature: any, latlng: LatLng) => void;
}

const GeoJSONLayer: React.FC<GeoJSONLayerProps> = ({
  layerId,
  data,
  color = '#3388ff',
  weight = 3,
  opacity = 0.8,
  fillOpacity = 0.2,
  onFeatureClick
}) => {
  const style = (): PathOptions => ({
    color,
    weight,
    opacity,
    fillOpacity
  });

  const pointToLayer = (_feature: any, latlng: LatLng) => {
    return L.circleMarker(latlng, {
      radius: 8,
      fillColor: color,
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    });
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties) {
      const popupContent = document.createElement('div');
      popupContent.className = 'custom-popup';

      if (feature.properties.name || feature.properties.title) {
        const title = document.createElement('h3');
        title.className = 'font-bold mb-1';
        title.textContent = feature.properties.name || feature.properties.title;
        popupContent.appendChild(title);
      }

      if (feature.properties.description) {
        const desc = document.createElement('p');
        desc.className = 'mb-2 text-sm';
        desc.textContent = feature.properties.description;
        popupContent.appendChild(desc);
      }

      const propertiesTable = document.createElement('div');
      propertiesTable.className = 'mt-2 text-xs';

      const filteredProps = Object.entries(feature.properties).filter(
        ([key]) => !['name', 'title', 'description'].includes(key)
      );

      if (filteredProps.length > 0) {
        const propTitle = document.createElement('div');
        propTitle.className = 'font-medium text-gray-700 mb-1';
        propTitle.textContent = 'Properties:';
        propertiesTable.appendChild(propTitle);

        filteredProps.forEach(([key, value]) => {
          const row = document.createElement('div');
          row.className = 'flex items-start mb-1';

          const keyElem = document.createElement('span');
          keyElem.className = 'font-medium mr-1';
          keyElem.textContent = `${key}:`;
          row.appendChild(keyElem);

          const valueElem = document.createElement('span');
          valueElem.className = 'text-blue-600 cursor-pointer hover:underline';
          valueElem.textContent = String(value);

          valueElem.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(String(value))
              .then(() => {
                const originalText = valueElem.textContent;
                valueElem.textContent = '✓ Copied!';
                valueElem.className = 'text-green-600';
                setTimeout(() => {
                  valueElem.textContent = originalText;
                  valueElem.className = 'text-blue-600 cursor-pointer hover:underline';
                }, 1000);
              })
              .catch(err => console.error('Failed to copy text: ', err));
          };

          row.appendChild(valueElem);
          propertiesTable.appendChild(row);
        });

        popupContent.appendChild(propertiesTable);
      }

      layer.bindPopup(L.popup({ maxWidth: 300, className: 'custom-popup' }).setContent(popupContent));
    }

    if (onFeatureClick) {
      layer.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        onFeatureClick(feature, e.latlng);
      });
    }
  };

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) return null;

  return (
    <GeoJSON
      key={`${layerId}-${JSON.stringify(data)}`}
      data={data}
      style={style as PathOptions}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  );
};

export default GeoJSONLayer;
