import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { tweetId } from '../../lib/early';

let loader = null;
const loadWidgets = () => {
  if (window.twttr?.widgets) return Promise.resolve(window.twttr);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://platform.twitter.com/widgets.js';
      s.async = true;
      s.onload = () => resolve(window.twttr);
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }
  return loader;
};

const TweetEmbed = ({ url, testId }) => {
  const ref = useRef(null);
  const [state, setState] = useState('loading');
  const id = tweetId(url);

  useEffect(() => {
    if (!id || !ref.current) return undefined;
    let alive = true;
    ref.current.innerHTML = '';
    loadWidgets()
      .then((t) => t.widgets.createTweet(id, ref.current, { theme: 'light', dnt: true, conversation: 'none' }))
      .then((el) => {
        if (!alive) return el?.remove();
        setState(el ? 'ok' : 'fail');
      })
      .catch(() => alive && setState('fail'));
    return () => { alive = false; };
  }, [id]);

  if (!id) return null;
  return (
    <div className="border-2 border-[var(--ink)] bg-white p-2 shadow-[6px_6px_0_rgba(28,28,34,0.25)]" data-testid={testId}>
      <div ref={ref} className="[&>*]:!m-0" />
      {state === 'loading' && <div className="font-mono p-6 text-center text-[11px] tracking-widest text-[var(--ink-soft)]">LOADING POST…</div>}
      {state === 'fail' && (
        <a href={url} target="_blank" rel="noreferrer" className="font-mono flex items-center justify-center gap-2 p-6 text-[11px] tracking-widest underline">
          OPEN POST ON X <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
};

export default TweetEmbed;
