import fs from 'fs';
import path from 'path';

const filepath = path.join(process.cwd(), 'views/base.pug');
let content = fs.readFileSync(filepath, 'utf8');

const newTailwindConfig = `    script(id='tailwind-config').
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
              "surface-dim": "var(--color-surface-dim)",
              "inverse-on-surface": "var(--color-inverse-on-surface)",
              "tertiary": "var(--color-tertiary)",
              "tertiary-fixed-dim": "var(--color-tertiary-fixed-dim)",
              "primary-container": "var(--color-primary-container)",
              "secondary-fixed-dim": "var(--color-secondary-fixed-dim)",
              "on-tertiary-fixed-variant": "var(--color-on-tertiary-fixed-variant)",
              "surface-container-lowest": "var(--color-surface-container-lowest)",
              "on-surface-variant": "var(--color-on-surface-variant)",
              "outline-variant": "var(--color-outline-variant)",
              "on-background": "var(--color-on-background)",
              "on-tertiary-fixed": "var(--color-on-tertiary-fixed)",
              "surface": "var(--color-surface)",
              "inverse-surface": "var(--color-inverse-surface)",
              "surface-container-low": "var(--color-surface-container-low)",
              "surface-container-high": "var(--color-surface-container-high)",
              "surface-variant": "var(--color-surface-variant)",
              "background": "var(--color-background)",
              "error-container": "var(--color-error-container)",
              "on-secondary-fixed": "var(--color-on-secondary-fixed)",
              "primary-fixed-dim": "var(--color-primary-fixed-dim)",
              "on-primary-fixed": "var(--color-on-primary-fixed)",
              "on-primary-container": "var(--color-on-primary-container)",
              "on-primary": "var(--color-on-primary)",
              "tertiary-container": "var(--color-tertiary-container)",
              "on-tertiary-container": "var(--color-on-tertiary-container)",
              "primary-fixed": "var(--color-primary-fixed)",
              "secondary": "var(--color-secondary)",
              "tertiary-fixed": "var(--color-tertiary-fixed)",
              "error": "var(--color-error)",
              "on-secondary": "var(--color-on-secondary)",
              "on-error-container": "var(--color-on-error-container)",
              "surface-container-highest": "var(--color-surface-container-highest)",
              "on-surface": "var(--color-on-surface)",
              "surface-tint": "var(--color-surface-tint)",
              "on-tertiary": "var(--color-on-tertiary)",
              "surface-container": "var(--color-surface-container)",
              "on-secondary-fixed-variant": "var(--color-on-secondary-fixed-variant)",
              "surface-bright": "var(--color-surface-bright)",
              "outline": "var(--color-outline)",
              "on-secondary-container": "var(--color-on-secondary-container)",
              "secondary-container": "var(--color-secondary-container)",
              "primary": "var(--color-primary)",
              "inverse-primary": "var(--color-inverse-primary)",
              "secondary-fixed": "var(--color-secondary-fixed)",
              "on-error": "var(--color-on-error)",
              "on-primary-fixed-variant": "var(--color-on-primary-fixed-variant)"
            },
            "borderRadius": { "DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem" },
            "spacing": { "xl": "80px", "gutter": "24px", "base": "8px", "xs": "4px", "container-max": "1280px", "lg": "48px", "sm": "12px", "md": "24px" },
            "fontFamily": { "headline-lg": ["Inter"], "body-lg": ["Inter"], "label-md": ["Inter"], "headline-md": ["Inter"], "body-md": ["Inter"], "label-sm": ["Inter"], "display-lg-mobile": ["Inter"], "display-lg": ["Inter"] },
            "fontSize": {
              "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "700"}],
              "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
              "label-md": ["14px", {"lineHeight": "20px", "letterSpacing": "0.05em", "fontWeight": "600"}],
              "headline-md": ["24px", {"lineHeight": "32px", "fontWeight": "600"}],
              "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
              "label-sm": ["12px", {"lineHeight": "16px", "fontWeight": "500"}],
              "display-lg-mobile": ["40px", {"lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "800"}],
              "display-lg": ["72px", {"lineHeight": "80px", "letterSpacing": "-0.02em", "fontWeight": "800"}]
            }
          }
        }
      }`;

const newStyle = `    style.
      :root {
        --color-background: #fcfcff;
        --color-on-background: #1a1b21;
        --color-surface: #fcfcff;
        --color-surface-dim: #dadddf;
        --color-surface-bright: #fcfcff;
        --color-surface-container-lowest: #ffffff;
        --color-surface-container-low: #f4f3f7;
        --color-surface-container: #eeeef1;
        --color-surface-container-high: #e8e8eb;
        --color-surface-container-highest: #e2e2e6;
        --color-on-surface: #1a1b21;
        --color-surface-variant: #e1e2ec;
        --color-on-surface-variant: #44474f;
        --color-inverse-surface: #2f3036;
        --color-inverse-on-surface: #f1f0f4;
        
        --color-primary: #494bd6;
        --color-on-primary: #ffffff;
        --color-primary-container: #e1e0ff;
        --color-on-primary-container: #0d0096;
        --color-inverse-primary: #c0c1ff;
        --color-primary-fixed: #e1e0ff;
        --color-primary-fixed-dim: #c0c1ff;
        --color-on-primary-fixed: #07006c;
        --color-on-primary-fixed-variant: #2f2ebe;
        --color-surface-tint: #494bd6;
        
        --color-secondary: #006874;
        --color-on-secondary: #ffffff;
        --color-secondary-container: #a2eeff;
        --color-on-secondary-container: #001f25;
        --color-secondary-fixed: #a2eeff;
        --color-secondary-fixed-dim: #2fd9f4;
        --color-on-secondary-fixed: #001f25;
        --color-on-secondary-fixed-variant: #004e5a;

        --color-tertiary: #006c48;
        --color-on-tertiary: #ffffff;
        --color-tertiary-container: #6ffbbe;
        --color-on-tertiary-container: #002113;
        --color-tertiary-fixed: #6ffbbe;
        --color-tertiary-fixed-dim: #4edea3;
        --color-on-tertiary-fixed: #002113;
        --color-on-tertiary-fixed-variant: #005236;

        --color-error: #ba1a1a;
        --color-on-error: #ffffff;
        --color-error-container: #ffdad6;
        --color-on-error-container: #410002;
        
        --color-outline: #74777f;
        --color-outline-variant: #c4c6d0;
        
        --glass-bg: rgba(255, 255, 255, 0.7);
        --glass-border: rgba(0, 0, 0, 0.1);
      }

      .dark {
        --color-background: #131318;
        --color-on-background: #e4e1e9;
        --color-surface: #131318;
        --color-surface-dim: #131318;
        --color-surface-bright: #39383e;
        --color-surface-container-lowest: #0e0e13;
        --color-surface-container-low: #1b1b20;
        --color-surface-container: #1f1f25;
        --color-surface-container-high: #2a292f;
        --color-surface-container-highest: #35343a;
        --color-on-surface: #e4e1e9;
        --color-surface-variant: #35343a;
        --color-on-surface-variant: #c7c4d7;
        --color-inverse-surface: #e4e1e9;
        --color-inverse-on-surface: #303036;

        --color-primary: #c0c1ff;
        --color-on-primary: #1000a9;
        --color-primary-container: #8083ff;
        --color-on-primary-container: #0d0096;
        --color-inverse-primary: #494bd6;
        --color-primary-fixed: #e1e0ff;
        --color-primary-fixed-dim: #c0c1ff;
        --color-on-primary-fixed: #07006c;
        --color-on-primary-fixed-variant: #2f2ebe;
        --color-surface-tint: #c0c1ff;
        
        --color-secondary: #5de6ff;
        --color-on-secondary: #00363e;
        --color-secondary-container: #00cbe6;
        --color-on-secondary-container: #00515d;
        --color-secondary-fixed: #a2eeff;
        --color-secondary-fixed-dim: #2fd9f4;
        --color-on-secondary-fixed: #001f25;
        --color-on-secondary-fixed-variant: #004e5a;

        --color-tertiary: #4edea3;
        --color-on-tertiary: #003824;
        --color-tertiary-container: #00885d;
        --color-on-tertiary-container: #000703;
        --color-tertiary-fixed: #6ffbbe;
        --color-tertiary-fixed-dim: #4edea3;
        --color-on-tertiary-fixed: #002113;
        --color-on-tertiary-fixed-variant: #005236;

        --color-error: #ffb4ab;
        --color-on-error: #690005;
        --color-error-container: #93000a;
        --color-on-error-container: #ffdad6;
        
        --color-outline: #908fa0;
        --color-outline-variant: #464554;
        
        --glass-bg: rgba(19, 19, 24, 0.7);
        --glass-border: rgba(255, 255, 255, 0.1);
      }
      
      body { font-family: 'Inter', sans-serif; background-color: var(--color-background); color: var(--color-on-background); overflow-x: hidden; }
      .glass-card { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--glass-border); }
      .glass-panel { background: var(--glass-bg); backdrop-filter: blur(12px); border: 1px solid var(--glass-border); }
      .neon-glow { box-shadow: 0 0 20px rgba(128, 131, 255, 0.15); }
      .neon-glow:hover { box-shadow: 0 0 30px rgba(93, 230, 255, 0.25); }
      .neon-rim { border: 1px solid rgba(192, 193, 255, 0.2); box-shadow: 0 0 20px rgba(73, 75, 214, 0.1); }
      .neon-rim:hover { border: 1px solid rgba(93, 230, 255, 0.4); box-shadow: 0 0 30px rgba(93, 230, 255, 0.15); }
      .reveal { opacity: 0; transform: translateY(20px); transition: all 0.8s ease-out; }
      .reveal.active { opacity: 1; transform: translateY(0); }
      .car-card-hover:hover { transform: translateY(-8px); border-color: var(--color-secondary); }
      @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
      .floating { animation: float 4s ease-in-out infinite; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: var(--color-background); }
      ::-webkit-scrollbar-thumb { background: var(--color-surface-variant); border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--color-outline-variant); }`;

const startScript = content.indexOf(`script(id='tailwind-config').`);
const endScript = content.indexOf(`style.`, startScript);
let endStyle = content.indexOf(`body.bg-background(class="selection:bg-secondary/30")`, endScript);

if (startScript !== -1 && endScript !== -1 && endStyle !== -1) {
  const before = content.substring(0, startScript);
  const after = content.substring(endStyle);
  
  const finalContent = before + newTailwindConfig + '\\n' + newStyle + '\\n\\n  ' + after;
  fs.writeFileSync(filepath, finalContent, 'utf8');
  console.log("Updated base.pug CSS variables!");
} else {
  console.log("Could not find boundaries.");
}
