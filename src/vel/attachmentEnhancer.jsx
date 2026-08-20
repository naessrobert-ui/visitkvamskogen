import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import './attachments.css';

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
const IMAGE_EXTENSIONS = /\.(?:jpe?g|png|webp|gif|avif)$/i;

const currentCaseId = () => new URLSearchParams(window.location.search).get('sak');
const formatBytes = (bytes) => `${(Number(bytes || 0) / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
const cleanFileName = (name) => String(name || 'vedlegg')
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .slice(-120);
const canDisplayImage = (fileOrAttachment) => {
  const type = String(fileOrAttachment?.type || fileOrAttachment?.content_type || '').toLowerCase();
  const name = String(fileOrAttachment?.name || fileOrAttachment?.file_name || '');
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(type) || IMAGE_EXTENSIONS.test(name);
};

const AttachmentEnhancer = () => {
  const [lightbox, setLightbox] = useState(null);
  const [toast, setToast] = useState('');
  const selectionsRef = useRef(new WeakMap());
  const memberIdRef = useRef(null);
  const previewUrlsRef = useRef(new WeakMap());
  const lastCaseIdRef = useRef(null);
  const knownImageCountRef = useRef(0);
  const galleryBusyRef = useRef(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (!supabase) return undefined;

    const flash = (message) => {
      setToast(message);
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(''), 5000);
    };

    const getMemberId = async () => {
      if (memberIdRef.current) return memberIdRef.current;
      const { data, error } = await supabase.rpc('current_vel_member_id');
      if (error || !data) throw error || new Error('Fant ikke styremedlemmet.');
      memberIdRef.current = data;
      return data;
    };

    const validateFiles = (files) => {
      if (files.length > MAX_FILES) return `Du kan legge ved maks ${MAX_FILES} filer om gangen.`;
      const total = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
      if (total > MAX_TOTAL_BYTES) return `Vedleggene er ${formatBytes(total)}. Maksgrensen er 10 MB samlet.`;
      return '';
    };

    const revokePreviewUrls = (input) => {
      const urls = previewUrlsRef.current.get(input) || [];
      urls.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.set(input, []);
    };

    const previewHost = (input) => {
      const form = input.closest('form');
      if (!form) return null;
      let host = form.querySelector(':scope > .vel-multi-preview');
      if (!host) {
        host = document.createElement('div');
        host.className = 'vel-multi-preview';
        if (form.classList.contains('vel-comment-form')) form.append(host);
        else input.closest('.vel-file-field')?.insertAdjacentElement('afterend', host);
      }
      return host;
    };

    const setInputFiles = (input, files) => {
      if (typeof DataTransfer === 'undefined') return;
      const transfer = new DataTransfer();
      files.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const renderSelection = (input) => {
      if (!document.contains(input)) return;
      const host = previewHost(input);
      if (!host) return;
      revokePreviewUrls(input);
      host.replaceChildren();
      const files = selectionsRef.current.get(input) || [];
      if (!files.length) {
        host.hidden = true;
        return;
      }

      host.hidden = false;
      const total = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
      const summary = document.createElement('div');
      summary.className = 'vel-upload-summary';
      const summaryText = document.createElement('b');
      summaryText.textContent = `${files.length} ${files.length === 1 ? 'fil' : 'filer'} valgt`;
      const summarySize = document.createElement('span');
      summarySize.textContent = `${formatBytes(total)} av 10 MB`;
      summary.append(summaryText, summarySize);
      host.append(summary);

      const grid = document.createElement('div');
      grid.className = 'vel-upload-preview-grid';
      const objectUrls = [];
      files.forEach((file, index) => {
        const tile = document.createElement('div');
        tile.className = `vel-upload-preview ${canDisplayImage(file) ? 'is-image' : 'is-file'}`;
        if (canDisplayImage(file)) {
          const url = URL.createObjectURL(file);
          objectUrls.push(url);
          const image = document.createElement('img');
          image.src = url;
          image.alt = file.name;
          tile.append(image);
        } else {
          const icon = document.createElement('span');
          icon.className = 'vel-upload-file-icon';
          icon.textContent = '▤';
          tile.append(icon);
        }
        const name = document.createElement('small');
        name.textContent = file.name;
        tile.append(name);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'vel-upload-remove';
        remove.setAttribute('aria-label', `Fjern ${file.name}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => {
          const next = (selectionsRef.current.get(input) || []).filter((_, fileIndex) => fileIndex !== index);
          setInputFiles(input, next);
        });
        tile.append(remove);
        grid.append(tile);
      });
      previewUrlsRef.current.set(input, objectUrls);
      host.append(grid);
    };

    const uploadFiles = async ({ caseId, commentId = null, files }) => {
      if (!files.length) return { uploaded: 0, failed: 0 };
      const memberId = await getMemberId();
      let uploaded = 0;
      let failed = 0;
      for (const file of files) {
        const storagePath = `${memberId}/${caseId}/${crypto.randomUUID()}-${cleanFileName(file.name)}`;
        const storageResult = await supabase.storage.from('vel-attachments').upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (storageResult.error) {
          failed += 1;
          continue;
        }
        const metadata = await supabase.from('vel_attachments').insert({
          case_id: caseId,
          comment_id: commentId,
          uploaded_by: memberId,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream',
        });
        if (metadata.error) {
          failed += 1;
          await supabase.storage.from('vel-attachments').remove([storagePath]);
          continue;
        }
        uploaded += 1;
      }
      return { uploaded, failed };
    };

    const createGallery = (items) => {
      if (!items.length) return null;
      const gallery = document.createElement('div');
      gallery.className = `vel-inline-media-gallery ${items.length === 1 ? 'is-single' : ''}`;
      gallery.dataset.velInlineGallery = '1';
      items.forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'vel-inline-media';
        button.setAttribute('aria-label', `Vis ${item.file_name} stort`);
        const image = document.createElement('img');
        image.src = item.signedUrl;
        image.alt = item.file_name;
        image.loading = 'lazy';
        button.append(image);
        button.addEventListener('click', () => setLightbox({ url: item.signedUrl, name: item.file_name }));
        gallery.append(button);
      });
      return gallery;
    };

    const hideOriginalImageLinks = (attachments) => {
      const imageNames = new Set(attachments.filter(canDisplayImage).map((item) => item.file_name));
      document.querySelectorAll('.vel-content-card .vel-attachments button').forEach((button) => {
        const name = button.querySelector('b')?.textContent?.trim();
        if (name && imageNames.has(name)) button.style.display = 'none';
      });
      document.querySelectorAll('.vel-inline-attachment').forEach((button) => {
        const text = button.textContent || '';
        if ([...imageNames].some((name) => text.includes(name))) button.style.display = 'none';
      });
      document.querySelectorAll('.vel-attachments').forEach((section) => {
        const visibleButtons = [...section.querySelectorAll('button')].some((button) => button.style.display !== 'none');
        if (!visibleButtons) section.style.display = 'none';
      });
    };

    const loadGalleries = async (caseId) => {
      if (!caseId || galleryBusyRef.current) return;
      galleryBusyRef.current = true;
      try {
        const [{ data: attachments, error: attachmentError }, { data: comments, error: commentsError }] = await Promise.all([
          supabase.from('vel_attachments').select('id, case_id, comment_id, file_name, file_size, content_type, storage_path, created_at').eq('case_id', caseId).order('created_at', { ascending: true }),
          supabase.from('vel_comments').select('id, created_at').eq('case_id', caseId).order('created_at', { ascending: true }),
        ]);
        if (attachmentError || commentsError) return;
        const images = (attachments || []).filter(canDisplayImage);
        knownImageCountRef.current = images.length;
        const withUrls = await Promise.all(images.map(async (item) => {
          const { data, error } = await supabase.storage.from('vel-attachments').createSignedUrl(item.storage_path, 3600);
          return error ? null : { ...item, signedUrl: data.signedUrl };
        }));
        const ready = withUrls.filter(Boolean);

        document.querySelectorAll('[data-vel-inline-gallery="1"]').forEach((node) => node.remove());
        document.querySelectorAll('.vel-content-card .vel-attachments, .vel-inline-attachment').forEach((node) => { node.style.display = ''; });

        const caseImages = ready.filter((item) => !item.comment_id);
        const contentCard = document.querySelector('.vel-content-card');
        const caseGallery = createGallery(caseImages);
        if (contentCard && caseGallery) {
          const attachmentsSection = contentCard.querySelector('.vel-attachments');
          if (attachmentsSection) contentCard.insertBefore(caseGallery, attachmentsSection);
          else contentCard.append(caseGallery);
        }

        const commentArticles = [...document.querySelectorAll('.vel-comments > article')];
        (comments || []).forEach((comment, index) => {
          const commentImages = ready.filter((item) => item.comment_id === comment.id);
          const gallery = createGallery(commentImages);
          if (gallery && commentArticles[index]) commentArticles[index].querySelector('div')?.append(gallery);
        });
        hideOriginalImageLinks(attachments || []);
      } finally {
        galleryBusyRef.current = false;
      }
    };

    const waitForNewCase = ({ previousCaseId, files }) => {
      const started = Date.now();
      const timer = window.setInterval(async () => {
        const caseId = currentCaseId();
        if (caseId && caseId !== previousCaseId) {
          window.clearInterval(timer);
          const result = await uploadFiles({ caseId, files });
          await loadGalleries(caseId);
          window.setTimeout(() => loadGalleries(caseId), 700);
          window.setTimeout(() => loadGalleries(caseId), 1600);
          if (result.failed) flash(`${result.uploaded} ekstra vedlegg ble lastet opp, men ${result.failed} feilet.`);
          else if (result.uploaded) flash(`${result.uploaded} ekstra vedlegg lastet opp.`);
        } else if (Date.now() - started > 15000) {
          window.clearInterval(timer);
        }
      }, 250);
    };

    const waitForNewComment = ({ caseId, body, files, since }) => {
      const started = Date.now();
      const timer = window.setInterval(async () => {
        try {
          const memberId = await getMemberId();
          const { data, error } = await supabase
            .from('vel_comments')
            .select('id, created_at')
            .eq('case_id', caseId)
            .eq('author_id', memberId)
            .eq('body', body)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!error && data?.id) {
            window.clearInterval(timer);
            const result = await uploadFiles({ caseId, commentId: data.id, files });
            await loadGalleries(caseId);
            window.setTimeout(() => loadGalleries(caseId), 700);
            window.setTimeout(() => loadGalleries(caseId), 1600);
            if (result.failed) flash(`${result.uploaded} ekstra vedlegg ble lastet opp, men ${result.failed} feilet.`);
            else if (result.uploaded) flash(`${result.uploaded} ekstra vedlegg lastet opp.`);
          }
        } catch (_) {
          // Prøv igjen til kommentaren er lagret eller tidsfristen går ut.
        }
        if (Date.now() - started > 15000) window.clearInterval(timer);
      }, 400);
    };

    const enhanceInput = (input) => {
      const form = input.closest('form');
      const isCommentForm = form?.classList.contains('vel-comment-form');
      const isCaseForm = Boolean(form?.querySelector('input[placeholder="Hva gjelder saken?"]'));
      if (!isCommentForm && !isCaseForm) return;
      if (input.dataset.velMultiEnhanced === '1') {
        if ((selectionsRef.current.get(input) || []).length && !previewHost(input)?.children.length) renderSelection(input);
        return;
      }
      input.dataset.velMultiEnhanced = '1';
      input.multiple = true;
      input.accept = ACCEPTED_FILES;

      const onChange = () => {
        const files = [...(input.files || [])];
        const validationError = validateFiles(files);
        if (validationError) {
          input.value = '';
          selectionsRef.current.set(input, []);
          renderSelection(input);
          flash(validationError);
          return;
        }
        selectionsRef.current.set(input, files);
        window.requestAnimationFrame(() => renderSelection(input));
      };
      input.addEventListener('change', onChange);

      if (form && form.dataset.velMultiSubmit !== '1') {
        form.dataset.velMultiSubmit = '1';
        form.addEventListener('submit', () => {
          const activeInput = form.querySelector('input[type="file"][data-vel-multi-enhanced="1"]');
          const files = activeInput ? selectionsRef.current.get(activeInput) || [] : [];
          if (files.length <= 1) return;
          const extras = files.slice(1);
          if (form.classList.contains('vel-comment-form')) {
            const caseId = currentCaseId();
            const body = form.querySelector('textarea')?.value?.trim() || '';
            if (caseId && body) waitForNewComment({ caseId, body, files: extras, since: new Date(Date.now() - 3000).toISOString() });
          } else {
            waitForNewCase({ previousCaseId: currentCaseId(), files: extras });
          }
        }, true);
      }
      window.requestAnimationFrame(() => renderSelection(input));
    };

    const enhanceInputs = () => {
      document.querySelectorAll('.vel-file-field input[type="file"], .vel-comment-form input[type="file"]').forEach(enhanceInput);
      const caseId = currentCaseId();
      if (caseId !== lastCaseIdRef.current) {
        lastCaseIdRef.current = caseId;
        knownImageCountRef.current = 0;
        if (caseId) window.setTimeout(() => loadGalleries(caseId), 250);
      } else if (caseId && knownImageCountRef.current > 0 && !document.querySelector('[data-vel-inline-gallery="1"]')) {
        window.setTimeout(() => loadGalleries(caseId), 200);
      }
    };

    const observer = new MutationObserver(enhanceInputs);
    observer.observe(document.body, { childList: true, subtree: true });
    enhanceInputs();
    const refreshInterval = window.setInterval(() => {
      const caseId = currentCaseId();
      if (caseId && document.querySelector('.vel-detail')) loadGalleries(caseId);
    }, 15000);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      observer.disconnect();
      window.clearInterval(refreshInterval);
      window.clearTimeout(toastTimerRef.current);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <>
      {lightbox && (
        <div className="vel-image-lightbox" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setLightbox(null); }}>
          <button type="button" className="vel-image-lightbox-close" onClick={() => setLightbox(null)} aria-label="Lukk bilde">×</button>
          <figure>
            <img src={lightbox.url} alt={lightbox.name} />
            <figcaption>{lightbox.name}</figcaption>
          </figure>
        </div>
      )}
      {toast && <div className="vel-attachment-toast" role="status">{toast}</div>}
    </>
  );
};

export default AttachmentEnhancer;
