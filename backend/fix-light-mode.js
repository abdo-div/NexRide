/**
 * NexRide Light Mode Fix Script
 * Replaces hardcoded dark-mode values with CSS variable equivalents
 * across all Pug view templates.
 */

import fs from 'fs';
import path from 'path';

const VIEWS_DIR = path.join(process.cwd(), 'views');

// Files to process
const files = [
  'overview.pug',
  'car.pug',
  'myRentals.pug',
  '_mixins.pug',
  'base.pug',
  'account.pug',
  'forgotPassword.pug',
  'login.pug',
  'error.pug',
];

// Replacements to apply globally
const REPLACEMENTS = [
  // 1. Hardcoded hero background colors
  { from: "'background: radial-gradient(ellipse at 20% 50%, rgba(73,75,214,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(93,230,255,0.08) 0%, transparent 50%), #131318;'", to: "'background: radial-gradient(ellipse at 20% 50%, rgba(73,75,214,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(93,230,255,0.06) 0%, transparent 50%), var(--color-background);'" },
  { from: 'bg-gradient-to-br from-[#0a0a1a] via-[#131318] to-[#0a0a1a]', to: 'bg-background' },
  
  // 2. text-white on headings and content text → text-on-surface
  // We target class string patterns that are "content" text (not hover states)
  { from: '.text-white.mb-1=', to: '.text-on-surface.mb-1=' },
  { from: '.text-white.mb-2', to: '.text-on-surface.mb-2' },
  { from: '.text-white.mb-3', to: '.text-on-surface.mb-3' },
  { from: '.text-white.mb-4', to: '.text-on-surface.mb-4' },
  { from: '.text-white.mb-6', to: '.text-on-surface.mb-6' },
  { from: '.text-white.font-black', to: '.text-on-surface.font-black' },
  { from: '.text-white.font-bold', to: '.text-on-surface.font-bold' },
  { from: '.text-white.font-medium', to: '.text-on-surface.font-medium' },
  { from: '.text-white.tracking-tight', to: '.text-on-surface.tracking-tight' },
  
  // text-white in class="" attribute on headings
  { from: 'text-white mb-6 leading-tight', to: 'text-on-surface mb-6 leading-tight' },
  { from: 'text-white font-black tracking-tight', to: 'text-on-surface font-black tracking-tight' },
  { from: 'text-[18px] text-white font-bold', to: 'text-[18px] text-on-surface font-bold' },
  
  // standalone text-white on labels/spans/p
  { from: '.text-white=', to: '.text-on-surface=' },
  { from: 'p.font-label-md.text-label-md.text-white=', to: 'p.font-label-md.text-label-md.text-on-surface=' },
  { from: 'span#subtotal.font-body-md.text-body-md.text-white', to: 'span#subtotal.font-body-md.text-body-md.text-on-surface' },
  { from: 'span#distance-text.text-label-sm.font-medium.text-white', to: 'span#distance-text.text-label-sm.font-medium.text-on-surface' },

  // 3. text-3xl photo_camera (account icon on hover overlay - should stay white when overlaid on image)
  // Leave those - they are on top of images

  // 4. Overview hero h1
  { from: "text-white mb-6 leading-tight", to: "text-on-surface mb-6 leading-tight" },

  // 5. Hardcoded bg dark colors used in backgrounds of overview sections
  { from: "style='background: #111827;'", to: "style='background: var(--color-surface-container-low);'" },

  // 6. Scanline / glitch overlay dark bg in overview hero  
  // overview uses scanline divs - these should be theme aware
  
  // 7. Car booking panel and stats
  { from: 'h3.font-display-lg.text-headline-lg.text-white.font-black', to: 'h3.font-display-lg.text-headline-lg.text-on-surface.font-black' },
  { from: 'span.font-label-md.text-label-md.text-white.font-bold Total (USD)', to: 'span.font-label-md.text-label-md.text-on-surface.font-bold Total (USD)' },

  // 8. Account "Change Password" heading  
  { from: 'h3.font-headline-md.text-headline-sm.text-white Change Password', to: 'h3.font-headline-md.text-headline-sm.text-on-surface Change Password' },
  
  // 9. myRentals "No rentals yet" heading
  { from: 'h3.font-headline-md.text-white.mb-3 No rentals yet', to: 'h3.font-headline-md.text-on-surface.mb-3 No rentals yet' },
];

let totalReplacements = 0;

files.forEach(file => {
  const filepath = path.join(VIEWS_DIR, file);
  if (!fs.existsSync(filepath)) return;

  let content = fs.readFileSync(filepath, 'utf8');
  let changed = 0;

  REPLACEMENTS.forEach(({ from, to }) => {
    const count = (content.split(from)).length - 1;
    if (count > 0) {
      content = content.split(from).join(to);
      changed += count;
    }
  });

  if (changed > 0) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✓ ${file}: ${changed} replacement(s)`);
    totalReplacements += changed;
  }
});

console.log(`\n✅ Total: ${totalReplacements} replacements across all files.`);
