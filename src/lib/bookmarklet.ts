/**
 * The "Ønsk dig" bookmark for computers: on a shop page, it opens /tilfoej in a
 * new tab with the link in the query and the page's head in the fragment. The
 * fragment never reaches a server (no header limit, no logs); /tilfoej reads
 * it in the browser. A GET navigation carries our SameSite=Lax session.
 * Reads the same elements as the Safari Shortcut's script.
 */
export function bookmarklet(origin: string): string {
  const code = `(function(){var p=[];document.querySelectorAll('title,meta[property],meta[name],script[type="application/ld+json"]').forEach(function(e){p.push(e.outerHTML)});window.open(${JSON.stringify(
    `${origin}/tilfoej?url=`,
  )}+encodeURIComponent(location.href)+'#'+encodeURIComponent(p.join('\\n').slice(0,150000)))})()`;
  return `javascript:${code}`;
}
