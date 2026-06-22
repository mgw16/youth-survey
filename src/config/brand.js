/* ============================================================================
   brand.js  —  everything company-specific in one place.

   Colours: I've set a professional field-green palette that suits Integrity
   Ag's identity. If you have exact brand hex codes from a style guide, paste
   them into `palette` below and the whole app updates — no other file to edit.
   ========================================================================== */

export const BRAND = {
  name: 'Integrity Ag',
  // Their real logo (loaded from your website). If it ever fails to load,
  // the name above is shown instead.
  logoUrl: 'https://integrityag.net.au/app/uploads/2024/02/integrtiyaglogo.svg',
  website: 'https://integrityag.net.au',
  tagline: 'Agri-environmental advice and on-the-ground solutions',
  values: ['Integrity', 'Innovation', 'Care'],

  // Tune these to your exact brand colours if you have them.
  palette: {
    brand: '#2f6b46',       // primary green  (buttons, headings accents)
    brandDeep: '#215034',   // darker green   (hovers, deep text)
    accent: '#a9762f',      // warm secondary (eyebrows, section labels)
  },
}
