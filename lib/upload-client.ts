/**
 * Envoi d'une pièce jointe depuis le navigateur (BRIEF.md §7) : le site délivre une adresse
 * signée (/api/upload), puis le fichier part directement vers le stockage privé
 * (OVHcloud Object Storage), sans transiter par le serveur du site. Renvoie la clé de
 * l'objet, transmise avec la demande.
 */
export async function uploadFile(file: File, onProgress: (percent: number) => void) {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
  });
  if (!res.ok) throw new Error(`upload ${res.status}`);
  const { url, key, contentType } = (await res.json()) as {
    url: string;
    key: string;
    contentType: string;
  };
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Doit être identique à l'en-tête signé par le serveur.
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`put ${xhr.status}`));
    xhr.onerror = () => reject(new Error("réseau"));
    xhr.send(file);
  });
  return key;
}
