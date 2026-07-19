import { hasSupabaseConfig, supabase } from './supabase.js';

const cameraName = (cameraId) => {
  const number = cameraId.match(/(\d+)$/)?.[1];
  return number ? `Viltkamera ${Number(number)}` : cameraId;
};

const receivedLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Mottatt nylig';
  return `Mottatt ${date.toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })} kl. ${date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}`;
};

export const loadWildlifeCameras = async () => {
  if (!hasSupabaseConfig || !supabase) return [];

  const { data, error } = await supabase
    .from('wildlife_camera_images')
    .select('id,camera_id,image_path,received_at')
    .order('received_at', { ascending: false })
    .limit(60);

  if (error) throw error;

  const cameras = new Map();
  for (const image of data || []) {
    const { data: publicUrl } = supabase.storage
      .from('wildlife-camera-images')
      .getPublicUrl(image.image_path);
    if (!publicUrl?.publicUrl) continue;

    if (!cameras.has(image.camera_id)) {
      cameras.set(image.camera_id, {
        id: image.camera_id,
        name: cameraName(image.camera_id),
        description: 'Automatisk mottatte bilder fra kameraet på Kvamskogen.',
        images: [],
      });
    }
    cameras.get(image.camera_id).images.push({
      webp: publicUrl.publicUrl,
      avif: '',
      alt: `Bilde fra ${cameraName(image.camera_id)} på Kvamskogen`,
      received: receivedLabel(image.received_at),
    });
  }

  return [...cameras.values()];
};
