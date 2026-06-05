const fs = require('fs');
const file = 'public/app.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /const compactRow = `\r?\n<div class="flight-row\$\{isExpanded \? ' expanded' : ''\}" onclick="toggleFlight\('\$\{safeId\}'\)">[\s\S]*?<\/div>`;/;

const replacement = `const buildCompactLeg = (leg, alObj, code) => {
    const shift = leg.arrivalDayShift || 0;
    const stops = leg.stops !== undefined ? leg.stops : 0;
    const dCity = getApt(leg.origin)?.city?.[state.lang] || leg.origin;
    const aCity = getApt(leg.destination)?.city?.[state.lang] || leg.destination;
    
    return \`
    <div class="fr-leg-row">
      <div class="fr-airline">
        <div class="fr-logo-wrap">
          <img src="\${alObj.logo}" alt="\${alObj.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="fr-logo-fb" style="display:none">\${code}</div>
        </div>
        <div class="fr-airline-name">\${alObj.name}</div>
      </div>
      <div class="fr-dep">
        <div class="fr-time">\${leg.departure}</div>
        <div class="fr-city">\${dCity}</div>
      </div>
      <div class="fr-meta">
        <div class="fr-dur">\${leg.duration}</div>
        <div class="fr-track">
          <div class="fr-dot"></div>
          <div class="fr-line"></div>
          <span class="fr-plane-icon">\${IC.plane}</span>
          <div class="fr-line"></div>
          <div class="fr-dot"></div>
        </div>
        <span class="\${stops === 0 ? 'fr-direct' : 'fr-stop'}">\${stops === 0 ? t.stops_direct : (stops === 1 ? t.stops_1 : t.stops_2)}</span>
      </div>
      <div class="fr-arr">
        <div class="fr-time">\${leg.arrival}\${shift ? \`<sup class="fr-dayshift">+\${shift}</sup>\` : ''}</div>
        <div class="fr-city">\${aCity}</div>
      </div>
    </div>\`;
  };

  const compactRow = \`
<div class="flight-row\${isExpanded ? ' expanded' : ''}" onclick="toggleFlight('\${safeId}')">
  <div class="fr-legs-container">
    \${buildCompactLeg(outbound, al, alCode)}
    \${isRT && returnLeg ? buildCompactLeg(returnLeg, al, alCode) : ''}
  </div>
  
  <div class="fr-price-col">
    <div class="fr-price">\${best.toLocaleString()} <span class="fr-cur">DZD</span></div>
    <div class="fr-price-label">\${t.from_price || 'à partir de'}</div>
  </div>

  <div class="fr-chevron">\${chevron}</div>
</div>\`;`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log('Success');
} else {
  console.log('Failed');
}
