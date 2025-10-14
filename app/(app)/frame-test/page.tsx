'use client';
import { useEffect, useRef, useState } from 'react';

export default function FrameTest() {
  const [jobId, setJobId] = useState<string>('');
  const [status, setStatus] = useState<any>(null);
  const timer = useRef<any>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/jobs', { method: 'POST', body: fd });
    const data = await res.json();
    setJobId(data.jobId);
    setStatus({ state: 'queued' });
  }

  useEffect(() => {
    if (!jobId) return;
    timer.current = setInterval(async () => {
      const r = await fetch(`/api/jobs/${jobId}`);
      const d = await r.json();
      setStatus(d);
      if (d.state === 'completed' || d.state === 'failed') {
        clearInterval(timer.current);
      }
    }, 1500);
    return () => clearInterval(timer.current);
  }, [jobId]);

  return (
    <div className="p-6 space-y-4">
      <form onSubmit={onSubmit} className="space-x-3">
        <input type="file" name="file" accept="video/*" required />
        <button className="px-3 py-2 border rounded" type="submit">Upload & Process</button>
      </form>

      {jobId && <p>Job: {jobId}</p>}
      {status && <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(status, null, 2)}</pre>}

      {status?.result?.url && (
        <div>
          <p className="font-medium">Best frame:</p>
          <img src={status.result.url} alt="best frame" className="max-w-md border rounded" />
        </div>
      )}
    </div>
  );
}
