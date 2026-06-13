import { useState } from 'react';
import { saveLocalStory } from '../lib/stories.js';

const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_SIZE = 1.8 * 1024 * 1024;

const readImageFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Kunne ikke lese bildet.'));
  reader.readAsDataURL(file);
});

const StoryAdmin = ({ onPublished }) => {
  const [form, setForm] = useState({ title: '', text: '' });
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const addImages = async (event) => {
    const files = Array.from(event.target.files || []);
    setError('');

    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGE_COUNT) {
      setError(`Velg maks ${MAX_IMAGE_COUNT} bilder per historie.`);
      event.target.value = '';
      return;
    }

    const oversized = files.find((file) => file.size > MAX_IMAGE_SIZE);
    if (oversized) {
      setError('Ett eller flere bilder er for store. Bruk bilder under ca. 1,8 MB i denne første testversjonen.');
      event.target.value = '';
      return;
    }

    try {
      const nextImages = await Promise.all(files.map(readImageFile));
      setImages((current) => [...current, ...nextImages]);
    } catch (_) {
      setError('Kunne ikke lese bildene. Prøv gjerne med andre bildefiler.');
    } finally {
      event.target.value = '';
    }
  };

  const removeImage = (index) => {
    setImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const submit = (event) => {
    event.preventDefault();
    setError('');

    if (!form.title.trim() || !form.text.trim()) {
      setError('Skriv både overskrift og tekst før du publiserer.');
      return;
    }

    try {
      saveLocalStory({
        title: form.title,
        text: form.text,
        images,
      });
      setForm({ title: '', text: '' });
      setImages([]);
      setSaved(true);
      onPublished?.();
    } catch (_) {
      setError('Kunne ikke lagre historien i nettleseren. Prøv med færre eller mindre bilder.');
    }
  };

  return (
    <section className="section story-admin-page">
      <div className="container story-admin-container">
        <header className="story-admin-head">
          <div>
            <div className="eyebrow">Skjult publisering</div>
            <h1>Legg inn en historie</h1>
            <p>
              Første versjon lagrer historien lokalt i nettleseren, slik at vi kan teste flyten før vi kobler på en tryggere publiseringsløsning.
            </p>
          </div>
          {saved && <span className="story-admin-saved">Lagret og lagt til på Aktuelt</span>}
        </header>

        <form className="story-admin-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="story-title">Overskrift</label>
            <input
              id="story-title"
              required
              value={form.title}
              onChange={update('title')}
              placeholder="F.eks. Da hele grenda møtte opp i løypen"
            />
          </div>

          <div className="field">
            <label htmlFor="story-text">Tekst</label>
            <textarea
              id="story-text"
              required
              rows={9}
              value={form.text}
              onChange={update('text')}
              placeholder="Skriv historien her..."
            />
          </div>

          <div className="field">
            <label htmlFor="story-images">Bilder</label>
            <input
              id="story-images"
              type="file"
              accept="image/*"
              multiple
              onChange={addImages}
            />
            <p className="field-help">Du kan legge ved flere bilder. I denne testversjonen bør hvert bilde være under ca. 1,8 MB.</p>
          </div>

          {images.length > 0 && (
            <div className="story-image-preview" aria-label="Valgte bilder">
              {images.map((image, index) => (
                <figure key={`${image.slice(0, 30)}-${index}`}>
                  <img src={image} alt="" />
                  <button type="button" onClick={() => removeImage(index)}>Fjern</button>
                </figure>
              ))}
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="story-admin-actions">
            <button type="submit" className="btn btn-primary">Publiser på Aktuelt</button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default StoryAdmin;
