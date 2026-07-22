import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { dataService } from '../services/dataService';

export default function LaserProgressGallery({ sessions = [] }) {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    let active = true;
    const paths = sessions
      .flatMap(session => [
        session.before_photo_url && { id: `${session.id}-before`, label: 'Antes', path: session.before_photo_url },
        session.after_photo_url && { id: `${session.id}-after`, label: 'Después', path: session.after_photo_url },
      ])
      .filter(Boolean)
      .slice(-4);
    Promise.all(paths.map(async photo => ({
      ...photo,
      url: await dataService.getLaserProgressPhotoUrl(photo.path),
    }))).then(result => {
      if (active) setPhotos(result);
    }).catch(error => console.error('No se pudieron cargar las fotos láser', error));
    return () => { active = false; };
  }, [sessions]);

  if (photos.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8c767b', fontSize: 11, fontWeight: 800, marginBottom: 7 }}>
        <Camera size={13} /> Seguimiento privado
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(photos.length, 4)}, 1fr)`, gap: 6 }}>
        {photos.map(photo => (
          <figure key={photo.id} style={{ margin: 0, position: 'relative' }}>
            <img src={photo.url} alt={`${photo.label} del tratamiento láser`} style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 10 }} />
            <figcaption style={{ position: 'absolute', left: 4, bottom: 4, padding: '2px 5px', borderRadius: 6, background: 'rgba(45,27,34,.72)', color: '#fff', fontSize: 9, fontWeight: 800 }}>{photo.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
