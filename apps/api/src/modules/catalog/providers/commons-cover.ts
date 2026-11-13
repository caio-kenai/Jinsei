import { z } from 'zod';
import type { CoverAttribution } from '@jinsei/contracts';
import { plainText, providerFetch } from './catalog-provider';

const infoSchema = z.object({
  thumburl: z.url().optional(),
  url: z.url(),
  descriptionurl: z.url(),
  extmetadata: z.record(z.string(), z.object({ value: z.unknown() })).default({}),
});
export async function commonsCover(
  filename: string,
  identifiedCover = false,
): Promise<{ url: string; attribution: CoverAttribution } | null> {
  // P18 can also be a screenshot or photograph. Only use identified cover/poster art.
  if (!identifiedCover && !/cover|box[ _-]?art|poster|capa/i.test(filename)) return null;
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '600',
    titles: `File:${filename}`,
  }).toString();
  const response = z
    .object({
      query: z.object({
        pages: z.record(z.string(), z.object({ imageinfo: z.array(infoSchema).optional() })),
      }),
    })
    .parse(await providerFetch(url));
  const info = Object.values(response.query.pages)[0]?.imageinfo?.[0];
  if (!info) return null;
  const metadata = (key: string) => {
    const value = info.extmetadata[key]?.value;
    return typeof value === 'string' ? plainText(value) : '';
  };
  const license = metadata('LicenseShortName');
  if (!/^(CC0|Public domain|CC BY(?:-SA)? [1-4]\.0)$/i.test(license)) return null;
  const imageUrl = new URL(info.thumburl ?? info.url);
  if (
    !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(imageUrl.hostname) ||
    imageUrl.protocol !== 'https:'
  )
    return null;
  for (const key of [...imageUrl.searchParams.keys()])
    if (key.startsWith('utm_')) imageUrl.searchParams.delete(key);
  const licenseUrl = metadata('LicenseUrl');
  return {
    url: imageUrl.href,
    attribution: {
      provider: 'Wikimedia Commons',
      sourceUrl: info.descriptionurl,
      license,
      licenseUrl: /^https?:\/\//.test(licenseUrl) ? licenseUrl : null,
      artist: metadata('Artist') || metadata('Attribution') || null,
    },
  };
}
