import { useRef, useState } from 'react';
import type { SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import { decodeBackup, encodeBackup, MAX_BACKUP_BYTES } from '../platform/saveBackup';
import { useGame } from '../stores/gameStore';
import { GameDialog } from './GameDialog';

export function SaveTools({ save }: { save: SaveData }) {
  const restore = useGame(state => state.restore);
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<SaveData | null>(null);
  const [message, setMessage] = useState('进度自动保存在当前浏览器；换设备或网址前可备份。');
  const [reading, setReading] = useState(false);
  function download() {
    const url = URL.createObjectURL(new Blob([encodeBackup(save)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href=url; link.download=`odyssey-save-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('已生成存档文件，请妥善保存。');
  }
  async function read(file?: File) {
    if (!file) return;
    setReading(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) { setMessage('文件过大，请选择 Odyssey 导出的存档。'); return; }
      const next = decodeBackup(await file.text());
      if (!next) { setMessage('无法识别这个存档，当前进度没有改变。'); return; }
      setPending(next);
    } catch { setMessage('读取失败，请重新选择存档文件。'); }
    finally { setReading(false); if (input.current) input.current.value=''; }
  }
  return <section className="save-tools" aria-label="存档管理">
    <h3>旅程存档</h3><p role="status">{message}</p>
    <div className="row"><button className="btn" type="button" onClick={download}>备份存档</button>
      <button className="btn" type="button" disabled={reading} onClick={() => input.current?.click()}>{reading ? '读取中…' : '导入存档'}</button></div>
    <input ref={input} type="file" accept=".json,application/json" aria-label="选择存档文件" hidden onChange={event => void read(event.target.files?.[0])} />
    {pending ? <GameDialog title="恢复这段旅程？" onClose={() => setPending(null)}>
      <p>存档中已认识 {Object.values(pending.words).filter(word => isLearnedState(word.state)).length} 个字，收集 {pending.evidence.length} 条线索。{pending.beats['dba.beat.depart'] ? '首岛已经完成。' : ''}</p>
      <p>恢复会替换当前进度，建议先备份。</p><div className="row">
        <button className="btn" type="button" onClick={() => setPending(null)}>取消</button>
        <button className="btn primary" type="button" onClick={() => {
          if (restore(pending)) { setPending(null); setMessage('存档已恢复，可继续旅程。'); }
          else { setPending(null); setMessage('浏览器无法保存，请允许本地存储后重试；当前进度没有改变。'); }
        }}>确认恢复</button>
      </div>
    </GameDialog> : null}
  </section>;
}
