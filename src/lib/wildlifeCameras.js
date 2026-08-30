import { hasSupabaseConfig, supabase } from './supabase.js';

export const WILDLIFE_CAMERA_DEFINITIONS = [
  {
    id: 'modalen',
    name: 'Mødalen',
    description: 'Kamera i Mødalen, oppdatert med et nytt bilde omtrent hver time.',
    rotation: 1.5,
  },
  {
    id: 'byrkjefjell',
    name: 'Mot Byrkjefjell',
    description: 'Utsikt mot Byrkjefjell, oppdatert med et nytt bilde omtrent hver time.',
    rotation: 0,
  },
];

const receivedLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Mottatt nylig';
  return `Oppdatert ${date.toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })} kl. ${date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}`;
};

export const loadWildlifeCameras = async () => {
  const cameras = new Map(WILDLIFE_CAMERA_DEFINITIONS.map((camera) => [
    camera.id,
    { ...camera, images: [] },
  ]));

  if (!hasSupabaseConfig || !supabase) return [...cameras.values()];

  const { data, error } = await supabase
    .from('wildlife_camera_images')
    .select('id,camera_id,image_path,received_at')
    .in('camera_id', WILDLIFE_CAMERA_DEFINITIONS.map((camera) => camera.id))
    .order('received_at', { ascending: false })
    .limit(48);

  if (error) throw error;

  for (const image of data || []) {
    const camera = cameras.get(image.camera_id);
    if (!camera || camera.images.length >= 12) continue;

    const { data: publicUrl } = supabase.storage
      .from('wildlife-camera-images')
      .getPublicUrl(image.image_path);
    if (!publicUrl?.publicUrl) continue;

    camera.images.push({
      id: image.id,
      webp: publicUrl.publicUrl,
      avif: '',
      alt: `Bilde fra ${camera.name} på Kvamskogen`,
      received: receivedLabel(image.received_at),
    });
  }

  return [...cameras.values()];
};
