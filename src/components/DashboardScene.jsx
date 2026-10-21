import React from 'react'

export default function DashboardScene() {
  return <div className="dashboard-scene pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    <svg className="dashboard-palms absolute inset-y-0 right-0 h-full w-[78%]" viewBox="0 0 1200 440" preserveAspectRatio="xMidYMax slice">
      <defs><linearGradient id="palmLeaf" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#A7C58C" stopOpacity=".48"/><stop offset="1" stopColor="#76A17C" stopOpacity=".1"/></linearGradient></defs>
      <path d="M0 408 C220 385 350 425 570 403 S940 385 1200 410 V440 H0Z" fill="#071A13" fillOpacity=".55"/>
      <path d="M0 416 H1200" stroke="#D8BB75" strokeOpacity=".16" strokeWidth="2"/>
      <path d="M30 425 H1170" stroke="#F4E5B8" strokeOpacity=".14" strokeWidth="2" strokeDasharray="26 24"/>
      <g className="dashboard-palm">
        <path d="M874 413 Q914 300 900 150" fill="none" stroke="#C9A86B" strokeOpacity=".52" strokeWidth="13" strokeLinecap="round"/>
        <g fill="none" stroke="url(#palmLeaf)" strokeWidth="8" strokeLinecap="round">
          <path d="M900 151 Q824 95 758 105 Q819 127 875 163"/><path d="M900 151 Q828 136 775 158 Q844 163 887 168"/>
          <path d="M900 151 Q849 73 795 52 Q831 96 887 158"/><path d="M900 151 Q890 70 862 34 Q867 92 894 158"/>
          <path d="M900 151 Q923 68 966 31 Q946 95 907 159"/><path d="M900 151 Q977 84 1044 91 Q987 119 911 163"/>
          <path d="M900 151 Q1001 131 1061 159 Q1002 165 914 169"/>
        </g>
        <g className="dashboard-fruit" fill="#D99A43"><circle cx="910" cy="165" r="7"/><circle cx="920" cy="172" r="7"/><circle cx="908" cy="179" r="7"/><circle cx="919" cy="186" r="7"/></g>
      </g>
      <g className="dashboard-palm dashboard-palm-small" opacity=".62">
        <path d="M1090 415 Q1107 338 1096 248" fill="none" stroke="#C9A86B" strokeOpacity=".48" strokeWidth="9" strokeLinecap="round"/>
        <g fill="none" stroke="url(#palmLeaf)" strokeWidth="6" strokeLinecap="round">
          <path d="M1096 249 Q1046 212 1002 220 Q1040 239 1084 257"/><path d="M1096 249 Q1068 195 1038 178 Q1053 218 1091 256"/>
          <path d="M1096 249 Q1110 193 1142 173 Q1127 217 1101 256"/><path d="M1096 249 Q1151 214 1190 223 Q1155 239 1104 258"/>
        </g>
      </g>

      <g className="dashboard-woman dashboard-woman-one" transform="translate(650 331)">
        <g className="woman-chasing woman-small">
          <g className="woman-run-arms" fill="none" stroke="#D99B78" strokeWidth="4" strokeLinecap="round"><path d="M-3 28 Q-14 32 -17 42"/><path d="M5 28 Q15 22 18 13"/></g>
          <path d="M-8 23 Q0 19 8 23 L10 39 Q1 44 -9 39Z" fill="#E78E79"/>
          <circle cx="0" cy="11" r="11" fill="#D99B78"/><path d="M-11 11 Q-12 -2 0 -2 Q12 -1 11 13 L7 7 Q0 3 -7 9Z" fill="#342820"/><circle cx="-10" cy="2" r="4" fill="#342820"/><path d="M-4 12h1M4 12h1" stroke="#382820" strokeWidth="2.5" strokeLinecap="round"/><path d="M-2 17q2 2 4 0" fill="none" stroke="#9B5F53" strokeWidth="1.5" strokeLinecap="round"/>
          <g className="woman-run-legs" fill="none" stroke="#F0D9B4" strokeWidth="4" strokeLinecap="round"><path className="woman-leg-a" d="M-4 39 Q-12 47 -17 54"/><path className="woman-leg-b" d="M5 39 Q13 47 17 53"/></g>
          <path d="M-17 55h-5M16 54h5" stroke="#D99B78" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M-8 28h16" stroke="#F5C66F" strokeWidth="2.5" strokeLinecap="round"/>
        </g>
      </g>

      <g className="dashboard-woman dashboard-woman-two" transform="translate(704 337)">
        <g className="woman-chasing woman-small">
          <g className="woman-run-arms" fill="none" stroke="#C68B6C" strokeWidth="4" strokeLinecap="round"><path d="M-3 28 Q-14 23 -18 14"/><path d="M5 28 Q15 34 17 43"/></g>
          <path d="M-8 23 Q0 19 8 23 L10 39 Q1 44 -9 39Z" fill="#82A98D"/>
          <circle cx="0" cy="11" r="11" fill="#C68B6C"/><path d="M-11 11 Q-12 -1 0 -2 Q12 -1 11 13 L7 7 Q0 3 -7 9Z" fill="#25241E"/><path d="M-9 4q8-10 17 0" fill="none" stroke="#F2C76D" strokeWidth="3" strokeLinecap="round"/><path d="M-4 12h1M4 12h1" stroke="#382820" strokeWidth="2.5" strokeLinecap="round"/><path d="M-2 17q2 2 4 0" fill="none" stroke="#8F594A" strokeWidth="1.5" strokeLinecap="round"/>
          <g className="woman-run-legs" fill="none" stroke="#E6DFCE" strokeWidth="4" strokeLinecap="round"><path className="woman-leg-a" d="M-4 39 Q-13 46 -18 52"/><path className="woman-leg-b" d="M5 39 Q12 48 17 56"/></g>
          <path d="M-18 53h-5M16 57h5" stroke="#C68B6C" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M-8 28h16" stroke="#B9D6A8" strokeWidth="2.5" strokeLinecap="round"/>
        </g>
      </g>

      <circle className="dashboard-firefly dashboard-firefly-one" cx="775" cy="245" r="3" fill="#F2CC70"/><circle className="dashboard-firefly dashboard-firefly-two" cx="1080" cy="300" r="2.5" fill="#A7E4B8"/><circle className="dashboard-firefly dashboard-firefly-three" cx="710" cy="315" r="2" fill="#F2CC70"/>
    </svg>
    <svg className="dashboard-truck absolute" viewBox="0 0 120 58">
      <g>
        <rect x="8" y="13" width="55" height="28" rx="4" fill="#D6A14B"/><path d="M14 19h43M14 26h43M14 33h43" stroke="#F5D991" strokeWidth="2" strokeOpacity=".78"/>
        <path d="M63 24h23l15 12v5H63z" fill="#E8B65D"/><path d="M78 27h7l10 9H78z" fill="#C6E4D8"/>
        <rect x="67" y="38" width="34" height="4" rx="2" fill="#F3D486"/><circle cx="30" cy="44" r="8" fill="#10271E"/><circle cx="30" cy="44" r="3.5" fill="#DDE3D8"/><circle cx="83" cy="44" r="8" fill="#10271E"/><circle cx="83" cy="44" r="3.5" fill="#DDE3D8"/>
        <path d="M5 43h103" stroke="#F7E7B5" strokeOpacity=".38" strokeWidth="2"/>
      </g>
    </svg>
  </div>
}
