import { useState } from 'react';
import { Icon, type IconName } from './icons';
import { Button } from './kit';

const SLIDES: { icon: IconName; title: string; lines: string[] }[] = [
  {
    icon: 'coach',
    title: 'வணக்கம்! நான் உங்கள் குரூப் 4 வழிகாட்டி',
    lines: [
      'தினமும் நீங்கள் செய்ய வேண்டியது ஒன்றே: "இன்று" தாவலில் உள்ள பெரிய "தொடங்கு" பொத்தானை அழுத்துவது.',
      'எதைப் படிப்பது, எத்தனை நிமிடம், எந்த வரிசை என்பதை நான் முடிவு செய்வேன். பாடத்திட்டத்தின் எல்லாத் தலைப்புகளும் 9 வாரங்களில் வரும்.',
      'திட்டம்: வார நாள் 1 மணி நேரம், சனி-ஞாயிறு 2 மணி நேரம். இது குறைந்தபட்சம் மட்டுமே.',
      'நேரம் இருந்தால் "+15 / +30 / +60 நிமி" தொட்டு எவ்வளவு வேண்டுமானாலும் தொடரலாம்; அடுத்த பாடங்கள் முன்கூட்டியே வரும்.',
    ],
  },
  {
    icon: 'map',
    title: 'ஒரு நாள் அமர்வு',
    lines: [
      'சூடேற்றல் (5 நிமி) → திருக்குறள் (புதிய குறள் + மீள்பார்வை வினா) → பாடம் → பயிற்சி → வேகச் சுற்று → நிறைவு.',
      'ஒவ்வொரு படிக்கும் முன் "இது என்ன, எப்படிச் செய்வது" என்று ஒரு சிறு அட்டை வரும். அதைப் படித்து "தொடங்கு".',
      'பாதியில் நிறுத்தினாலும் பரவாயில்லை; மீண்டும் திறந்தால் விட்ட இடத்திலிருந்து தொடரும்.',
    ],
  },
  {
    icon: 'bulb',
    title: 'வினாக்களில் உதவி',
    lines: [
      '"குறிப்பு வேண்டுமா?" தொட்டால், இந்த வகை வினாவை எப்படி அணுகுவது என்று சொல்லும் (விடையைச் சொல்லாது).',
      '"சரிபார்" அழுத்தியதும்: சரியான விடை, ஏன் சரி, ஒவ்வொரு தவறான விடையும் ஏன் தவறு, விதி, இன்னொரு எடுத்துக்காட்டு.',
      'வினாக்கள் தமிழில் வரும். ஆங்கிலமும் பார்க்க "English-உம் காட்டு" தொடுங்கள்.',
    ],
  },
  {
    icon: 'sheet',
    title: 'குறிப்பு அட்டைகள்',
    lines: [
      'ஒவ்வொரு தமிழ்த் தலைப்புக்கும் (வேற்றுமை, தொகை, சந்திப்பிழை, மரபு, கலைச்சொல், திருக்குறள்…) ஒரு பக்கக் குறிப்பு அட்டை உண்டு.',
      '"கற்க → குறிப்புகள்" பகுதியில் எப்போதும் இருக்கும். தேர்வுக்கு முந்தைய வாரம் இவற்றை மட்டும் மீண்டும் படித்தால் போதும்.',
    ],
  },
  {
    icon: 'chart',
    title: 'மற்ற தாவல்கள்',
    lines: [
      'கற்க: 9 வாரப் பாதை, குறிப்பு அட்டைகள், நினைவு அட்டைகள், 20 அதிகாரத் திருக்குறள்.',
      'பயிற்சி: கூடுதல் நேரம் இருந்தால் மட்டும். பழைய வினாத்தாள்கள், தலைப்பு வாரியாக, மாதிரித் தேர்வுகள்.',
      'முன்னேற்றம்: இன்று தேர்வு எழுதினால் எத்தனை மதிப்பெண் என்ற கணிப்பு, நினைவூட்டல் நேரம், மொழி.',
      'தினமும் இரவு 8:15-க்கு நினைவூட்டல் வரும். ஒரு நாள் தவறினாலும் அடுத்த நாள் தொடருங்கள்.',
    ],
  },
];

/** First-run walkthrough (also reachable from "எப்படிப் பயன்படுத்துவது?" on the Today screen). */
export function Guide({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-teal-700 to-teal-950 text-white" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-end p-3">
        <button type="button" onClick={onDone} className="rounded-full px-3 py-1.5 text-sm text-teal-100 active:bg-white/10">தவிர்</button>
      </div>
      <div key={i} className="slide-up mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6">
        <div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-white/15"><Icon name={s.icon} size={44} /></div>
        <h2 className="mb-4 text-2xl font-bold leading-snug">{s.title}</h2>
        <div className="space-y-3">
          {s.lines.map((l, j) => <p key={j} className="leading-relaxed text-teal-50">{l}</p>)}
        </div>
      </div>
      <div className="mx-auto w-full max-w-md space-y-4 px-6 pb-6">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, j) => <span key={j} className={`h-2 rounded-full transition-all ${j === i ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />)}
        </div>
        <Button variant="light" onClick={() => (last ? onDone() : setI(i + 1))} className="w-full text-lg">
          {last ? 'சரி, தொடங்கலாம்' : 'அடுத்து'} <Icon name="right" />
        </Button>
      </div>
    </div>
  );
}
