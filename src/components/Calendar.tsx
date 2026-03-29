import { useState } from 'react';
import './Calendar.css';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

interface Props { selected: string; onSelect: (d: string) => void; min?: string; }

export default function Calendar({ selected, onSelect, min }: Props) {
  const today = toYMD(new Date());
  const init  = selected || today;
  const [yr, setYr] = useState(() => +init.slice(0,4));
  const [mo, setMo] = useState(() => +init.slice(5,7) - 1);

  const prev = () => { if (mo===0){setMo(11);setYr(y=>y-1);}else setMo(m=>m-1); };
  const next = () => { if (mo===11){setMo(0);setYr(y=>y+1);}else setMo(m=>m+1); };

  const first   = new Date(yr, mo, 1);
  const offset  = (first.getDay()+6)%7;
  const days    = new Date(yr, mo+1, 0).getDate();
  const cells: Array<number|null> = [...Array(offset).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  while (cells.length%7!==0) cells.push(null);

  return (
    <div className="cal">
      <div className="cal-nav">
        <button onClick={prev} className="cal-arr">‹</button>
        <span>{MONTHS[mo]} {yr}</span>
        <button onClick={next} className="cal-arr">›</button>
      </div>
      <div className="cal-grid">
        {DAYS.map(d=><div key={d} className="cal-label">{d}</div>)}
        {cells.map((n,i)=>{
          if (!n) return <div key={`e${i}`}/>;
          const ymd  = `${yr}-${String(mo+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
          const past = (min??today) > ymd;
          const isTd = ymd===today;
          const isSel= ymd===selected;
          return (
            <button
              key={ymd}
              disabled={past}
              onClick={()=>!past&&onSelect(ymd)}
              className={['cal-day', past?'past':'', isTd?'today':'', isSel?'sel':''].join(' ')}
            >{n}</button>
          );
        })}
      </div>
    </div>
  );
}
