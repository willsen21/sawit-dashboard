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
        <g className="woman-chasing">
          <g className="woman-run-arms" fill="none" stroke="#F1B48F" strokeWidth="5" strokeLinecap="round"><path d="M-2 27 Q-17 34 -20 45"/><path d="M4 27 Q17 17 21 7"/></g>
          <path d="M-4 23 Q0 19 5 23 L10 43 Q2 49 -7 43Z" fill="#E8A37E"/>
          <circle cx="1" cy="10" r="8" fill="#D99B78"/><path d="M-7 10 Q-8 -1 1 0 Q10 0 10 11 L7 7 Q1 3 -5 8Z" fill="#342820"/>
          <g className="woman-run-legs" fill="none" stroke="#D7D8C6" strokeWidth="5" strokeLinecap="round"><path className="woman-leg-a" d="M-3 43 Q-12 53 -18 60"/><path className="woman-leg-b" d="M5 43 Q14 52 19 58"/></g>
          <path d="M-17 61h-6M18 59h7" stroke="#B9C58E" strokeWidth="4" strokeLinecap="round"/>
        </g>
        <g className="woman-tired">
          <circle cx="1" cy="10" r="8" fill="#D99B78"/><path d="M-7 10 Q-8 -1 1 0 Q10 0 10 11 L7 7 Q1 3 -5 8Z" fill="#342820"/>
          <path d="M-4 23 Q0 21 5 24 L10 40 Q3 44 -5 39Z" fill="#E8A37E"/>
          <path d="M-4 27 Q-10 35 -11 44M6 29 Q12 36 15 44" fill="none" stroke="#D99B78" strokeWidth="4" strokeLinecap="round"/>
          <path d="M-5 40 Q-12 48 -17 55M7 40 Q13 48 20 53" fill="none" stroke="#D7D8C6" strokeWidth="5" strokeLinecap="round"/>
        </g>
        <g className="woman-resting">
          <path d="M-14 63h46" stroke="#B88E5B" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="1" cy="10" r="8" fill="#D99B78"/><path d="M-7 10 Q-8 -1 1 0 Q10 0 10 11 L7 7 Q1 3 -5 8Z" fill="#342820"/>
          <path d="M-4 23 Q1 20 6 24 L12 40 Q5 47 -4 43 L-10 34Z" fill="#E8A37E"/>
          <path d="M-4 27 Q-13 33 -10 40M6 28 Q13 33 15 39" fill="none" stroke="#D99B78" strokeWidth="4" strokeLinecap="round"/>
          <path d="M-2 43 Q-8 50 -2 53 L12 53 Q18 53 16 49 L7 42Z" fill="#D7D8C6"/>
          <path d="M4 51 Q13 55 19 53" fill="none" stroke="#D7D8C6" strokeWidth="5" strokeLinecap="round"/>
        </g>
      </g>

      <g className="dashboard-woman dashboard-woman-two" transform="translate(704 337)">
        <g className="woman-chasing">
          <g className="woman-run-arms" fill="none" stroke="#B98160" strokeWidth="5" strokeLinecap="round"><path d="M-3 27 Q-16 18 -21 8"/><path d="M5 27 Q18 34 20 44"/></g>
          <path d="M-5 23 Q0 19 5 23 L11 43 Q2 48 -7 43Z" fill="#83A78A"/>
          <circle cx="1" cy="10" r="8" fill="#C68B6C"/><path d="M-7 10 Q-7 0 2 0 Q11 0 9 12 Q7 5 2 6 L-5 12Z" fill="#25241E"/>
          <g className="woman-run-legs" fill="none" stroke="#E4D8BD" strokeWidth="5" strokeLinecap="round"><path className="woman-leg-a" d="M-3 43 Q-13 50 -20 56"/><path className="woman-leg-b" d="M5 43 Q11 52 17 62"/></g>
          <path d="M-20 57h-6M16 63h7" stroke="#C9A86B" strokeWidth="4" strokeLinecap="round"/>
        </g>
        <g className="woman-tired">
          <circle cx="1" cy="10" r="8" fill="#C68B6C"/><path d="M-7 10 Q-7 0 2 0 Q11 0 9 12 Q7 5 2 6 L-5 12Z" fill="#25241E"/>
          <path d="M-5 23 Q0 20 5 24 L10 40 Q3 44 -6 39Z" fill="#83A78A"/>
          <path d="M-5 28 Q-12 35 -12 44M6 29 Q13 36 15 44" fill="none" stroke="#C68B6C" strokeWidth="4" strokeLinecap="round"/>
          <path d="M-5 40 Q-12 48 -18 53M7 40 Q14 48 20 56" fill="none" stroke="#E4D8BD" strokeWidth="5" strokeLinecap="round"/>
        </g>
        <g className="woman-resting">
          <path d="M-14 63h46" stroke="#B88E5B" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="1" cy="10" r="8" fill="#C68B6C"/><path d="M-7 10 Q-7 0 2 0 Q11 0 9 12 Q7 5 2 6 L-5 12Z" fill="#25241E"/>
          <path d="M-5 23 Q0 19 5 23 L12 40 Q4 47 -5 43 L-11 34Z" fill="#83A78A"/>
          <path d="M-5 27 Q-13 32 -10 40M6 28 Q13 32 15 39" fill="none" stroke="#C68B6C" strokeWidth="4" strokeLinecap="round"/>
          <path d="M-2 43 Q-8 50 -2 53 L12 53 Q18 53 16 49 L7 42Z" fill="#E4D8BD"/>
          <path d="M4 51 Q13 55 19 53" fill="none" stroke="#E4D8BD" strokeWidth="5" strokeLinecap="round"/>
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
