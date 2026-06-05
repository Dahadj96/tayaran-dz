const fs = require('fs');
const file = 'public/style.css';
let content = fs.readFileSync(file, 'utf8');

// 1. Update --green to #137333
content = content.replace(/--green:\s*#1E8E3E;/, '--green:      #137333;');

// 2. Remove .fr-rt-badge
content = content.replace(/\.fr-rt-badge\s*\{[^}]+\}/g, '');

// 3. Update flight-row layout
const layoutTarget = `.flight-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--t);
  min-width: 0;
}`;

const layoutReplacement = `.flight-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 16px;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--t);
  min-width: 0;
}
.fr-legs-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.fr-leg-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}`;

content = content.replace(layoutTarget, layoutReplacement);

// 4. Also remove "flex: 1" from .fr-meta because .fr-legs-container is now the flexible container
// Actually .fr-meta can keep flex: 1 inside .fr-leg-row so it pushes arr and dep apart.

// 5. Update pr-best-badge text color to use #137333
// The root --green is updated, so if it uses var(--green), it will automatically be darker.

fs.writeFileSync(file, content);
console.log('style.css updated successfully');
