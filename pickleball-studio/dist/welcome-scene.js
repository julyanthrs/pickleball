// Decorative inline SVG keeps the rally aligned with the court at every screen size.
export const welcomeScene = `<div class="welcome-court-backdrop" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="480" height="350" viewBox="0 0 480 350" fill="none">
  <defs>
    <filter id="welcome-lift" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="7" dy="14" stdDeviation="7" flood-color="#AABDA0" flood-opacity=".24"/><feDropShadow dx="-4" dy="-5" stdDeviation="3" flood-color="#FFF" flood-opacity=".65"/></filter>
    <filter id="welcome-small" x="-60%" y="-60%" width="220%" height="240%"><feDropShadow dx="3" dy="6" stdDeviation="4" flood-color="#77946A" flood-opacity=".28"/></filter>
    <linearGradient id="welcome-rim" x1="110" y1="60" x2="340" y2="280" gradientUnits="userSpaceOnUse"><stop stop-color="#FFF"/><stop offset="1" stop-color="#ECF2E6"/></linearGradient>
    <linearGradient id="welcome-court" x1="70" y1="110" x2="390" y2="240" gradientUnits="userSpaceOnUse"><stop stop-color="#C2D8AF"/><stop offset="1" stop-color="#B5D09D"/></linearGradient>
    <linearGradient id="welcome-paddle" x1="0" y1="0" x2="65" y2="85" gradientUnits="userSpaceOnUse"><stop stop-color="#ECF4E3"/><stop offset="1" stop-color="#C5DBB0"/></linearGradient>
  </defs>
  <ellipse cx="239" cy="287" rx="159" ry="17" fill="#E5ECDD"/>
  <g transform="translate(37 55) rotate(-9 200 120)" filter="url(#welcome-lift)">
    <rect x="2" y="8" width="400" height="235" rx="42" fill="#DAE4D0"/>
    <rect x="0" y="0" width="400" height="235" rx="42" fill="url(#welcome-rim)" stroke="#FFF" stroke-width="3"/>
    <rect x="19" y="19" width="362" height="197" rx="27" fill="#DDE8D3"/>
    <rect x="31" y="31" width="338" height="173" rx="18" fill="url(#welcome-court)"/>
    <path d="M147 41H253V194H147Z" fill="#98BE7F"/>
    <path d="M42 42H358V193H42V42ZM147 42V193M253 42V193M42 117.5H147M253 117.5H358" stroke="#F8FFF0" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M200 37V198" stroke="#6B8D55" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M200 39V196" stroke="#E7F2DB" stroke-width="2" stroke-dasharray="2 5"/>
    <circle cx="200" cy="35" r="5" fill="#F8FBF4" stroke="#AFC79F" stroke-width="2"/>
    <circle cx="200" cy="200" r="5" fill="#F8FBF4" stroke="#AFC79F" stroke-width="2"/>
    <path d="M51 34H129" stroke="#E2EFD6" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g transform="translate(37 55) rotate(-9 200 120)">
    <g class="welcome-rally" transform="translate(78 68)">
      <ellipse class="welcome-rally-shadow" cx="0" cy="4" rx="5.2" ry="2.5" fill="#365C3B" opacity=".23"/>
      <g class="welcome-rally-ball">
        <circle r="6" fill="#CAFF00" stroke="#EFFF94" stroke-width=".7"/>
        <path d="M-3.8-3.4C-2.5-5 0-5.5 2-4.7" stroke="#F3FFBD" stroke-width="1" stroke-linecap="round"/>
        <g class="welcome-rally-holes" fill="#729126">
          <circle cx="-2.3" cy="-2" r=".85"/><circle cx="2.4" cy="-2.1" r=".85"/>
          <circle cx="0" cy="1" r="1"/><ellipse cx="-3.5" cy="2.4" rx=".65" ry="1"/>
          <ellipse cx="3.4" cy="2.6" rx=".65" ry="1"/><ellipse cx="0" cy="4.4" rx=".9" ry=".55"/>
        </g>
      </g>
    </g>
  </g>
  <g transform="translate(350 211) rotate(24)" filter="url(#welcome-small)">
    <rect x="24" y="62" width="18" height="61" rx="8" fill="#6B8F5B" stroke="#F4F8EE" stroke-width="3"/>
    <path d="M24 88H42M24 96H42M24 104H42M25 112H41" stroke="#A9C196" stroke-width="2"/>
    <rect x="0" y="0" width="67" height="80" rx="25" fill="url(#welcome-paddle)" stroke="#F9FFF3" stroke-width="4"/>
    <path d="M11 23C11 14 16 10 25 10H41" stroke="#FFF" stroke-width="3" stroke-linecap="round"/>
    <path d="M21 27H46M21 38H46M21 49H46M21 60H46" stroke="#B5CDA3" stroke-width="2" stroke-linecap="round"/>
    <path d="M29 22V64M38 22V64" stroke="#B5CDA3" stroke-width="2"/>
  </g>
  <g transform="translate(108 273)" filter="url(#welcome-small)">
    <circle r="27" fill="#B9DA85" stroke="#EDF6CF" stroke-width="2"/>
    <ellipse cx="-9" cy="-12" rx="4" ry="5" transform="rotate(-28 -9 -12)" fill="#82A65F"/>
    <ellipse cx="10" cy="-11" rx="4" ry="5" transform="rotate(28 10 -11)" fill="#82A65F"/>
    <circle cy="5" r="4.5" fill="#82A65F"/>
    <ellipse cx="-16" cy="8" rx="3" ry="5" transform="rotate(-30 -16 8)" fill="#82A65F"/>
    <ellipse cx="15" cy="10" rx="3" ry="5" transform="rotate(30 15 10)" fill="#82A65F"/>
    <path d="M-14-17C-9-21-3-23 4-22" stroke="#E2F0BC" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g transform="translate(396 33) rotate(24)" stroke="#7FA46C" stroke-width="1.5" stroke-linecap="round">
    <path d="M0 60V1"/>
    <path d="M0 46C-23 45-28 28-21 20C-7 21 0 30 0 46Z" fill="#B8D4A3"/>
    <path d="M0 33C23 32 28 15 21 7C7 8 0 17 0 33Z" fill="#C3DCB2"/>
    <path d="M0 15C-14 10-16-2-9-9C1-4 5 5 0 15Z" fill="#AFCB9B"/>
  </g>
</svg>
</div><div class="welcome-leaves" aria-hidden="true"><span class="welcome-falling-leaf" style="--leaf-x:7%;--leaf-size:18px;--leaf-duration:17s;--leaf-delay:-6s;--leaf-drift:65px;color:#87B675"><svg viewBox="0 0 24 36" fill="none"><path d="M13 1C25 9 24 24 5 34C-2 24-1 9 13 1Z" fill="currentColor"/><path d="M5 33C10 23 14 14 13 3M10 22L4 17M12 16L19 11M8 28L18 22" stroke="#DCEBCC" stroke-width="1" stroke-linecap="round"/></svg></span><span class="welcome-falling-leaf" style="--leaf-x:20%;--leaf-size:14px;--leaf-duration:21s;--leaf-delay:-14s;--leaf-drift:-45px;color:#A3C18C"><svg viewBox="0 0 24 36" fill="none"><path d="M13 1C25 9 24 24 5 34C-2 24-1 9 13 1Z" fill="currentColor"/><path d="M5 33C10 23 14 14 13 3M10 22L4 17M12 16L19 11M8 28L18 22" stroke="#DCEBCC" stroke-width="1" stroke-linecap="round"/></svg></span><span class="welcome-falling-leaf" style="--leaf-x:36%;--leaf-size:16px;--leaf-duration:19s;--leaf-delay:-3s;--leaf-drift:55px;color:#79AC77"><svg viewBox="0 0 24 36" fill="none"><path d="M13 1C25 9 24 24 5 34C-2 24-1 9 13 1Z" fill="currentColor"/><path d="M5 33C10 23 14 14 13 3M10 22L4 17M12 16L19 11M8 28L18 22" stroke="#DCEBCC" stroke-width="1" stroke-linecap="round"/></svg></span><span class="welcome-falling-leaf" style="--leaf-x:51%;--leaf-size:13px;--leaf-duration:23s;--leaf-delay:-17s;--leaf-drift:-60px;color:#9ABF86"><svg viewBox="0 0 24 36" fill="none"><path d="M13 1C25 9 24 24 5 34C-2 24-1 9 13 1Z" fill="currentColor"/><path d="M5 33C10 23 14 14 13 3M10 22L4 17M12 16L19 11M8 28L18 22" stroke="#DCEBCC" stroke-width="1" stroke-linecap="round"/></svg></span><span class="welcome-falling-leaf" style="--leaf-x:64%;--leaf-size:20px;--leaf-duration:18s;--leaf-delay:-10s;--leaf-drift:70px;color:#88B17A"><svg viewBox="0 0 24 36" fill="none"><path d="M13 1C25 9 24 24 5 34C-2 24-1 9 13 1Z" fill="currentColor"/><path d="M5 33C10 23 14 14 13 3M10 22L4 17M12 16L19 11M8 28L18 22" stroke="#DCEBCC" stroke-width="1" stroke-linecap="round"/></svg></span><span class="welcome-falling-leaf" style="--leaf-x:77%;--leaf-size:15px;--leaf-duration:22s;--leaf-delay:-5s;--leaf-drift:-55px;color:#A6C894"><svg viewBox="0 0 24 36" fill="none"><path d="M13 1C25 9 24 24 5 34C-2 24-1 9 13 1Z" fill="currentColor"/><path d="M5 33C10 23 14 14 13 3M10 22L4 17M12 16L19 11M8 28L18 22" stroke="#DCEBCC" stroke-width="1" stroke-linecap="round"/></svg></span><span class="welcome-falling-leaf" style="--leaf-x:89%;--leaf-size:18px;--leaf-duration:20s;--leaf-delay:-15s;--leaf-drift:40px;color:#79AC77"><svg viewBox="0 0 24 36" fill="none"><path d="M13 1C25 9 24 24 5 34C-2 24-1 9 13 1Z" fill="currentColor"/><path d="M5 33C10 23 14 14 13 3M10 22L4 17M12 16L19 11M8 28L18 22" stroke="#DCEBCC" stroke-width="1" stroke-linecap="round"/></svg></span><span class="welcome-falling-leaf" style="--leaf-x:96%;--leaf-size:13px;--leaf-duration:24s;--leaf-delay:-8s;--leaf-drift:-70px;color:#95B77F"><svg viewBox="0 0 24 36" fill="none"><path d="M13 1C25 9 24 24 5 34C-2 24-1 9 13 1Z" fill="currentColor"/><path d="M5 33C10 23 14 14 13 3M10 22L4 17M12 16L19 11M8 28L18 22" stroke="#DCEBCC" stroke-width="1" stroke-linecap="round"/></svg></span></div>`;
